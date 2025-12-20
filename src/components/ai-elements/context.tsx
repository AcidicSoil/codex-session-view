"use client";

import type { ComponentProps } from "react";
import { HoverCard } from "~/components/ui/hover-card";
import type { ContextSchema } from "./context.shared";
import { ContextContext } from "./context.shared";

export type ContextProps = ComponentProps<typeof HoverCard> & ContextSchema;

export const Context = ({
  usedTokens,
  maxTokens,
  usage,
  modelId,
  ...props
}: ContextProps) => (
  <ContextContext.Provider
    value={{
      usedTokens,
      maxTokens,
      usage,
      modelId,
    }}
  >
    <HoverCard closeDelay={0} openDelay={0} {...props} />
  </ContextContext.Provider>
);

export { ContextTrigger } from "./context-trigger";
export type { ContextTriggerProps } from "./context-trigger";
export { ContextContent } from "./context-content";
export type { ContextContentProps } from "./context-content";
export { ContextContentHeader } from "./context-content-header";
export type { ContextContentHeaderProps } from "./context-content-header";
export { ContextContentBody } from "./context-content-body";
export type { ContextContentBodyProps } from "./context-content-body";
export { ContextContentFooter } from "./context-content-footer";
export type { ContextContentFooterProps } from "./context-content-footer";
export { ContextInputUsage } from "./context-input-usage";
export type { ContextInputUsageProps } from "./context-input-usage";
export { ContextOutputUsage } from "./context-output-usage";
export type { ContextOutputUsageProps } from "./context-output-usage";
export { ContextReasoningUsage } from "./context-reasoning-usage";
export type { ContextReasoningUsageProps } from "./context-reasoning-usage";
export { ContextCacheUsage } from "./context-cache-usage";
export type { ContextCacheUsageProps } from "./context-cache-usage";
