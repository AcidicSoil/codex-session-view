'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '~/lib/utils';
import { useDialog } from './linear-modal.context';

type DialogContentProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export function DialogContent({ children, className, style }: DialogContentProps) {
  const { setIsOpen, isOpen, uniqueId, triggerRef } = useDialog();
  const containerRef = useRef<HTMLDivElement>(null);
  const [firstFocusableElement, setFirstFocusableElement] =
    useState<HTMLElement | null>(null);
  const [lastFocusableElement, setLastFocusableElement] =
    useState<HTMLElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
      if (event.key === 'Tab') {
        if (!firstFocusableElement || !lastFocusableElement) return;

        if (event.shiftKey) {
          if (document.activeElement === firstFocusableElement) {
            event.preventDefault();
            lastFocusableElement.focus();
          }
        } else {
          if (document.activeElement === lastFocusableElement) {
            event.preventDefault();
            firstFocusableElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [setIsOpen, firstFocusableElement, lastFocusableElement]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';

      const focusableElements = containerRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements && focusableElements.length > 0) {
        setFirstFocusableElement(focusableElements[0] as HTMLElement);
        setLastFocusableElement(
          focusableElements[focusableElements.length - 1] as HTMLElement
        );
        requestAnimationFrame(() => {
          (focusableElements[0] as HTMLElement).focus();
        });
      }

      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    } else {
      document.body.style.overflow = '';
      triggerRef.current?.focus();
    }
  }, [isOpen, triggerRef]);

  return (
    <motion.div
      ref={containerRef}
      layoutId={`dialog-${uniqueId}`}
      className={cn('overflow-hidden', className)}
      style={{
        ...style,
        willChange: 'transform, opacity',
      }}
      role='dialog'
      aria-modal='true'
      aria-labelledby={`dialog-title-${uniqueId}`}
      aria-describedby={`dialog-description-${uniqueId}`}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{
        type: 'spring',
        damping: 25,
        stiffness: 300,
        mass: 0.8,
      }}
    >
      {children}
    </motion.div>
  );
}
