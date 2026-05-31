import { Request, Response, NextFunction } from 'express';
import { Logger } from 'pino';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(logger: Logger) {
  return (err: Error | AppError, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ error: err }, 'Error occurred');

    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        error: err.message,
        statusCode: err.statusCode,
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      statusCode: 500,
    });
  };
}
