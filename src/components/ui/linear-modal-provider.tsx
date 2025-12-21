'use client';

import React, { useId, useMemo, useRef, useState } from 'react';
import { MotionConfig, type Transition } from 'motion/react';
import { DialogContext, type DialogContextType } from './linear-modal.context';

type DialogProviderProps = {
  children: React.ReactNode;
  transition?: Transition;
};

export function DialogProvider({ children, transition }: DialogProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const uniqueId = useId();
  const triggerRef = useRef<HTMLDivElement>(null);

  const contextValue: DialogContextType = useMemo(
    () => ({ isOpen, setIsOpen, uniqueId, triggerRef }),
    [isOpen, uniqueId]
  );

  return (
    <DialogContext.Provider value={contextValue}>
      <MotionConfig transition={transition}>{children}</MotionConfig>
    </DialogContext.Provider>
  );
}
