import { createFileRoute } from '@tanstack/react-router'
import { VIEWER_ROUTE_ID } from '~/features/viewer/route-id'
import { viewerLoader } from '~/features/viewer/viewer.loader'
import { viewerHead } from '~/features/viewer/viewer.head'
import { ViewerPage } from '~/features/viewer/viewer.page'

export const Route = createFileRoute(VIEWER_ROUTE_ID)({
  loader: viewerLoader,
  head: viewerHead,
  component: ViewerPage,
})
