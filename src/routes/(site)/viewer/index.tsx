import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(site)/viewer/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(site)/viewer/"!</div>
}
