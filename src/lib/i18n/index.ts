// src/lib/i18n/index.ts
// Single-locale entry point. `useTranslation` keeps the same API for callers,
// returning the zh translation object plus a fixed lang='zh'.

import { zh, type Translations } from './zh'

export type Lang = 'zh'
export type { Translations }

export function useTranslation(): { t: Translations; lang: Lang } {
  return { t: zh, lang: 'zh' }
}
