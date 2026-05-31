import { Request, Response, NextFunction } from 'express';
import { Logger } from 'pino';

export function requestLogger(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const { method, path, query, body } = req;

    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(
        {
          method,
          path,
          query,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
        },
        `${method} ${path}`
      );
    });

    next();
  };
}
