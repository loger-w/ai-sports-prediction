/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node'

const BASE_URL = 'https://ai-sports-prediction.vercel.app'

function escXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const urls: string[] = [
    `<url><loc>${escXml(BASE_URL + '/')}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    `<url><loc>${escXml(BASE_URL + '/zh/predictions')}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    `<url><loc>${escXml(BASE_URL + '/zh/accuracy')}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`,
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.join('\n  ')}
</urlset>`

  res.setHeader('Content-Type', 'text/xml; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  return res.status(200).send(xml)
}
