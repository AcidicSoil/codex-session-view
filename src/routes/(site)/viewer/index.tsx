import { createFileRoute } from '@tanstack/react-router'
import { VIEWER_HOME_ROUTE_ID } from '~/features/viewer/route-id'
import { ViewerExplorerView } from '~/features/viewer/views/ViewerExplorerView'

export const Route = createFileRoute(VIEWER_HOME_ROUTE_ID)({
  component: ViewerExplorerView,
})
