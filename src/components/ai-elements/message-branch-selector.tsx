"use client";

import type { HTMLAttributes } from "react";
import type { UIMessage } from "ai";
import { ButtonGroup } from "~/components/ui/button-group";
import { cn } from "~/lib/utils";
import { useMessageBranch } from "./message-branch-context";

export type MessageBranchSelectorProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export const MessageBranchSelector = ({
  className,
  from,
  ...props
}: MessageBranchSelectorProps) => {
  const { totalBranches } = useMessageBranch();

  if (totalBranches <= 1) {
    return null;
  }

  return (
    <ButtonGroup
      aria-label={`Message branch controls for ${from}`}
      className={cn(
        "[&>*:not(:first-child)]:rounded-l-md [&>*:not(:last-child)]:rounded-r-md",
        className
      )}
      orientation="horizontal"
      {...props}
    />
  );
};
