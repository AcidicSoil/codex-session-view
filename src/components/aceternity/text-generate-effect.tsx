'use client';

import { motion } from 'motion/react'
import { cn } from '~/lib/utils'

export interface TextGenerateEffectProps {
  text: string
  className?: string
  wordClassName?: string
  stagger?: number
  as?: keyof JSX.IntrinsicElements
  once?: boolean
}

/**
 * Lightweight recreation of Aceternity's text-generate effect. Text is split
 * into words and animated with a subtle vertical reveal so we can reuse it
 * across hero copy or any auxiliary messaging outside the core surfaces.
 */
export function TextGenerateEffect({
  text,
  className,
  wordClassName,
  stagger = 0.05,
  as = 'p',
  once = true,
}: TextGenerateEffectProps) {
  const tokens = text.split(/(\s+)/)
  const Wrapper = as as keyof JSX.IntrinsicElements
  return (
    <Wrapper className={cn('relative flex flex-wrap text-left leading-relaxed', className)}>
      {tokens.map((token, index) => {
        const isWhitespace = /^\s+$/.test(token)
        if (isWhitespace) {
          return (
            <span key={`space-${index}`} className="whitespace-pre">
              {token}
            </span>
          )
        }
        return (
          <motion.span
            key={`${token}-${index}`}
            className={cn('inline-block opacity-80 [text-shadow:0_6px_32px_rgba(15,23,42,0.35)]', wordClassName)}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once }}
            transition={{ delay: index * stagger, duration: 0.5, ease: 'easeOut' }}
          >
            {token}
          </motion.span>
        )
      })}
    </Wrapper>
  )
}
