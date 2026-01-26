# OSINT Monitor (Situation Monitor)

即時全球情報監控儀表板，整合新聞、市場數據與 AI 分析功能。

## 功能特色

### 📰 多源新聞聚合

- 整合 30+ RSS 來源（政治、科技、金融、政府、AI、情報）
- GDELT 全球事件資料庫整合
- 即時關鍵字警報系統

### 📊 市場數據監控

- 股市指數 (DOW, S&P 500, NASDAQ)
- 大宗商品與 VIX 恐慌指數
- 加密貨幣即時價格 (CoinGecko API)
- 產業板塊熱力圖

### 🤖 AI 智能分析

- **AI 戰情摘要**：一鍵生成繁體中文情勢報告
- **智慧翻譯**：新聞標題即時翻譯（需設定 LLM）
- **敘事追蹤**：偵測話題從邊緣媒體擴散到主流媒體的趨勢
- **關聯分析**：自動發現看似不相關新聞之間的關聯

### 🗺️ 地緣政治地圖

- 互動式全球地圖 (D3.js)
- 衝突區域標記
- 戰略要地與海運咽喉點
- 軍事基地與核設施位置

### 👥 世界領袖追蹤

- 各國元首即時動態
- 相關新聞自動匹配

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

複製範例檔並填入你的 API Keys：

```bash
cp .env.example .env
```

編輯 `.env` 檔案：

```env
# Finnhub API Key (股市數據)
# 免費申請: https://finnhub.io/
VITE_FINNHUB_API_KEY=your_finnhub_key

# LLM 設定 (選填，用於 AI 分析功能)
# 支援 OpenAI 相容 API (OpenAI, Azure, Ollama, LMStudio 等)
VITE_LLM_BASE_URL=https://api.openai.com/v1
VITE_LLM_API_KEY=sk-your-api-key
VITE_LLM_MODEL=gpt-4o-mini
```

### 3. 啟動開發伺服器

```bash
npm run dev
```

開啟瀏覽器訪問：http://localhost:5173

## LLM 設定說明

本專案支援兩種 LLM 設定方式：

### 方式一：環境變數 (推薦私人部署)

在 `.env` 檔案中設定：

```env
VITE_LLM_BASE_URL=https://api.openai.com/v1
VITE_LLM_API_KEY=sk-xxxxx
VITE_LLM_MODEL=gpt-4o-mini
```

### 方式二：Settings 面板 (推薦公開部署)

1. 點擊右上角 ⚙️ Settings
2. 在「AI Intelligence」區塊填入：
   - Base URL
   - API Key
   - 點擊「Fetch Models」選擇模型

> ⚠️ **安全警告**：如果部署到公開網站（如 GitHub Pages），請勿在 `.env` 中放入 API Key，因為它會被編譯進前端程式碼中。

### 支援的 LLM 服務

任何 OpenAI 相容 API 都可以使用：

| 服務            | Base URL                                                                    |
| --------------- | --------------------------------------------------------------------------- |
| OpenAI          | `https://api.openai.com/v1`                                                 |
| Azure OpenAI    | `https://your-resource.openai.azure.com/openai/deployments/your-deployment` |
| Ollama (本地)   | `http://localhost:11434/v1`                                                 |
| LMStudio (本地) | `http://localhost:1234/v1`                                                  |

## 開發指令

```bash
npm run dev          # 啟動開發伺服器 (localhost:5173)
npm run build        # 建置生產版本
npm run preview      # 預覽生產版本 (localhost:4173)
npm run check        # TypeScript 類型檢查
npm run test         # 執行單元測試
npm run lint         # ESLint + Prettier 檢查
npm run format       # 自動格式化程式碼
```

## 技術架構

- **框架**: SvelteKit 2.0 + Svelte 5 (Runes)
- **語言**: TypeScript (strict mode)
- **樣式**: Tailwind CSS (深色主題)
- **地圖**: D3.js + TopoJSON
- **測試**: Vitest + Playwright
- **部署**: 靜態網站 (GitHub Pages / Vercel)

## 專案結構

```
src/lib/
├── analysis/     # 關聯分析、敘事追蹤、主角偵測
├── api/          # 資料擷取 (GDELT, RSS, 市場 API)
├── components/   # Svelte 元件
│   ├── common/   # 共用元件 (Panel, NewsItem)
│   ├── layout/   # 版面元件 (Header, Dashboard)
│   ├── modals/   # 彈窗元件 (Settings, Monitor)
│   └── panels/   # 功能面板 (News, Markets, Map, AI Summary)
├── config/       # 設定檔 (feeds, keywords, map hotspots)
├── services/     # 服務層 (Cache, CircuitBreaker, LLM)
├── stores/       # Svelte stores (news, markets, llm, settings)
└── types/        # TypeScript 型別定義
```

## 部署到 Vercel

### 方式一：一鍵部署（推薦）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tbdavid2019/OSINT-monitor)

### 方式二：手動部署

1. Fork 此專案到你的 GitHub
2. 登入 [Vercel](https://vercel.com)
3. 點擊「New Project」→ 選擇你 fork 的 repo
4. Framework Preset 選擇「SvelteKit」
5. 設定環境變數（見下方說明）
6. 點擊「Deploy」

### 環境變數設定

在 Vercel Dashboard → Project Settings → Environment Variables 中設定：

| 變數名稱               | 必填      | 說明                                         |
| ---------------------- | --------- | -------------------------------------------- |
| `VITE_FINNHUB_API_KEY` | ⚠️ 選填   | 股市數據 API（免費申請：https://finnhub.io） |
| `VITE_LLM_BASE_URL`    | ❌ 不建議 | LLM API 位址                                 |
| `VITE_LLM_API_KEY`     | ❌ 不建議 | LLM API 金鑰                                 |
| `VITE_LLM_MODEL`       | ❌ 不建議 | LLM 模型名稱                                 |

### ⚠️ 重要安全警告

**關於 LLM API Key 的安全性**：

這是一個**純前端靜態網站**，所有 `VITE_*` 環境變數都會在 build time 被編譯進 JavaScript 檔案中。這意味著：

- ❌ **公開部署時**：任何人都可以在瀏覽器 DevTools 中看到你的 API Key
- ❌ **API Key 會被盜用**：惡意使用者可以用你的 Key 產生費用

**建議做法**：

| 部署類型    | LLM 設定方式         | 說明                                                        |
| ----------- | -------------------- | ----------------------------------------------------------- |
| 🌐 公開網站 | Settings 面板 (BYOK) | 不設 env，讓每位使用者輸入自己的 Key                        |
| 🔒 私人使用 | 環境變數             | 可設 env，但需限制網站存取（如 Vercel Password Protection） |
| 🏠 本地開發 | 環境變數             | 安全，只有你能存取                                          |

**BYOK (Bring Your Own Key) 模式**：

公開部署時，使用者可在 Settings → AI Intelligence 中輸入自己的 API Key。Key 只會存在使用者的瀏覽器 localStorage 中，不會傳送到任何伺服器。

## 致謝

本專案基於 [hipcityreg/situation-monitor](https://github.com/hipcityreg/situation-monitor) 開源專案進行修改與擴充，感謝原作者的貢獻。

