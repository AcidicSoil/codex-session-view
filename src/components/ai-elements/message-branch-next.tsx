"use client";

import type { ComponentProps } from "react";
import { ChevronRightIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useMessageBranch } from "./message-branch-context";

export type MessageBranchNextProps = ComponentProps<typeof Button>;

export const MessageBranchNext = ({
  children,
  className,
  ...props
}: MessageBranchNextProps) => {
  const { goToNext, totalBranches } = useMessageBranch();

  return (
    <Button
      aria-label="Next branch"
      disabled={totalBranches <= 1}
      onClick={goToNext}
      size="icon-sm"
      type="button"
      variant="ghost"
      className={className}
      {...props}
    >
      {children ?? <ChevronRightIcon size={14} />}
    </Button>
  );
};
