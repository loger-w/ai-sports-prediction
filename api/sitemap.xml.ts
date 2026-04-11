/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Hoist Supabase client (server-hoist-static-io)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
)

const BASE_URL = 'https://ai-sports-prediction.vercel.app'
const LANGS = ['en', 'zh'] as const

function escXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  // Start query early (async-api-routes)
  const queryPromise = supabase
    .from('games')
    .select('slug, sport_id, game_date, status')
    .order('game_date', { ascending: false })
    .limit(5000)

  const { data, error } = await queryPromise

  if (error || !data) {
    return res.status(500).send('Failed to load games')
  }

  // Build URL entries — one per lang per game (js-combine-iterations: single pass)
  const urlEntries: string[] = []

  // Static pages
  for (const lang of LANGS) {
    urlEntries.push(`
  <url>
    <loc>${escXml(`${BASE_URL}/${lang}/predictions`)}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`)
    urlEntries.push(`
  <url>
    <loc>${escXml(`${BASE_URL}/${lang}/accuracy`)}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`)
  }

  // Game pages — iterate once, emit both langs per game
  for (const game of data) {
    const isFinal = game.status === 'final'
    const changefreq = isFinal ? 'never' : 'daily'
    const priority = isFinal ? '0.5' : '0.8'

    for (const lang of LANGS) {
      urlEntries.push(`
  <url>
    <loc>${escXml(`${BASE_URL}/${lang}/${game.sport_id}/${game.slug}`)}</loc>
    <lastmod>${escXml(game.game_date)}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`)
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">${urlEntries.join('')}
</urlset>`

  res.setHeader('Content-Type', 'text/xml; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  return res.status(200).send(xml)
}
