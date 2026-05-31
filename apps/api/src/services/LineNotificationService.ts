import { Client } from '@line/bot-sdk';
import logger from '../utils/logger.js';

/**
 * LINE 通知服務
 * 負責發送 LINE Flex Message 和文字訊息
 */
export class LineNotificationService {
  private lineClient: Client;

  constructor() {
    this.lineClient = new Client({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
      channelSecret: process.env.LINE_CHANNEL_SECRET || '',
    });
  }

  /**
   * 發送文字訊息到群組
   */
  async sendTextToGroup(groupId: string, text: string): Promise<void> {
    try {
      await this.lineClient.pushMessage(groupId, {
        type: 'text',
        text,
      });
      logger.info(`[LINE] 文字訊息已發送到群組 ${groupId}`);
    } catch (error) {
      logger.error(`[LINE] 發送文字訊息失敗: ${error}`);
      throw error;
    }
  }

  /**
   * 發送 Flex Message 到群組
   */
  async sendFlexToGroup(groupId: string, flexMessage: any): Promise<void> {
    try {
      await this.lineClient.pushMessage(groupId, {
        type: 'flex',
        altText: flexMessage.altText || 'Flex Message',
        contents: flexMessage.contents,
      });
      logger.info(`[LINE] Flex Message 已發送到群組 ${groupId}`);
    } catch (error) {
      logger.error(`[LINE] 發送 Flex Message 失敗: ${error}`);
      throw error;
    }
  }

  /**
   * 發送文字訊息到個人
   */
  async sendTextToUser(userId: string, text: string): Promise<void> {
    try {
      await this.lineClient.pushMessage(userId, {
        type: 'text',
        text,
      });
      logger.info(`[LINE] 文字訊息已發送到使用者 ${userId}`);
    } catch (error) {
      logger.error(`[LINE] 發送文字訊息失敗: ${error}`);
      throw error;
    }
  }

  /**
   * 發送 Flex Message 到個人
   */
  async sendFlexToUser(userId: string, flexMessage: any): Promise<void> {
    try {
      await this.lineClient.pushMessage(userId, {
        type: 'flex',
        altText: flexMessage.altText || 'Flex Message',
        contents: flexMessage.contents,
      });
      logger.info(`[LINE] Flex Message 已發送到使用者 ${userId}`);
    } catch (error) {
      logger.error(`[LINE] 發送 Flex Message 失敗: ${error}`);
      throw error;
    }
  }

  /**
   * 發送廣播訊息
   */
  async broadcastText(text: string): Promise<void> {
    try {
      await this.lineClient.broadcast({
        type: 'text',
        text,
      });
      logger.info(`[LINE] 廣播訊息已發送`);
    } catch (error) {
      logger.error(`[LINE] 發送廣播訊息失敗: ${error}`);
      throw error;
    }
  }
}

// 匯出單例
export const lineNotificationService = new LineNotificationService();
