"use client"

import { Slot } from '@radix-ui/react-slot'
import {
  DismissButton,
  useOverlayTrigger,
  usePopover,
  usePreventScroll,
} from 'react-aria'
import { mergeProps, useResizeObserver } from '@react-aria/utils'
import type { Placement } from '@react-types/overlays'
import {
  createContext,
  forwardRef,
  useContext,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type Ref,
} from 'react'
import { useOverlayTriggerState } from 'react-stately'
import { createPortal } from 'react-dom'
import { tv } from 'tailwind-variants'

import { cn } from '~/lib/utils'

const PopoverContext = createContext<PopoverContextValue | null>(null)

type PopoverSide = 'top' | 'bottom' | 'left' | 'right'
type PopoverAlign = 'start' | 'center' | 'end'

interface PopoverContextValue {
  state: ReturnType<typeof useOverlayTriggerState>
  triggerRef: React.MutableRefObject<HTMLElement | null>
  triggerProps: ReturnType<typeof useOverlayTrigger>['triggerProps']
  modal: boolean
  placement: Placement
  offset: number
  sameWidth: boolean
  triggerWidth: number | null
}

const contentStyles = tv({
  base: cn(
    'z-50 rounded-2xl border border-white/10 bg-[#05060a]/95 p-0 text-sm text-white shadow-[0_40px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl outline-none',
    'data-[state=open]:animate-in data-[state=closed]:animate-out',
    'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
    'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95'
  ),
})

function usePopoverContext(component: string): PopoverContextValue {
  const context = useContext(PopoverContext)
  if (!context) {
    throw new Error(`${component} must be used within <Popover> parent`)
  }
  return context
}

export interface PopoverProps {
  children: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
  placement?: Placement
  offset?: number
  sameWidth?: boolean
}

export function Popover({
  children,
  open,
  defaultOpen,
  onOpenChange,
  modal = false,
  placement = 'bottom',
  offset = 8,
  sameWidth = false,
}: PopoverProps) {
  const state = useOverlayTriggerState({ isOpen: open, defaultOpen, onOpenChange })
  const triggerRef = useRef<HTMLElement | null>(null)
  const { triggerProps } = useOverlayTrigger({ type: 'dialog' }, state, triggerRef)
  const [triggerWidth, setTriggerWidth] = useState<number | null>(null)

  useResizeObserver({
    ref: triggerRef,
    onResize: () => {
      setTriggerWidth(triggerRef.current?.offsetWidth ?? null)
    },
  })

  const contextValue = useMemo<PopoverContextValue>(
    () => ({
      state,
      triggerRef,
      triggerProps,
      modal,
      placement,
      offset,
      sameWidth,
      triggerWidth,
    }),
    [state, triggerProps, modal, placement, offset, sameWidth, triggerWidth],
  )

  return <PopoverContext.Provider value={contextValue}>{children}</PopoverContext.Provider>
}

export interface PopoverTriggerProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean
}

export const PopoverTrigger = forwardRef<HTMLElement, PopoverTriggerProps>(
  ({ asChild = false, ...props }, forwardedRef) => {
    const context = usePopoverContext('PopoverTrigger')
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        {...mergeProps(props, context.triggerProps)}
        ref={mergeRefs(forwardedRef, context.triggerRef)}
        data-state={context.state.isOpen ? 'open' : 'closed'}
      />
    )
  },
)
PopoverTrigger.displayName = 'PopoverTrigger'

export interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: PopoverAlign
  side?: PopoverSide
  sideOffset?: number
  collisionPadding?: number
  showArrow?: boolean
}

export const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  (
    {
      className,
      align = 'center',
      side,
      sideOffset,
      collisionPadding = 12,
      showArrow = false,
      children,
      style,
      ...props
    },
    forwardedRef,
  ) => {
    const context = usePopoverContext('PopoverContent')
    const popoverRef = useRef<HTMLDivElement | null>(null)
    const arrowRef = useRef<HTMLDivElement | null>(null)
    const resolvedPlacement = side ? `${side}${align !== 'center' ? ` ${align}` : ''}` : context.placement
    const { popoverProps, underlayProps, arrowProps, placement } = usePopover(
      {
        popoverRef,
        arrowRef,
        triggerRef: context.triggerRef,
        placement: resolvedPlacement as Placement,
        offset: sideOffset ?? context.offset,
        isNonModal: !context.modal,
        shouldFlip: true,
        crossOffset: align === 'center' ? 0 : undefined,
        scrollRef: context.triggerRef,
        containerPadding: collisionPadding,
      },
      context.state,
    )

    usePreventScroll({ isDisabled: !context.modal || !context.state.isOpen })

    if (!context.state.isOpen) {
      return null
    }

    const contentStyle = {
      ...style,
      minWidth: context.sameWidth && context.triggerWidth ? context.triggerWidth : undefined,
    }

    const content = (
      <div
        {...mergeProps(popoverProps, props)}
        ref={mergeRefs(forwardedRef, popoverRef)}
        className={cn(contentStyles({}), className)}
        data-state={context.state.isOpen ? 'open' : 'closed'}
        data-placement={placement}
        style={contentStyle}
      >
        {showArrow ? (
          <div
            {...arrowProps}
            ref={arrowRef}
            className="pointer-events-none absolute h-3 w-3 rotate-45 border border-white/10 bg-[#05060a]/95"
          />
        ) : null}
        {children}
        <DismissButton onDismiss={context.state.close} />
      </div>
    )

    if (typeof document === 'undefined') {
      return content
    }

    const overlay = (
      <>
        {context.modal ? (
          <div
            {...underlayProps}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />
        ) : null}
        {content}
      </>
    )

    return createPortal(overlay, document.body)
  },
)
PopoverContent.displayName = 'PopoverContent'

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    refs.forEach((ref) => {
      if (!ref) return
      if (typeof ref === 'function') {
        ref(node)
      } else {
        ;(ref as MutableRefObject<T | null>).current = node
      }
    })
  }
}
