# 智慧工廠員工App (Smart Factory Worker App)

> 生產級行動應用程式，為工廠現場員工設計。具有自主AI、實時警報、線上/離線同步。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Expo](https://img.shields.io/badge/Expo-51.0-black)
![Node.js](https://img.shields.io/badge/Node.js-20-green)

## 🏭 系統概述

```
┌────────────────────────────────────────────────────────────┐
│          工廠現場員工行動App                              │
├──────────────────────────────────────────────────────────┤
│ 首頁儀表板 │ 我的工單 │ QR掃描 │ 警報中心 │ 個人資料 │
└──────────────────────────────────────────────────────────┘
               │
       ┌───────▼────────────┐
       │ Zustand Store      │
       │ TanStack Query     │ (State Management)
       │ WatermelonDB       │ (Offline SQLite)
       └───────┬────────────┘
               │ JWT Token + WebSocket
               │
    ┌──────────▼──────────────────────────────────────┐
    │   Smart Factory API Server                      │
    │ (Express.js + PostgreSQL + Drizzle)            │
    ├──────────────────────────────────────────────┤
    │ Authentication │ Work Orders                  │
    │ Machine Health │ Real-time WebSocket          │
    │ Anomalies      │ AI Analysis                  │
    │ Notifications  │ LINE Integration             │
    └──────────┬──────────────────────────────────┘
               │
        ┌──────┼──────┐
        │      │      │
   PostgreSQL Redis Groq AI
   (Database)(Queue)(Llama 3.3)

┌──────────────────────────────────────────┐
│   自主AI引擎 (Autonomous Engine)        │
│ 每5分鐘: 機台健康檢查                    │
│ 每10分鐘: KPI計算                       │
│ 每30分鐘: 生產趨勢分析                  │
│ 每1小時: 交期風險預測                   │
│ 每日07:30: 晨間簽報                     │
│ 每日17:00: 晚間報告                     │
│ 實時: 刀具壽命警告、異常觸發           │
└──────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  LINE Bot Integration (Rich Menu + Flex) │
│  推送通知、工單指派、異常提醒、AI分析   │
└────────────────────────────────────────┘
```

---

## 📋 必備條件

- **Node.js 20+** (Node Package Manager)
- **npm 10+** 或 **yarn 4+**
- **PostgreSQL 15+** (本地或遠端)
- **Redis 7+** (BullMQ 背景隊列)
- **Expo CLI**: `npm install -g expo-cli`
- **EAS CLI**: `npm install -g eas-cli` (iOS/Android 構建)
- **Git** (版本控制)
- **Groq API Key**: 免費申請 [console.groq.com](https://console.groq.com)
- **LINE Bot Channel**: [LINE Developers](https://developers.line.biz/)

---

## 🚀 快速開始

### 1️⃣ 一鍵安裝與配置

```bash
# 複製倉庫
git clone https://github.com/qhero70/smart-factory-worker-app.git
cd smart-factory-worker-app

# 一次性安裝所有依賴 + 資料庫遷移 + 測試資料
npm run setup
```

### 2️⃣ 本地開發

**終端機 1 - 啟動 API 伺服器**
```bash
npm run dev:api
# 監聽 http://localhost:3000
```

**終端機 2 - 啟動行動應用**
```bash
npm run dev:mobile
# Expo Metro Bundler 將打開 http://localhost:8081
# 掃描 QR Code 在實體手機或模擬器中打開
```

**同時運行兩者**
```bash
npm run dev
```

### 3️⃣ 環境變數

```bash
# 複製範本
cp .env.example .env

# 編輯 .env 並填入您的值
# 詳見下方 🔑 環境變數章節
```

---

## 🔑 環境變數說明

### 後端 (apps/api/.env)

| 變數 | 說明 | 範例 |
|------|------|------|
| `NODE_ENV` | 執行環境 | `development` \| `production` |
| `PORT` | API 監聽埠 | `3000` |
| `DATABASE_URL` | PostgreSQL 連線字串 | `postgresql://user:pass@localhost:5432/smartfactory` |
| `REDIS_URL` | Redis 連線字串 | `redis://localhost:6379` |
| `JWT_SECRET` | JWT 簽名密鑰 (最少32字元) | `your-super-secret-key...` |
| `JWT_REFRESH_SECRET` | 刷新令牌密鑰 | `your-refresh-secret...` |
| `GROQ_API_KEY` | Groq API 金鑰 | 從 [console.groq.com](https://console.groq.com) 獲取 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Bot 存取令牌 | 來自 LINE Developers |
| `LINE_CHANNEL_SECRET` | LINE Bot 頻道密鑰 | 來自 LINE Developers |

### 前端 (apps/mobile/.env)

| 變數 | 說明 | 範例 |
|------|------|------|
| `EXPO_PUBLIC_API_URL` | API 基礎 URL | `https://your-api.railway.app` \| `http://localhost:3000` |
| `EXPO_PUBLIC_WS_URL` | WebSocket URL | `wss://your-api.railway.app` \| `ws://localhost:3000` |

---

## 📁 項目結構

```
smart-factory-worker-app/
├── apps/
│   ├── api/                          # 後端 Express 伺服器
│   │   ├── src/
│   │   │   ├── index.ts              # 應用入口點
│   │   │   ├── config/               # 配置檔案
│   │   │   ├── db/                   # Drizzle 資料庫
│   │   │   │   ├── schema.ts         # 資料庫模式定義
│   │   │   │   └── migrations/       # 資料庫遷移
│   │   │   ├── routes/               # API 路由
│   │   │   ├── services/             # 業務邏輯
│   │   │   │   ├── AuthService.ts    # 認證服務
│   │   │   │   ├── WorkOrderService.ts # 工單服務
│   │   │   │   ├── AutonomousEngine.ts # 自主AI引擎
│   │   │   │   └── AIService.ts      # Groq AI 整合
│   │   │   ├── middleware/           # Express 中間軟體
│   │   │   ├── utils/                # 工具函數
│   │   │   └── workers/              # BullMQ 背景工作
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── mobile/                       # React Native + Expo 應用
│       ├── app/
│       │   ├── (auth)/               # 認證流程
│       │   │   ├── login.tsx
│       │   │   └── _layout.tsx
│       │   ├── (tabs)/               # 主頁面選項卡
│       │   │   ├── _layout.tsx       # 標籤導航
│       │   │   ├── index.tsx         # 首頁儀表板
│       │   │   ├── workorders.tsx    # 我的工單
│       │   │   ├── scan.tsx          # QR 掃描
│       │   │   ├── alerts.tsx        # 警報中心
│       │   │   └── profile.tsx       # 個人資料
│       │   ├── workorder/
│       │   │   ├── [id].tsx          # 工單詳情
│       │   │   └── report.tsx        # 報工表單
│       │   ├── anomaly/
│       │   │   └── report.tsx        # 異常回報
│       │   ├── machine/
│       │   │   └── [id].tsx          # 機台詳情
│       │   ├── ai/
│       │   │   └── assistant.tsx     # AI 助理
│       │   ├── _layout.tsx           # 根佈局
│       │   └── +html.tsx             # PWA 根
│       ├── src/
│       │   ├── stores/               # Zustand 狀態
│       │   ├── services/             # API 客戶端
│       │   ├── components/           # 可重用元件
│       │   ├── screens/              # 頁面元件
│       │   ├── hooks/                # 自定義 Hooks
│       │   ├── types/                # TypeScript 型別
│       │   ├── theme/                # 設計系統
│       │   └── utils/                # 工具函數
│       ├── assets/
│       ├── app.json                  # Expo 配置
│       ├── package.json
│       └── tsconfig.json
│
├── .github/
│   └── workflows/
│       ├── test.yml                  # 單元測試
│       ├── deploy-api.yml            # API 部署
│       └── build-mobile.yml          # 行動應用構建
│
├── package.json                      # Monorepo 根
├── tsconfig.json
├── turbo.json                        # Turbo 構建配置
├── .env.example                      # 環境變數範本
├── .prettierrc                       # 程式碼格式化
├── .eslintrc.json                    # 程式碼規範
└── README.md                         # 此文件
```

---

## 🛠️ 開發命令

### 常用命令

```bash
# 安裝依賴
npm ci

# 同時開發後端 + 前端
npm run dev

# 分別開發
npm run dev:api        # 只開發 API
npm run dev:mobile     # 只開發行動應用

# 類型檢查
npm run typecheck

# 程式碼規範
npm run lint
npm run lint -- --fix  # 自動修復

# 執行測試
npm test

# 構建
npm run build

# 資料庫
npm run db:migrate     # 執行遷移
npm run seed           # 插入測試資料
```

---

## 📱 行動應用安裝

### 選項 1: Expo Go (開發用)

1. 在手機上下載 **Expo Go** (iOS App Store 或 Android Google Play)
2. 執行 `npm run dev:mobile`
3. 掃描終端機中的 QR Code
4. 應用將在實體手機上打開

### 選項 2: 生產構建 (iOS)

```bash
# 需要 Apple 開發者帳戶
eas build --platform ios --non-interactive

# 或只用 Expo
eas build --platform ios
```

### 選項 3: 生產構建 (Android)

```bash
# 需要 Google Play 開發者帳戶
eas build --platform android --non-interactive

# 或只用 Expo
eas build --platform android
```

### 選項 4: PWA (網頁應用)

```bash
# 構建並託管
npm run build
npm run build -- --web

# 可在任何現代瀏覽器中打開
# 可離線工作（Service Worker）
# 可新增至主螢幕
```

---

## 🚀 生產部署

### 後端 API (Railway.app)

#### 步驟 1: 在 Railway 上創建應用

```bash
# 安裝 Railway CLI
npm install -g @railway/cli

# 登入
railway login

# 初始化項目
railway init

# 連結 GitHub 倉庫
railway link
```

#### 步驟 2: 配置環境變數

在 Railway 儀表板中設置所有 `.env` 變數

#### 步驟 3: 部署

```bash
# 自動部署到 Railway
railway up

# 或在 GitHub 推送時自動部署（已配置 CI/CD）
```

### 行動應用 (Expo)

#### 步驟 1: 登入 Expo

```bash
expo login
```

#### 步驟 2: 執行 EAS 構建

```bash
# 建立 iOS + Android 生產構建
eas build --platform all

# 只建立 iOS
eas build --platform ios --profile production

# 只建立 Android
eas build --platform android --profile production
```

#### 步驟 3: 上傳到應用商店

- **iOS**: 使用 Expo 的 Transporter 或 Xcode
- **Android**: 使用 Google Play Console

---

## 🤖 AI 助理 & 自主引擎

### 設定 Groq API

1. 造訪 [console.groq.com](https://console.groq.com)
2. 創建新帳戶或登入
3. 複製 API 密鑰
4. 在 `.env` 中設置 `GROQ_API_KEY`

### 自主AI引擎檢查表

- ✅ **每5分鐘**: 檢查機台健康狀態
- ✅ **每10分鐘**: 自動計算 KPI 並透過 WebSocket 推送
- ✅ **每30分鐘**: 生產趨勢 AI 分析
- ✅ **每1小時**: 交期風險預測
- ✅ **每日 07:30**: 晨間簽報推送
- ✅ **每日 17:00**: 晚間生產報告
- ✅ **實時**: 刀具壽命 < 15% 觸發 CRITICAL 警報
- ✅ **實時**: 不良率 > 5% 觸發 AI 根本原因分析

---

## 💬 LINE Bot 整合

### 設定 LINE Bot

#### 步驟 1: 在 LINE Developers 建立 Channel

1. 造訪 [LINE Developers](https://developers.line.biz/)
2. 創建新的 "Messaging API" Channel
3. 從頻道設定複製:
   - **Channel Access Token** → `LINE_CHANNEL_ACCESS_TOKEN`
   - **Channel Secret** → `LINE_CHANNEL_SECRET`

#### 步驟 2: 設定 Webhook

在 LINE 開發者控制台中:

```
Webhook URL: https://your-api.railway.app/api/line/webhook
Webhook Events: Message, Follow, Postback
```

#### 步驟 3: 建立 Rich Menu

使用 LINE Bot Designer 或手動 JSON:

```json
{
  "size": {
    "width": 2400,
    "height": 810
  },
  "areas": [
    {
      "bounds": { "x": 0, "y": 0, "width": 800, "height": 810 },
      "label": "掃碼報工",
      "action": { "type": "message", "text": "掃碼報工" }
    },
    {
      "bounds": { "x": 800, "y": 0, "width": 800, "height": 810 },
      "label": "今日工單",
      "action": { "type": "message", "text": "今日工單" }
    },
    {
      "bounds": { "x": 1600, "y": 0, "width": 800, "height": 810 },
      "label": "AI 助理",
      "action": { "type": "message", "text": "AI 助理" }
    }
  ]
}
```

#### 步驟 4: 將 Rich Menu ID 設置到環境變數

在 `.env` 中:
```
LINE_RICH_MENU_ID=richmenu_xxxxxxxxxxxxx
```

### LINE Bot 功能

- 📨 **工單指派**: 新工單自動推送給操作員
- 🚨 **異常警報**: 實時推送異常和建議
- 📊 **每日報告**: 自動推送生產報告
- 🤖 **AI 分析**: 透過 LINE 聊天要求 AI 分析
- 📞 **主管通知**: 重要事件推送給主管

---

## 📊 資料庫架構

### 主要表格

#### users (用戶)
```sql
id | employeeId | name | role | department | lineUserId | expoPushToken | avatar | isActive | createdAt
```

#### workOrders (工單)
```sql
id | orderNo | productCode | productName | machineId | quantity | completedQty | defectQty | plannedStart | plannedEnd | status | assignedTo | qrCode | priority | createdAt
```

#### reportingLogs (報工日誌)
```sql
id | workOrderId | userId | machineId | startTime | endTime | quantity | defectQty | downtimeMinutes | downtimeReason | note | location | deviceId | createdAt
```

#### machines (機台)
```sql
id | machineCode | machineName | area | status | oeeRate | lastHeartbeat | currentWorkOrderId | operatorId | createdAt
```

#### anomalies (異常)
```sql
id | type | severity | machineId | workOrderId | reportedBy | description | imageUrl | status | aiAnalysis | resolvedAt | createdAt
```

#### notifications (通知)
```sql
id | userId | title | body | type | data | isRead | sentAt | createdAt
```

#### aiInsights (AI 洞見)
```sql
id | type | input | result | confidence | recommendation | actionTaken | createdAt
```

---

## ✅ 測試

### 單元測試

```bash
npm test
```

### 整合測試

```bash
# 啟動本地 API + 資料庫
npm run dev:api

# 在另一個終端機
npm run test:integration
```

### 端到端測試

```bash
npm run test:e2e
```

---

## 🐛 常見問題排除

### 問題 1: PostgreSQL 連線錯誤

```bash
# 檢查 PostgreSQL 是否運行
pg_isready -h localhost -p 5432

# 如未運行，啟動 PostgreSQL
# macOS (使用 Homebrew)
brew services start postgresql

# 建立資料庫
creatdb smartfactory
```

### 問題 2: Redis 連線錯誤

```bash
# 檢查 Redis 是否運行
redis-cli ping

# 如未運行，啟動 Redis
# macOS (使用 Homebrew)
brew services start redis
```

### 問題 3: Expo 掃描 QR Code 失敗

```bash
# 確保手機和電腦在同一網路
# 重新啟動 Metro Bundler
npm run dev:mobile -- --reset-cache
```

### 問題 4: 類型檢查失敗

```bash
# 重新生成類型
npm run typecheck -- --noEmit false

# 查看詳細錯誤
npm run typecheck -- --listFilesOnly
```

---

## 📖 API 文件

### 認證端點

#### 登入

**POST** `/api/auth/login`

```json
{
  "employeeId": "EMP001",
  "pin": "1234"
}
```

**Response**

```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "user-123",
    "employeeId": "EMP001",
    "name": "王小明",
    "role": "OPERATOR"
  }
}
```

### 工單端點

#### 獲取我的工單

**GET** `/api/workorders/mine`

**Headers**

```
Authorization: Bearer {accessToken}
```

**Response**

```json
{
  "data": [
    {
      "id": "wo-123",
      "orderNo": "ORD-2026-001",
      "productName": "齒輪箱",
      "quantity": 100,
      "completedQty": 45,
      "status": "IN_PROGRESS",
      "plannedEnd": "2026-05-31T16:00:00Z"
    }
  ]
}
```

#### 上報生產數據

**POST** `/api/reporting/submit`

```json
{
  "workOrderId": "wo-123",
  "startTime": "2026-05-31T10:00:00Z",
  "endTime": "2026-05-31T12:00:00Z",
  "quantity": 50,
  "defectQty": 2,
  "downtimeMinutes": 15,
  "downtimeReason": "更換刀具",
  "note": "順利完成"
}
```

### WebSocket 事件

#### 連線

```javascript
const ws = new WebSocket('wss://your-api.railway.app');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'SUBSCRIBE',
    userId: 'user-123',
    token: 'jwt-token'
  }));
};
```

#### 接收 KPI 更新

```javascript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'KPI_UPDATE') {
    console.log('今日工單:', data.payload.ordersCompleted);
    console.log('不良率:', data.payload.defectRate);
  }
};
```

---

## 🎨 設計系統

### 色彩主題

```typescript
const colors = {
  // 背景
  bg: '#0a0f1e',
  bgSecondary: '#0f1629',
  bgCard: 'rgba(255,255,255,0.04)',
  
  // 狀態
  running: '#10b981',      // 運轉
  idle: '#f59e0b',         // 待機
  maintenance: '#8b5cf6',  // 保養
  error: '#ef4444',        // 故障
  
  // 警報
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#10b981'
};
```

### 字體

- **正文**: Noto Sans TC (繁體中文)
- **標題**: Noto Sans TC Bold
- **等寬**: Fira Code (技術數據)

---

## 🔒 安全性

- ✅ JWT 令牌 (15 分鐘有效期)
- ✅ 刷新令牌 (7 天有效期)
- ✅ Expo SecureStore 加密存儲
- ✅ 生物識別認證 (Face ID / 指紋)
- ✅ PIN 碼備選方案
- ✅ 5 分鐘後自動鎖定
- ✅ 所有API通過HTTPS/WSS
- ✅ CORS 配置限制來源
- ✅ SQL 注入防護 (ORM)
- ✅ 審計日誌所有關鍵操作

---

## 📝 貢獻指南

1. 建立特性分支: `git checkout -b feature/your-feature`
2. 提交更改: `git commit -m 'Add your feature'`
3. 推送到分支: `git push origin feature/your-feature`
4. 打開 Pull Request

### 程式碼風格

- TypeScript strict mode
- ESLint + Prettier
- 100 字符每行限制
- 單引號
- 尾部逗號

### Pre-commit Hooks

```bash
# Husky 會在提交前自動:
# 1. 執行 ESLint
# 2. 執行 Prettier
# 3. 執行類型檢查
# 4. 執行單元測試
```

---

## 📞 技術支援

- 📧 **Email**: support@smartfactory.local
- 🐛 **Issues**: [GitHub Issues](https://github.com/qhero70/smart-factory-worker-app/issues)
- 📚 **Wiki**: [GitHub Wiki](https://github.com/qhero70/smart-factory-worker-app/wiki)

---

## 📄 授權

MIT License - 詳見 [LICENSE](LICENSE) 文件

---

## 🙏 致謝

感謝所有貢獻者和技術支援!

**最後更新**: 2026-05-31 | **版本**: 1.0.0
