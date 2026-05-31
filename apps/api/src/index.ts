import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import pino from 'pino';

import { getDatabase } from './db/connection';
import { initializeAutonomousEngine } from './services/AutonomousEngine';
import { setupRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

dotenv.config();

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

const app: Express = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger(logger));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database
async function initDatabase() {
  try {
    const db = await getDatabase();
    logger.info('Database connected successfully');
    return db;
  } catch (error) {
    logger.error({ error }, 'Failed to connect to database');
    process.exit(1);
  }
}

// Setup WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const connectedClients = new Map<string, WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  logger.info('New WebSocket connection');

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'SUBSCRIBE' && data.userId) {
        connectedClients.set(data.userId, ws);
        logger.debug({ userId: data.userId }, 'Client subscribed');
      }
    } catch (error) {
      logger.error({ error }, 'Failed to parse WebSocket message');
    }
  });

  ws.on('close', () => {
    // Remove disconnected client
    for (const [userId, client] of connectedClients.entries()) {
      if (client === ws) {
        connectedClients.delete(userId);
        logger.debug({ userId }, 'Client disconnected');
      }
    }
  });

  ws.on('error', (error) => {
    logger.error({ error }, 'WebSocket error');
  });
});

// Broadcast to all connected clients
global.broadcastToClients = (data: object) => {
  const message = JSON.stringify(data);
  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

// Initialize and start server
async function start() {
  try {
    const db = await initDatabase();
    logger.info(`Starting Smart Factory API in ${NODE_ENV} mode`);

    // Setup routes
    await setupRoutes(app, db);

    // Initialize autonomous engine
    await initializeAutonomousEngine(db, logger);

    // Error handling
    app.use(errorHandler(logger));

    server.listen(PORT, () => {
      logger.info(`🚀 API Server running at http://localhost:${PORT}`);
      logger.info(`📡 WebSocket available at ws://localhost:${PORT}/ws`);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
