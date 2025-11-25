'use client';

import * as React from 'react';
import {
  PanelGroup,
  Panel,
  PanelResizeHandle,
  type PanelGroupProps,
  type PanelProps,
  type PanelResizeHandleProps,
} from 'react-resizable-panels';
import { cn } from '~/lib/utils';

const ResizablePanelGroup = React.forwardRef<HTMLDivElement, PanelGroupProps>(({ className, ...props }, ref) => (
  <PanelGroup ref={ref} className={cn('flex w-full', className)} {...props} />
));
ResizablePanelGroup.displayName = 'ResizablePanelGroup';

const ResizablePanel = Panel;

const ResizableHandle = React.forwardRef<HTMLDivElement, PanelResizeHandleProps>(
  ({ className, ...props }, ref) => (
    <PanelResizeHandle
      ref={ref}
      className={cn(
        'flex w-1 items-center justify-center bg-transparent transition hover:bg-border data-[resize-handle-active=true]:bg-border',
        className,
      )}
      {...props}
    />
  ),
);
ResizableHandle.displayName = 'ResizableHandle';

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
