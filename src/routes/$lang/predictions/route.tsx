import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/$lang/predictions')({
  component: () => (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">AI Sports Predictions</h1>
      <p className="text-muted-foreground">Coming soon...</p>
    </div>
  ),
})
