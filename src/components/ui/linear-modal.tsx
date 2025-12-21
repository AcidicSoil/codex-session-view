'use client';

import React from 'react';
import { MotionConfig, type Transition } from 'motion/react';
import { DialogProvider } from './linear-modal-provider';

export type DialogProps = {
  children: React.ReactNode;
  transition?: Transition;
};

export function Dialog({ children, transition }: DialogProps) {
  return (
    <DialogProvider>
      <MotionConfig transition={transition}>{children}</MotionConfig>
    </DialogProvider>
  );
}

export { DialogTrigger } from './linear-modal-trigger';
export { DialogContainer } from './linear-modal-container';
export { DialogContent } from './linear-modal-content';
export { DialogClose } from './linear-modal-close';
export { DialogTitle } from './linear-modal-title';
export { DialogSubtitle } from './linear-modal-subtitle';
export { DialogDescription } from './linear-modal-description';
export { DialogImage } from './linear-modal-image';
