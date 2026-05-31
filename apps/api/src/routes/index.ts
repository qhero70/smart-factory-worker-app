import { Express } from 'express';
import { Database } from '../db/connection';
import { setupAuthRoutes } from './auth';
import { setupWorkOrderRoutes } from './workorders';
import { setupMachineRoutes } from './machines';
import { setupAnomalyRoutes } from './anomalies';
import { setupLineWebhookRoute } from './line';
import { setupAIRoute } from './ai';
import syncRouter from './sync';
import reportsRouter from './reports';
import schedulingRouter from './scheduling';
import oeeRouter from './oee';
import lineRouter from './line';

export async function setupRoutes(app: Express, db: Database) {
  // 原有路由
  app.use('/api/auth', setupAuthRoutes(db));
  app.use('/api/workorders', setupWorkOrderRoutes(db));
  app.use('/api/machines', setupMachineRoutes(db));
  app.use('/api/anomalies', setupAnomalyRoutes(db));
  app.use('/api/line/webhook', setupLineWebhookRoute(db));
  app.use('/api/ai', setupAIRoute(db));

  // 新增路由
  app.use('/api/sync', syncRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/scheduling', schedulingRouter);
  app.use('/api/oee', oeeRouter);
  app.use('/api/line', lineRouter);
}
