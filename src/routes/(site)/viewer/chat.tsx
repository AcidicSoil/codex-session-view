import { createFileRoute } from '@tanstack/react-router'
import { VIEWER_CHAT_ROUTE_ID } from '~/features/viewer/route-id'
import { ViewerChatView } from '~/features/viewer/views/ViewerChatView'

export const Route = createFileRoute(VIEWER_CHAT_ROUTE_ID)({
  component: ViewerChatView,
})
