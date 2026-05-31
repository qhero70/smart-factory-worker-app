import * as cron from 'node-cron';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { google } from 'googleapis';
import { LineNotificationService } from './LineNotificationService.js';
import logger from '../utils/logger.js';

const execAsync = promisify(exec);

interface BackupRecord {
  timestamp: Date;
  filename: string;
  size: number;
  status: 'success' | 'failed';
  error?: string;
}

class BackupService {
  private lineService: LineNotificationService;
  private backupRecords: BackupRecord[] = [];
  private googleDrive: any;

  constructor(lineService: LineNotificationService) {
    this.lineService = lineService;
    this.initializeGoogleDrive();
  }

  /**
   * 初始化 Google Drive 連接
   */
  private initializeGoogleDrive() {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });

      this.googleDrive = google.drive({ version: 'v3', auth });
      logger.info('Google Drive 已初始化');
    } catch (error) {
      logger.error('初始化 Google Drive 失敗:', error);
    }
  }

  /**
   * 執行資料庫備份
   */
  async backupDatabase(): Promise<BackupRecord> {
    const timestamp = new Date();
    const filename = `backup-${timestamp.toISOString().split('T')[0]}-${Date.now()}.sql`;
    const backupPath = path.join('/tmp', filename);

    try {
      logger.info(`開始備份資料庫: ${filename}`);

      // 執行 MySQL 備份命令
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL 未設定');
      }

      // 解析資料庫連接字符串
      const urlObj = new URL(databaseUrl);
      const host = urlObj.hostname;
      const user = urlObj.username;
      const password = urlObj.password;
      const database = urlObj.pathname.substring(1);

      // 執行備份
      const command = `mysqldump -h ${host} -u ${user} -p${password} ${database} > ${backupPath}`;
      await execAsync(command);

      // 獲取備份文件大小
      const stats = fs.statSync(backupPath);
      const size = stats.size;

      logger.info(`資料庫備份完成: ${filename} (${(size / 1024 / 1024).toFixed(2)} MB)`);

      // 上傳到 Google Drive
      await this.uploadToGoogleDrive(backupPath, filename);

      // 清理本地備份
      fs.unlinkSync(backupPath);

      const record: BackupRecord = {
        timestamp,
        filename,
        size,
        status: 'success',
      };

      this.backupRecords.push(record);

      // 發送成功通知
      await this.sendBackupNotification(true, filename, size);

      return record;
    } catch (error) {
      logger.error('資料庫備份失敗:', error);

      const record: BackupRecord = {
        timestamp,
        filename,
        size: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : '未知錯誤',
      };

      this.backupRecords.push(record);

      // 發送失敗通知
      await this.sendBackupNotification(false, filename, 0, error);

      return record;
    }
  }

  /**
   * 上傳備份到 Google Drive
   */
  private async uploadToGoogleDrive(filePath: string, filename: string) {
    try {
      if (!this.googleDrive) {
        logger.warn('Google Drive 未初始化，跳過上傳');
        return;
      }

      const fileMetadata = {
        name: filename,
        parents: [process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID || 'root'],
      };

      const media = {
        mimeType: 'application/sql',
        body: fs.createReadStream(filePath),
      };

      const response = await this.googleDrive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id',
      });

      logger.info(`備份已上傳到 Google Drive: ${response.data.id}`);

      // 清理舊備份（保留最近 30 天）
      await this.cleanupOldBackups();
    } catch (error) {
      logger.error('上傳到 Google Drive 失敗:', error);
    }
  }

  /**
   * 清理舊備份
   */
  private async cleanupOldBackups() {
    try {
      if (!this.googleDrive) return;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const query = `
        parents='${process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID || 'root'}' 
        and createdTime < '${thirtyDaysAgo.toISOString()}'
        and name contains 'backup-'
      `;

      const response = await this.googleDrive.files.list({
        q: query,
        fields: 'files(id, name, createdTime)',
      });

      if (response.data.files && response.data.files.length > 0) {
        for (const file of response.data.files) {
          await this.googleDrive.files.delete({ fileId: file.id });
          logger.info(`已刪除舊備份: ${file.name}`);
        }
      }
    } catch (error) {
      logger.error('清理舊備份失敗:', error);
    }
  }

  /**
   * 發送備份通知
   */
  private async sendBackupNotification(
    success: boolean,
    filename: string,
    size: number,
    error?: any
  ) {
    try {
      const adminLineUserId = process.env.LINE_ADMIN_USER_ID;
      if (!adminLineUserId) return;

      const flexMessage = {
        type: 'flex',
        altText: `${success ? '✅' : '❌'} 備份${success ? '成功' : '失敗'}`,
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: `${success ? '✅' : '❌'} 資料備份${success ? '成功' : '失敗'}`,
                weight: 'bold',
                size: 'xl',
                color: success ? '#51CF66' : '#FF6B6B',
              },
            ],
          },
          body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            contents: [
              {
                type: 'box',
                layout: 'baseline',
                margin: 'md',
                contents: [
                  {
                    type: 'text',
                    text: '檔案:',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: filename,
                    wrap: true,
                    color: '#666666',
                    size: 'sm',
                    flex: 5,
                  },
                ],
              },
              ...(success
                ? [
                    {
                      type: 'box',
                      layout: 'baseline',
                      margin: 'md',
                      contents: [
                        {
                          type: 'text',
                          text: '大小:',
                          color: '#aaaaaa',
                          size: 'sm',
                          flex: 1,
                        },
                        {
                          type: 'text',
                          text: `${(size / 1024 / 1024).toFixed(2)} MB`,
                          wrap: true,
                          color: '#666666',
                          size: 'sm',
                          flex: 5,
                        },
                      ],
                    },
                  ]
                : [
                    {
                      type: 'box',
                      layout: 'baseline',
                      margin: 'md',
                      contents: [
                        {
                          type: 'text',
                          text: '錯誤:',
                          color: '#aaaaaa',
                          size: 'sm',
                          flex: 1,
                        },
                        {
                          type: 'text',
                          text: error instanceof Error ? error.message : '未知錯誤',
                          wrap: true,
                          color: '#FF6B6B',
                          size: 'sm',
                          flex: 5,
                        },
                      ],
                    },
                  ]),
              {
                type: 'box',
                layout: 'baseline',
                margin: 'md',
                contents: [
                  {
                    type: 'text',
                    text: '時間:',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: new Date().toLocaleString('zh-TW'),
                    wrap: true,
                    color: '#666666',
                    size: 'sm',
                    flex: 5,
                  },
                ],
              },
            ],
          },
        },
      };

      await this.lineService.sendFlexMessage(adminLineUserId, flexMessage);
    } catch (error) {
      logger.error('發送備份通知失敗:', error);
    }
  }

  /**
   * 啟動定時備份
   */
  startScheduledBackup() {
    // 每天凌晨 02:00 執行備份
    cron.schedule('0 2 * * *', async () => {
      logger.info('開始執行定時備份...');
      await this.backupDatabase();
    });

    logger.info('定時備份已啟動 (每天凌晨 02:00)');
  }

  /**
   * 獲取備份歷史
   */
  getBackupHistory(limit: number = 10): BackupRecord[] {
    return this.backupRecords.slice(-limit).reverse();
  }
}

export default BackupService;
