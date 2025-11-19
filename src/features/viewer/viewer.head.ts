import { seo } from '~/utils/seo'

export function viewerHead() {
  return {
    meta: seo({
      title: 'Codex Session Viewer · Discovery',
      description: 'Explore workspace files and session logs detected at build time.',
    }),
  }
}
