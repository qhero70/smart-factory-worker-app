import { Express } from 'express';
import { Database } from '../db/connection';
import { setupAuthRoutes } from './auth';
import { setupWorkOrderRoutes } from './workorders';
import { setupMachineRoutes } from './machines';
import { setupAnomalyRoutes } from './anomalies';
import { setupLineWebhookRoute } from './line';
import { setupAIRoute } from './ai';

export async function setupRoutes(app: Express, db: Database) {
  app.use('/api/auth', setupAuthRoutes(db));
  app.use('/api/workorders', setupWorkOrderRoutes(db));
  app.use('/api/machines', setupMachineRoutes(db));
  app.use('/api/anomalies', setupAnomalyRoutes(db));
  app.use('/api/line/webhook', setupLineWebhookRoute(db));
  app.use('/api/ai', setupAIRoute(db));
}
