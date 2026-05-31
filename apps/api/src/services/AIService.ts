import { Groq } from 'groq-sdk';

export class AIService {
  private client: Groq;

  constructor() {
    this.client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  async chat(message: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `你是智慧工廠的AI助理，名叫「阿智」。
你協助工廠員工管理工單、分析異常、預測問題。
回答必須：
1. 使用繁體中文
2. 簡潔清楚（手機閱讀）
3. 包含具體行動建議
4. 嚴重問題加上 ⚠️ 標示
當你不確定時，建議員工聯絡主管。`,
          },
          {
            role: 'user',
            content: message,
          },
        ],
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        max_tokens: 500,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || '無法生成回應';
    } catch (error) {
      console.error('Groq API Error:', error);
      throw error;
    }
  }

  async analyze(type: string, data: string): Promise<object> {
    try {
      const prompt = this.buildAnalysisPrompt(type, data);
      const response = await this.client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: '你是工廠數據分析專家。用繁體中文提供詳細的分析和建議。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        max_tokens: 800,
        temperature: 0.5,
      });

      const content = response.choices[0]?.message?.content || '';

      return {
        type,
        analysis: content,
        timestamp: new Date().toISOString(),
        confidence: 0.85,
      };
    } catch (error) {
      console.error('Analysis Error:', error);
      throw error;
    }
  }

  private buildAnalysisPrompt(type: string, data: string): string {
    const prompts: Record<string, (data: string) => string> = {
      defect_rate: (data) =>
        `分析以下不良率數據並給出改善建議：${data}`,
      production_trend: (data) =>
        `分析生產趨勢數據，預測未來產能風險：${data}`,
      machine_health: (data) =>
        `分析機台健康狀態數據，列出潛在故障風險：${data}`,
      downtime: (data) =>
        `分析停機原因，建議改善對策：${data}`,
    };

    return prompts[type]?.(data) || `分析以下數據：${data}`;
  }
}
