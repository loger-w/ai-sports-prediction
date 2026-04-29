// src/lib/i18n/zh.ts
// Single-locale (zh-TW) translations for the recommendations app.

export const zh = {
  nav: {
    predictions: '今日推薦',
    accuracy: '準確率',
  },
  filter: {
    sport: '運動種類',
    allSports: '全部',
    minStars: '最低星數',
    starsAll: '不限',
    filterButton: '篩選',
    baseball: '棒球',
    leagues: '聯盟',
    markets: '市場',
  },
  market: {
    ml: '獨贏',
    spread: '讓分',
    ou: '大小分',
    over: '大',
    under: '小',
  },
  predictions: {
    vs: 'VS',
    noResults: '沒有符合篩選條件的推薦。',
    noData: '推薦通常在每天早上更新。',
    resetFilters: '重置篩選',
    retry: '重試',
    sortByTime: '依時間',
    sortByStars: '依星數',
    pickAtLeastMarket: '請至少勾選一個市場',
  },
  accuracy: {
    title: '預測準確率',
    overall: '整體',
    byMarket: '依市場',
    byStars: '依星數',
    trend: '準確率趨勢',
    record: '戰績',
    totalRecs: '已結算推薦',
    noData: '尚無已結算推薦。比賽結束後再來查看。',
    pushVoid: '和局 / 無效',
  },
  result: {
    win: '贏',
    loss: '輸',
    push: '和',
    void: '無效',
  },
  dates: {
    today: '今日',
    weekdaysShort: ['日', '一', '二', '三', '四', '五', '六'] as const,
  },
} as const

export type Translations = typeof zh
