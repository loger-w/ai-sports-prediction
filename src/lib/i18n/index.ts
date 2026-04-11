import { useParams } from '@tanstack/react-router'
import { en } from './en'
import { zh } from './zh'

const translations = { en, zh } as const

export type Lang = keyof typeof translations
export type { Translations } from './en'

export function useTranslation() {
  const params = useParams({ strict: false }) as { lang?: string }
  const lang: Lang = params.lang === 'zh' ? 'zh' : 'en'
  return { t: translations[lang], lang }
}
