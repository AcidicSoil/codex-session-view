"use client";

import type { ComponentProps } from "react";
import { HoverCardContent } from "~/components/ui/hover-card";
import { cn } from "~/lib/utils";

export type ContextContentProps = ComponentProps<typeof HoverCardContent>;

export const ContextContent = ({ className, ...props }: ContextContentProps) => (
  <HoverCardContent
    className={cn("min-w-60 divide-y overflow-hidden p-0", className)}
    {...props}
  />
);
