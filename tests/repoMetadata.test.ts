import { describe, expect, it } from 'vitest'
import { promises as fs } from 'fs'
import { deriveRepoDetailsFromLine } from '~/lib/repo-metadata'

async function readFirstLine(path: string) {
  const content = await fs.readFile(path, 'utf8')
  const newline = content.indexOf('\n')
  return newline >= 0 ? content.slice(0, newline) : content
}

describe('repo metadata derivation', () => {
  it('infers repo label from cwd when git info missing', async () => {
    const line = await readFirstLine('example-session-metadata.jsonl')
    const details = deriveRepoDetailsFromLine(line)
    expect(details.repoLabel).toBe('codex-session-view')
    expect(details.repoMeta?.repo).toBe('codex-session-view')
  })

  it('prefers repository_url metadata when available', () => {
    const line = JSON.stringify({
      type: 'session_meta',
      timestamp: new Date().toISOString(),
      payload: {
        timestamp: new Date().toISOString(),
        repository_url: 'https://github.com/owner/sample-repo.git',
        cwd: '/tmp/random/path',
      },
    })
    const details = deriveRepoDetailsFromLine(line)
    expect(details.repoLabel).toBe('owner/sample-repo')
  })

  it('derives repo name from parent folders when cwd ends in src', () => {
    const line = JSON.stringify({
      type: 'session_meta',
      timestamp: new Date().toISOString(),
      payload: {
        timestamp: new Date().toISOString(),
        cwd: '/home/user/projects/temp/codex-session-viewer/src',
      },
    })
    const details = deriveRepoDetailsFromLine(line)
    expect(details.repoLabel).toBe('codex-session-viewer')
  })

  it('supports nested source repository metadata', () => {
    const line = JSON.stringify({
      type: 'session_meta',
      timestamp: new Date().toISOString(),
      payload: {
        timestamp: new Date().toISOString(),
        source: {
          repository_url: 'https://gitlab.com/example/team/app.git',
        },
      },
    })
    const details = deriveRepoDetailsFromLine(line)
    expect(details.repoLabel).toBe('team/app')
  })

  it('treats numeric repo names as unknown', () => {
    const line = JSON.stringify({
      type: 'session_meta',
      timestamp: new Date().toISOString(),
      payload: {
        timestamp: new Date().toISOString(),
        repoLabel: '0123456789',
      },
    })
    const details = deriveRepoDetailsFromLine(line)
    expect(details.repoLabel).toBeUndefined()
  })
})
