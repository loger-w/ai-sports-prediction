import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const lang = navigator.language.startsWith('zh') ? 'zh' : 'en'
    throw redirect({ to: '/$lang/predictions', params: { lang } })
  },
})
