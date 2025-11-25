'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '~/lib/utils';

function TooltipProvider({ delayDuration = 0, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />;
}

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 12,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <AnimatePresence>
        <TooltipPrimitive.Content forceMount sideOffset={sideOffset} asChild data-slot="tooltip-content" {...props}>
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'relative z-50 w-fit min-w-[160px] rounded-2xl border border-white/20 bg-gradient-to-br from-white/90 via-white/70 to-white/20 px-4 py-2 text-xs font-medium text-slate-900 shadow-[0px_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl dark:from-slate-900/95 dark:via-slate-900/70 dark:to-slate-800/60 dark:text-white',
              'before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.6),transparent_70%)] before:opacity-70',
              className,
            )}
          >
            <div className="relative z-10 space-y-1 text-balance">{children}</div>
            <TooltipPrimitive.Arrow className="fill-white/80 dark:fill-slate-900/80 drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]" />
          </motion.div>
        </TooltipPrimitive.Content>
      </AnimatePresence>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
