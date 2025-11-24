import { parseSessionMetaLine } from '~/lib/session-parser/validators'
const line = JSON.stringify({ type: 'session_meta', timestamp: new Date().toISOString(), payload: { repository_url: 'https://github.com/owner/sample-repo.git', cwd: '/tmp/random/path' } })
const result = parseSessionMetaLine(line)
console.log(result)
