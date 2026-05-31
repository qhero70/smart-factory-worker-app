import * as Sentry from '@sentry/node';
import rateLimit from 'express-rate-limit';
import { LineNotificationService } from './LineNotificationService';
import logger from '../utils/logger';

class MonitoringService {
  private lineService: LineNotificationService;

  constructor(lineService: LineNotificationService) {
    this.lineService = lineService;

    // 初始化 Sentry
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: 0.1,
      });
    }
  }

  /**
   * 一般 API 限流器（每分鐘 60 次）
   */
  getGeneralLimiter() {
    return rateLimit({
      windowMs: 60 * 1000, // 1 分鐘
      max: 60, // 60 次請求
      message: '請求過於頻繁，請稍後再試',
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  /**
   * 登入 API 限流器（每分鐘 5 次）
   */
  getLoginLimiter() {
    return rateLimit({
      windowMs: 60 * 1000, // 1 分鐘
      max: 5, // 5 次請求
      message: '登入嘗試過於頻繁，請稍後再試',
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // 跳過成功的登入請求
        return req.method !== 'POST' || !req.path.includes('/login');
      },
    });
  }

  /**
   * AI API 限流器（每分鐘 10 次）
   */
  getAILimiter() {
    return rateLimit({
      windowMs: 60 * 1000, // 1 分鐘
      max: 10, // 10 次請求
      message: 'AI 服務請求過於頻繁，請稍後再試',
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  /**
   * 捕捉前端錯誤
   */
  captureClientError(error: any, context?: Record<string, any>) {
    try {
      Sentry.captureException(error, {
        contexts: {
          client: context,
        },
      });

      logger.error('前端錯誤已記錄:', error, context);

      // 發送通知給開發者
      this.notifyDevelopers('前端錯誤', error.message, 'error');
    } catch (err) {
      logger.error('捕捉前端錯誤失敗:', err);
    }
  }

  /**
   * 捕捉後端錯誤
   */
  captureServerError(error: any, context?: Record<string, any>) {
    try {
      Sentry.captureException(error, {
        contexts: {
          server: context,
        },
      });

      logger.error('後端錯誤已記錄:', error, context);

      // 發送通知給開發者
      this.notifyDevelopers('後端錯誤', error.message, 'critical');
    } catch (err) {
      logger.error('捕捉後端錯誤失敗:', err);
    }
  }

  /**
   * 發送通知給開發者
   */
  private async notifyDevelopers(title: string, message: string, severity: 'error' | 'warning' | 'critical') {
    try {
      const developerLineUserId = process.env.LINE_DEVELOPER_USER_ID;
      if (!developerLineUserId) return;

      const severityEmoji = {
        error: '⚠️',
        warning: '⚡',
        critical: '🚨',
      };

      const flexMessage = {
        type: 'flex',
        altText: `${severityEmoji[severity]} ${title}`,
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: `${severityEmoji[severity]} ${title}`,
                weight: 'bold',
                size: 'xl',
                color: severity === 'critical' ? '#FF6B6B' : severity === 'warning' ? '#FFA500' : '#FF9500',
              },
            ],
          },
          body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            contents: [
              {
                type: 'text',
                text: message,
                wrap: true,
                size: 'sm',
                color: '#666666',
              },
              {
                type: 'box',
                layout: 'baseline',
                margin: 'md',
                contents: [
                  {
                    type: 'text',
                    text: '時間:',
                    color: '#aaaaaa',
                    size: 'xs',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: new Date().toLocaleString('zh-TW'),
                    wrap: true,
                    color: '#999999',
                    size: 'xs',
                    flex: 5,
                  },
                ],
              },
            ],
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'primary',
                height: 'sm',
                action: {
                  type: 'uri',
                  label: '查看 Sentry',
                  uri: 'https://sentry.io/organizations/smartfactory/issues/',
                },
              },
            ],
          },
        },
      };

      await this.lineService.sendFlexMessage(developerLineUserId, flexMessage);
    } catch (error) {
      logger.error('發送開發者通知失敗:', error);
    }
  }

  /**
   * 記錄 API 請求
   */
  logAPIRequest(method: string, path: string, statusCode: number, duration: number) {
    logger.info(`API 請求: ${method} ${path} - ${statusCode} (${duration}ms)`);

    // 記錄慢查詢
    if (duration > 1000) {
      logger.warn(`慢 API 請求: ${method} ${path} - ${duration}ms`);
    }
  }

  /**
   * 獲取錯誤統計
   */
  async getErrorStats() {
    try {
      // 從 Sentry 獲取錯誤統計
      // 這裡需要使用 Sentry API，暫時返回模擬數據
      return {
        totalErrors: 0,
        criticalErrors: 0,
        warningErrors: 0,
        recentErrors: [],
      };
    } catch (error) {
      logger.error('獲取錯誤統計失敗:', error);
      return {
        totalErrors: 0,
        criticalErrors: 0,
        warningErrors: 0,
        recentErrors: [],
      };
    }
  }

  /**
   * 初始化錯誤中間件
   */
  getErrorMiddleware() {
    return (err: any, req: any, res: any, next: any) => {
      // 捕捉錯誤
      this.captureServerError(err, {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });

      // 返回錯誤響應
      res.status(err.status || 500).json({
        error: {
          message: err.message || '內部伺服器錯誤',
          status: err.status || 500,
        },
      });
    };
  }
}

export default MonitoringService;
