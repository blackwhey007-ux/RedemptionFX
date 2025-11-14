export const dynamic = 'force-static'

export default function DebugNotificationsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Debug Notifications (Disabled in Production)</h1>
      <p className="text-slate-600 dark:text-slate-300">
        This debug page was causing issues during the production build because it depended on
        client-side notification context. To ensure a successful deployment, the interactive
        debug tools have been disabled in the deployed version.
      </p>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        You can still run the full debug notifications UI locally in development by restoring
        the previous component, but it is intentionally simplified in production.
      </p>
    </div>
  )
}
