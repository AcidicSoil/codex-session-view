import { ViewerWorkspaceBoundary } from './viewer.workspace'
import { ViewerWorkspaceChrome, ViewerSkeleton } from './viewer.workspace.chrome'

export { useViewerWorkspace, ViewerWorkspaceBoundary } from './viewer.workspace'

export function ViewerPage() {
  return (
    <ViewerWorkspaceBoundary fallback={<ViewerSkeleton />}>
      <ViewerWorkspaceChrome />
    </ViewerWorkspaceBoundary>
  )
}
