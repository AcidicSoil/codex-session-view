import { useEffect, useMemo, useState } from 'react'
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery'
import type { SessionRepoBindingRecord } from '~/server/persistence/sessionRepoBindings'
import { sessionRepoContext } from '~/server/function/sessionRepoContext'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Button } from '~/components/ui/button'
import { toast } from 'sonner'

interface SessionRepoSelectorProps {
  sessionId: string
  assets: DiscoveredSessionAsset[]
  repoContext: SessionRepoBindingRecord | null | undefined
  onRepoContextChange?: (context: SessionRepoBindingRecord | null) => Promise<void> | void
}

export function SessionRepoSelector({ sessionId, assets, repoContext, onRepoContextChange }: SessionRepoSelectorProps) {
  const [selectedPath, setSelectedPath] = useState<string>(() => {
    return repoContext?.assetPath ?? ''
  })
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (repoContext?.assetPath) {
      setSelectedPath(repoContext.assetPath)
    }
  }, [repoContext?.assetPath])

  const repoOptions = useMemo(() => {
    const groups = new Map<string, { value: string; label: string; description: string }>()
    for (const asset of assets) {
      const key = deriveRepoKey(asset)
      if (groups.has(key)) continue
      groups.set(key, {
        value: asset.path,
        label: asset.repoLabel ?? asset.repoName ?? asset.displayLabel,
        description: `${asset.branch ?? 'unknown'} • ${asset.source}`,
      })
    }
    return Array.from(groups.values())
  }, [assets])

  const handleBind = async () => {
    if (!selectedPath) {
      toast.error('Select a session file to bind before applying')
      return
    }
    setPending(true)
    try {
      const response = await sessionRepoContext({
        data: {
          action: 'set',
          sessionId,
          assetPath: selectedPath,
        },
      })
      if (response.status !== 'ok' || !response.repoContext) {
        toast.error(response.message ?? 'Unable to bind AGENT rules')
        return
      }
      toast.success('AGENT instructions bound', {
        description: truncatePath(response.repoContext.rootDir),
      })
      await onRepoContextChange?.(response.repoContext)
    } catch (error) {
      toast.error('Failed to bind AGENT rules', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setPending(false)
    }
  }

  const handleClear = async () => {
    setPending(true)
    try {
      const response = await sessionRepoContext({
        data: {
          action: 'clear',
          sessionId,
        },
      })
      if (response.status === 'cleared') {
        toast.message('AGENT binding cleared')
        await onRepoContextChange?.(null)
        setSelectedPath('')
        return
      }
      toast.error('Unable to clear AGENT binding')
    } catch (error) {
      toast.error('Failed to clear binding', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setPending(false)
    }
  }

  const boundAsset = useMemo(() => {
    if (!repoContext?.assetPath) return null
    return assets.find((asset) => asset.path === repoContext.assetPath) ?? null
  }, [assets, repoContext?.assetPath])

  const boundLabel = boundAsset?.repoLabel ?? boundAsset?.repoName ?? repoContext?.assetPath ?? 'Unbound'

  return (
    <div className="rounded-3xl border border-white/15 bg-background/80 p-5 shadow-inner">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Instruction Source</p>
            <p className="text-sm text-white">{repoContext ? truncatePath(repoContext.rootDir) : 'Select a session asset with repo metadata to enable Hookify.'}</p>
          </div>
          <span className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80">{boundLabel}</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={selectedPath} onValueChange={setSelectedPath}>
            <SelectTrigger className="w-full sm:flex-1" size="sm">
              <SelectValue placeholder="Choose repo" />
            </SelectTrigger>
            <SelectContent align="start">
              {repoOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-semibold">{option.label}</span>
                    <span className="text-xs opacity-70">{option.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-1 gap-2">
            <Button className="flex-1" onClick={() => void handleBind()} disabled={pending || !selectedPath}>
              {pending ? 'Binding…' : 'Bind rules'}
            </Button>
            {repoContext ? (
              <Button type="button" variant="ghost" onClick={() => void handleClear()} disabled={pending}>
                Clear
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function truncatePath(pathValue: string, maxLength = 48) {
  if (pathValue.length <= maxLength) return pathValue
  return `…${pathValue.slice(-maxLength)}`
}

function deriveRepoKey(asset: DiscoveredSessionAsset) {
  const base = asset.repoLabel ?? asset.repoName ?? asset.displayLabel
  return `${base ?? asset.path}-${asset.source}`
}
