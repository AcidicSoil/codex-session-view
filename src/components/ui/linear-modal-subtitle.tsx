'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useDialog } from './linear-modal.context';

type DialogSubtitleProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export function DialogSubtitle({ children, className, style }: DialogSubtitleProps) {
  const { uniqueId } = useDialog();

  return (
    <motion.div
      layoutId={`dialog-subtitle-container-${uniqueId}`}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}
