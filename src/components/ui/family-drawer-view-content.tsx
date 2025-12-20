import { useFamilyDrawer, type ViewsRegistry } from "~/components/ui/family-drawer-context"

interface FamilyDrawerViewContentProps {
  views?: ViewsRegistry
}

export function FamilyDrawerViewContent(
  {
    views: propViews,
  }: FamilyDrawerViewContentProps = {} as FamilyDrawerViewContentProps
) {
  const { view, views: contextViews } = useFamilyDrawer()

  const views = propViews || contextViews

  if (!views) {
    throw new Error(
      "FamilyDrawerViewContent requires views to be provided via props or FamilyDrawerRoot"
    )
  }

  const ViewComponent = views[view]

  if (!ViewComponent) {
    const DefaultComponent = views.default
    return DefaultComponent ? <DefaultComponent /> : null
  }

  return <ViewComponent />
}
