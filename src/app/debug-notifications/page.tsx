'use client'

import { NotificationContent } from './NotificationContent'

// Route segment config lives in the layout (server component), not this client file.
// This file stays client-only just to render the debug UI.

export default function DebugNotificationsPage() {
  return <NotificationContent />
}
