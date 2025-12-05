import { createFileRoute } from '@tanstack/react-router'
import { VIEWER_INSPECTOR_ROUTE_ID } from '~/features/viewer/route-id'
import { ViewerInspectorView } from '~/features/viewer/views/ViewerInspectorView'

export const Route = createFileRoute(VIEWER_INSPECTOR_ROUTE_ID)({
  validateSearch: (search: Record<string, unknown>) => ({
    panel: search.panel === 'rules' ? 'rules' : undefined,
  }),
  component: InspectorRouteComponent,
})

function InspectorRouteComponent() {
  const search = Route.useSearch()
  return <ViewerInspectorView focusPanel={search.panel} />
}
