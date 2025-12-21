'use client';

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '~/lib/utils';
import { useDialog } from './linear-modal.context';

type DialogImageProps = {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
};

export function DialogImage({ src, alt, className, style }: DialogImageProps) {
  const { uniqueId } = useDialog();

  return (
    <motion.img
      src={src}
      alt={alt}
      className={cn(className)}
      layoutId={`dialog-img-${uniqueId}`}
      style={style}
    />
  );
}
