'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useDialog } from './linear-modal.context';

type DialogTitleProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export function DialogTitle({ children, className, style }: DialogTitleProps) {
  const { uniqueId } = useDialog();

  return (
    <motion.h1
      layoutId={`dialog-title-container-${uniqueId}`}
      className={className}
      style={style}
      layout
    >
      {children}
    </motion.h1>
  );
}
