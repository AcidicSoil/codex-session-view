"use client"

import { useControllableState } from '@radix-ui/react-use-controllable-state'
import type { HTMLAttributes } from 'react'
import { createContext, useContext } from 'react'
import { cn } from '~/lib/utils'

export type CodeBlockData = {
  language: string
  filename: string
  code: string
}

export type CodeBlockContextValue = {
  value: string | undefined
  onValueChange: ((value: string) => void) | undefined
  data: CodeBlockData[]
}

const CodeBlockContext = createContext<CodeBlockContextValue>({
  value: undefined,
  onValueChange: undefined,
  data: [],
})

export const useCodeBlockContext = () => useContext(CodeBlockContext)

export type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  data: CodeBlockData[]
}

export const CodeBlock = ({
  value: controlledValue,
  onValueChange: controlledOnValueChange,
  defaultValue,
  className,
  data,
  ...props
}: CodeBlockProps) => {
  const [value, onValueChange] = useControllableState({
    defaultProp: defaultValue ?? '',
    prop: controlledValue,
    onChange: controlledOnValueChange,
  })

  return (
    <CodeBlockContext.Provider value={{ value, onValueChange, data }}>
      <div className={cn('size-full overflow-hidden rounded-md border', className)} {...props} />
    </CodeBlockContext.Provider>
  )
}
