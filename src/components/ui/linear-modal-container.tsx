'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { cn } from '~/lib/utils';
import { useDialog } from './linear-modal.context';

type DialogContainerProps = {
  children: React.ReactNode;
  className?: string;
  overlayClassName?: string;
  style?: React.CSSProperties;
};

export function DialogContainer({
  children,
  className,
  overlayClassName,
}: DialogContainerProps) {
  const { isOpen, setIsOpen, uniqueId } = useDialog();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const drawerWrapper = document.querySelectorAll('[drawer-wrapper]');

    if (isOpen) {
      document.body.classList.add('overflow-hidden');
      drawerWrapper.forEach((wrapper) => wrapper?.classList.add('open'));
    } else {
      document.body.classList.remove('overflow-hidden');
      drawerWrapper.forEach((wrapper) => wrapper?.classList.remove('open'));
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    setMounted(true);
    return () => {
      setMounted(false);
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence initial={false} mode='wait'>
      {isOpen && (
        <>
          <motion.div
            key={`backdrop-${uniqueId}`}
            data-lenis-prevent
            className={cn(
              'fixed inset-0 h-full z-50 w-full backdrop-blur-xl dark:bg-[radial-gradient(125%_125%_at_50%_10%,#050505_40%,#243aff_100%)] bg-[radial-gradient(125%_125%_at_50%_10%,#ffffff_40%,#243aff_100%)]',
              overlayClassName
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.2,
              ease: [0.4, 0.0, 0.4, 1],
            }}
            onClick={() => setIsOpen(false)}
          ></motion.div>
          <motion.div
            className={cn('fixed inset-0 z-50 w-fit mx-auto', className)}
            style={{ willChange: 'transform' }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
