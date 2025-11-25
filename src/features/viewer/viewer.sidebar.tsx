import { UploadControlsCard, type UploadController } from './viewer.upload.section'

interface ViewerSidebarProps {
  controller: UploadController
}

export function ViewerSidebar({ controller }: ViewerSidebarProps) {
  return (
    <aside className="w-full max-w-sm">
      <UploadControlsCard controller={controller} />
    </aside>
  )
}
