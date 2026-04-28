# 預測 App 大幅重構設計

**Date**: 2026-04-29
**Status**: Approved (pending implementation)
**Author**: Loger + Claude

## 背景

現行架構是「一場比賽一張卡，卡上同時呈現獨贏/讓分/大小分三組欄位」，並有完整的詳情頁（14 個元件，含 AI 結構化分析）。實際使用後決定整體簡化：

- 詳情頁不再需要
- 列表只顯示「有推薦」的內容，而不是當天全部比賽
- DB 欄位設計不利於擴充未來市場（上半場 / 下半場 / 球員 prop 等）
- 多語維護成本高，但實際受眾僅台灣

本次重構等同砍掉一半程式碼、重新設計 schema，並把整個前端邏輯從「Game-centric」改成「Recommendation-centric」。

## 範圍

| 項目 | 變動 |
|------|------|
| 詳情頁 + 14 個 game-detail 元件 | 刪除 |
| `predictions` / `prediction_results` 資料表 | 刪除 |
| 前端列表 | 從 Game-card 改成 Recommendation-card（一個推薦一張卡） |
| 左側 sidebar | 隱藏籃球，新增市場多選 chip，星數改為最低值篩選 |
| 準確率頁 | 深度重寫（按市場別 + 星數別） |
| Ingest API | 重寫（payload 改為 recommendations 陣列） |
| i18n | 拿掉 en，只留中文 |
| 時間 | 統一台灣時間（DB 直接存台灣時間） |

不在範圍內：

- 開放分享連結（filter 不存 URL，重新整理回預設）
- 球員 prop / 半場市場（schema 已預留擴充能力，但本次不實作）
- SSR / SEO 詳情頁（整個概念不存在了）

---

## 資料庫設計

### 維持不動或微調的表

```sql
-- sports：保留，name_en 拿掉
sports (id PK, name_zh, is_active)

-- teams：保留，name_en 拿掉。NBA 隊伍資料保留
teams  (id PK, sport_id FK, name_zh, abbreviation, logo_url)
```

### 重建的表

```sql
-- games：純比賽資訊，不再包含推薦欄位
CREATE TABLE games (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id      TEXT NOT NULL REFERENCES sports(id),
  home_team_id  TEXT NOT NULL REFERENCES teams(id),
  away_team_id  TEXT NOT NULL REFERENCES teams(id),
  game_date     DATE NOT NULL,                  -- 台灣日期
  game_time     TIMESTAMP NOT NULL,             -- 台灣時間，無時區
  status        TEXT NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('scheduled','final','void')),
  home_score    INTEGER,
  away_score    INTEGER,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (game_date, home_team_id, away_team_id, game_time)
);

CREATE INDEX idx_games_date_sport ON games (game_date, sport_id);

-- recommendations：新表，一場比賽 0-N 列
CREATE TABLE recommendations (
  game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  market      TEXT NOT NULL
              CHECK (market IN ('ml','spread','ou')),
  pick        TEXT NOT NULL
              CHECK (pick IN ('home','away','over','under')),
  line        DECIMAL(5,1),                     -- ml = NULL；spread/ou 必填
  stars       INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  result      TEXT
              CHECK (result IN ('win','loss','push','void')),
                                                 -- 未開賽 = NULL
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (game_id, market)
);

CREATE INDEX idx_recs_game ON recommendations (game_id);
CREATE INDEX idx_recs_market_stars ON recommendations (market, stars);
```

### 刪除

- `predictions`（整張，欄位太多、不易擴充）
- `prediction_results`（result 改放在 recommendations 上）
- `accuracy_view`（同步改成由 recommendations 聚合）

### 設計原則

- **「下不下注」= 在 recommendations 是否有列**：PASS = 沒列；推薦 = 有列。不需要單獨 boolean
- **市場可擴充**：未來加上半場 → 新增 `'ml_h1'` 之類的 market 字面值即可，不動 schema
- **PUSH 保留**：雖然 .5 線不會 PUSH，但整數線（讓分 -1、大小分 8）可能 PUSH，預留欄位省得未來改
- **VOID 處理**：比賽取消 / 延賽 → 推薦作廢，不算贏輸
- **複合 PK 用 (game_id, market)**：一場比賽同一市場最多一個推薦
- **UNIQUE 含 game_time**：防雙重賽 G2（同天同對手打兩場）衝突
- **時間存台灣時間（無時區）**：產品只服務台灣，省去前端轉換

### 列表查詢

```sql
SELECT recommendations.*,
       games.game_date, games.game_time, games.sport_id,
       games.home_score, games.away_score, games.status,
       home_team:teams!games_home_team_id_fkey(*),
       away_team:teams!games_away_team_id_fkey(*)
FROM recommendations
JOIN games ON recommendations.game_id = games.id
WHERE games.game_date = $1
  AND ($2::text = 'all' OR games.sport_id = $2)
  AND recommendations.market = ANY($3)        -- ['ml','spread','ou']
  AND recommendations.stars >= $4              -- 最低星數
ORDER BY recommendations.stars DESC,           -- 預設
         games.game_time ASC;
```

### 準確率查詢

```sql
SELECT market, stars, result
FROM recommendations
WHERE result IS NOT NULL;

-- 前端聚合 overall / by_market / by_stars / daily trend
```

---

## 前端架構

### 路由

```
/                          重導 → /zh/predictions
/$lang/predictions         主頁（推薦列表）
/$lang/accuracy            準確率頁（深度重寫）

刪除：
/$lang/$sport/$slug        詳情頁（整個資料夾砍）
```

`$lang` 永遠只會是 `zh`，但保留路由結構供未來開放多語使用。

### 元件樹

```
PredictionsLayout
├── AppHeader                       (拿掉語言切換鈕)
├── AppSidebar                      (隱藏籃球；新增 MARKETS、改 STARS 語意)
├── MobileFilterBar                 (對齊 sidebar 的市場 + 星數)
└── main
    ├── /predictions
    │   ├── DateScrollBar
    │   ├── SortToggle              (新：時間 / 星數)
    │   └── RecommendationGrid
    │       └── RecommendationCard  (新：取代 GameCard)
    └── /accuracy
        ├── AccuracyOverview        (重寫)
        ├── MarketBreakdown         (新：按 ml/spread/ou)
        ├── StarBreakdown           (新：按 1-5★)
        └── AccuracyTrend           (重寫)
```

### Sidebar 設計

從上到下：

1. **SPORT**：全部 / 棒球（籃球隱藏）
2. **LEAGUES**：MLB（NBA 隱藏）
3. **MARKETS**（新）：獨贏 / 大小分 / 讓分 chip 可複選，預設全選
4. **STARS**：All / 2+ / 3+ / 4+ / 5 單選，預設 All

選 0 個市場 = 列表為空（提示「至少選一個市場」）。

### 推薦卡片（RecommendationCard）

極簡卡，一張卡 = 一個推薦：

```
┌─────────────────────────────────┐
│ MLB · 讓分           22:10      │  Header
├─────────────────────────────────┤
│ LAD                       SD    │  Teams
│ Dodgers              Padres     │
├─────────────────────────────────┤
│ LAD -1.5            ★★★★       │  Pick + Stars
└─────────────────────────────────┘
```

過去日期的卡片右上角加結果徽章（WIN / LOSS / PUSH / VOID）。

### State Store 變動

```ts
interface PredictionFilters {
  sport: 'all' | 'nba' | 'mlb'              // 型別保留 nba 供擴充
  dateRange: string                          // YYYY-MM-DD
  markets: Set<'ml' | 'spread' | 'ou'>      // 多選，預設全部
  minStars: number                           // 1 = All, 2-5 = X+
  sortBy: 'time' | 'stars'                   // 預設 'stars'
}

預設值：
  sport: 'all',
  dateRange: 今天,
  markets: new Set(['ml','spread','ou']),
  minStars: 1,
  sortBy: 'stars'
```

### Service 層

```ts
fetchDailyRecommendations(filters): Recommendation[]
  - 上述查詢 SQL，回傳扁平的推薦陣列（含 nested game + teams）
fetchAccuracyData(): { overall, byMarket, byStars, daily }
  - 從 recommendations 聚合
```

`fetchSportCounts` 改算「當天有推薦的場次數」（依 sport_id），`fetchDatesWithGames` 改名 `fetchDatesWithRecommendations`。

---

## API 設計

### POST `/api/ingest/predictions`

```jsonc
{
  "date": "2026-04-29",
  "games": [
    {
      "home_team": "LAD",
      "away_team": "SD",
      "game_time": "2026-04-29 22:10:00",
      "recommendations": [
        { "market": "ml",     "pick": "home",  "line": null, "stars": 4 },
        { "market": "spread", "pick": "home",  "line": -1.5, "stars": 4 },
        { "market": "ou",     "pick": "over",  "line": 8.5,  "stars": 3 }
      ]
    },
    {
      "home_team": "NYY",
      "away_team": "BOS",
      "game_time": "2026-04-29 19:05:00",
      "recommendations": []
    }
  ]
}
```

回傳：`{ total, upserted, total_recs, errors, results }`

行為（**source of truth 模式**）：
- 對每個 game upsert（依 UNIQUE 鍵）
- 對每個 game：先刪該 game 全部 recommendations，再 insert payload 帶的 recommendations
  - 即：payload 視為該場最新狀態，沒帶的市場視為「不再推薦」
- 若 `recommendations` 是空陣列 → 該場 game 仍 upsert，所有舊推薦被刪
- ingest 端責任：每次重送都要送「該場目前所有推薦」，不可只送 diff

### POST `/api/ingest/results`

```jsonc
{
  "date": "2026-04-29",
  "results": [
    {
      "home_team": "LAD",
      "away_team": "SD",
      "game_time": "2026-04-29 22:10:00",
      "home_score": 5,
      "away_score": 3,
      "recommendations": [
        { "market": "ml",     "result": "win"  },
        { "market": "spread", "result": "loss" },
        { "market": "ou",     "result": "win"  }
      ]
    }
  ]
}
```

result 由 ingest 端算好直接送，server 純 upsert。

### POST `/api/ingest/schedule`

行為不變（只塞 games 不塞 recommendations），但欄位對齊新 schema（`game_time` 改 `TIMESTAMP`）。

### `/api/render/[sport]/[slug]` → 刪除

### `/api/sitemap.xml`

只保留：`/`、`/zh/predictions`、`/zh/accuracy`。詳情 URL 全部移除。

---

## 遷移與部署計畫

按以下順序執行，每階段可單獨驗證：

### 階段 0 — 分支與備份

- 新分支 `feat/refactor-recommendations`
- production DB dump 備份（萬一要 rollback）

### 階段 1 — DB Schema Migration

舊資料整批刪掉，games / recommendations 都用 drop + recreate（不做欄位 alter，避免遷移腳本複雜）：

```sql
-- 008_drop_old_tables.sql
DROP VIEW IF EXISTS accuracy_view;
DROP TABLE IF EXISTS prediction_results;
DROP TABLE IF EXISTS predictions;
DROP TABLE IF EXISTS games;        -- slug、舊欄位、TIMESTAMPTZ 一起清

-- 009_recommendations_schema.sql
CREATE TABLE games (...);            -- 新 schema 如「資料庫設計」段
CREATE TABLE recommendations (...);
CREATE INDEX idx_games_date_sport ON games (game_date, sport_id);
CREATE INDEX idx_recs_game ON recommendations (game_id);
CREATE INDEX idx_recs_market_stars ON recommendations (market, stars);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read games" ON games FOR SELECT USING (true);
CREATE POLICY "Public read recommendations" ON recommendations FOR SELECT USING (true);
```

`sports` / `teams` 不動。NBA 隊伍資料保留。

### 階段 2 — Backend API

- 重寫 `api/ingest/predictions.ts`、`api/ingest/results.ts`、`api/ingest/schedule.ts`
- 刪除 `api/render/[sport]/[slug].ts`
- 更新 `api/sitemap.xml.ts`
- 對應的 helper：`src/lib/predictions/ingest-helpers.ts`（型別、validation 全更新；`generateSlug` 砍掉）

### 階段 3 — Frontend 主頁

刪除：

- `src/components/game-detail/` 整個資料夾（14 個元件）
- `src/routes/$lang/$sport/` 整個資料夾
- `src/hooks/predictions/useGameDetail.ts`
- `src/lib/predictions/seo.ts`
- `src/types/predictions/analysis.ts`
- `src/lib/i18n/en.ts`
- `src/test/unit/seo.test.ts`

新增：

- `src/components/predictions/RecommendationCard.tsx`
- `src/components/predictions/MarketChips.tsx`
- `src/components/predictions/SortToggle.tsx`
- `src/types/predictions/recommendation.ts`

重寫：

- `src/components/predictions/GameGrid.tsx` → `RecommendationGrid.tsx`
- `src/components/predictions/GameCard.tsx`（刪除，被 `RecommendationCard` 取代）
- `src/components/predictions/PredictionColumn.tsx`（刪除，極簡卡不用）
- `src/components/layout/AppSidebar.tsx`
- `src/components/layout/MobileFilterBar.tsx`
- `src/components/layout/AppHeader.tsx`（拿掉語言切換）
- `src/stores/predictions/predictionStore.ts`
- `src/services/predictions/api.ts`
- `src/hooks/predictions/useDailyPredictions.ts` → 改成 `useDailyRecommendations`
- `src/hooks/predictions/useDatesWithGames.ts` → 改成 `useDatesWithRecommendations`
- `src/types/predictions/index.ts`
- `src/lib/i18n/zh.ts`（精簡）
- `src/lib/i18n/index.ts`（拿掉 en/zh 切換邏輯）
- `src/routes/$lang/predictions/route.tsx`
- `src/routes/$lang/route.tsx`（拿掉 lang 切換邏輯，固定 zh）

### 階段 4 — 準確率頁

- 砍掉現有 `AccuracyOverview` / `AccuracyBySport` / `AccuracyTrend` 內部邏輯
- 新增 `MarketBreakdown` / `StarBreakdown`
- 重寫 `useAccuracyStats`、`fetchAccuracyData`

### 階段 5 — 測試

刪除：

- 整個 game-detail 相關測試
- `src/test/unit/seo.test.ts`
- `src/test/unit/generateSlug.test.ts`

重寫：

- `GameCard.test.tsx` → `RecommendationCard.test.tsx`
- `GameGrid.test.tsx` → `RecommendationGrid.test.tsx`
- `AppSidebar.test.tsx`
- `predictionStore.test.ts`
- `PredictionColumn.test.tsx`（刪除）
- `resolveDateRange.test.ts`、`timezone.test.ts`、`pct.test.ts`、`validateInput.test.ts` 視變更幅度更新

新增：

- `MarketChips.test.tsx`
- `SortToggle.test.tsx`
- 新準確率元件測試

### 階段 6 — E2E 驗證

- `npm run dev` 手動點過：日期切換、所有市場勾選組合、星數最低值、sport 切換、sort toggle
- 用 ingest API 送測試 payload，確認 DB 寫入
- 確認 sitemap 有效、首頁 SEO meta 正常
- 結果頁徽章顯示正確（送一筆 result 看看）

---

## 風險與注意事項

| 風險 | 處理 |
|------|------|
| TZ 切換造成歷史資料解讀錯誤 | 整個 DB drop 後重建，不會有舊資料殘留問題 |
| Supabase nested order 語法 | `order('games(game_time)')` 在實作階段確認；若 Supabase 版本不支援，改在前端 sort |
| TanStack Router 路由樹快取 | 刪除路由後要刪 `routeTree.gen.ts` 並讓 Vite plugin 重產 |
| ingest 端策略不一致 | 在文件內明確寫：每次 ingest 視為 source of truth，後端先刪該場全部 recs 再插 |
| RLS policy 漏設 | recommendations 表記得 enable RLS + public read policy |
| NBA 隊伍資料殘留 | 不刪，但 sport_id='nba' 的 games / recommendations 保證不會被前端 query 到（sport filter 不允許 'nba'） |

---

## 下一步

實作計畫由 writing-plans 技能產生，每個階段獨立可驗證。
