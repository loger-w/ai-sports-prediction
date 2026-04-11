import { useEffect } from 'react'

interface SchemaMarkupProps {
  schema: Record<string, unknown>
}

// Injects JSON-LD structured data into <head> for SEO.
// Uses a stringified primitive dep (rerender-dependencies) to avoid
// unnecessary effect re-runs from unstable object identity.
export function SchemaMarkup({ schema }: SchemaMarkupProps) {
  const schemaStr = JSON.stringify(schema)

  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.text = schemaStr
    document.head.appendChild(script)
    return () => {
      document.head.removeChild(script)
    }
  }, [schemaStr])

  return null
}
