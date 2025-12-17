import { useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group'

interface ConversationSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function ConversationSearch({ value, onChange, placeholder = 'Search conversations…' }: ConversationSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && !e.shiftKey && document.activeElement !== inputRef.current) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <InputGroup>
      <InputGroupAddon>
        <Search className="size-4" />
      </InputGroupAddon>
      <InputGroupInput
        aria-label="Search conversations"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onChange('')
            inputRef.current?.blur()
          }
        }}
        placeholder={placeholder}
        ref={inputRef}
        type="search"
        value={value}
      />
    </InputGroup>
  )
}

export default ConversationSearch
