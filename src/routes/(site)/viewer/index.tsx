import { createFileRoute } from '@tanstack/react-router'
import { VIEWER_ROUTE_ID } from '~/features/viewer/route-id'
import { viewerSearchSchema } from '~/features/viewer/viewer.search'
import { viewerLoader } from '~/features/viewer/viewer.loader'
import { viewerHead } from '~/features/viewer/viewer.head'
import { ViewerPage } from '~/features/viewer/viewer.page'

export const Route = createFileRoute(VIEWER_ROUTE_ID)({
  validateSearch: viewerSearchSchema,
  loader: viewerLoader,
  head: viewerHead,
  component: ViewerPage,
})
