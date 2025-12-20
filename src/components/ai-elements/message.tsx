"use client";

import type { HTMLAttributes } from "react";
import { cn } from "~/lib/utils";
import type { UIMessage } from "ai";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      "group flex w-full max-w-[80%] flex-col gap-2",
      from === "user" ? "is-user ml-auto justify-end" : "is-assistant",
      className
    )}
    {...props}
  />
);

export { MessageContent } from "./message-content";
export type { MessageContentProps } from "./message-content";
export { MessageActions } from "./message-actions";
export type { MessageActionsProps } from "./message-actions";
export { MessageAction } from "./message-action";
export type { MessageActionProps } from "./message-action";
export { MessageBranch } from "./message-branch";
export type { MessageBranchProps } from "./message-branch";
export { MessageBranchContent } from "./message-branch-content";
export type { MessageBranchContentProps } from "./message-branch-content";
export { MessageBranchSelector } from "./message-branch-selector";
export type { MessageBranchSelectorProps } from "./message-branch-selector";
export { MessageBranchPrevious } from "./message-branch-previous";
export type { MessageBranchPreviousProps } from "./message-branch-previous";
export { MessageBranchNext } from "./message-branch-next";
export type { MessageBranchNextProps } from "./message-branch-next";
export { MessageBranchPage } from "./message-branch-page";
export type { MessageBranchPageProps } from "./message-branch-page";
export { MessageResponse } from "./message-response";
export type { MessageResponseProps } from "./message-response";
export { MessageAttachment } from "./message-attachment";
export type { MessageAttachmentProps } from "./message-attachment";
export { MessageAttachments } from "./message-attachments";
export type { MessageAttachmentsProps } from "./message-attachments";
export { MessageToolbar } from "./message-toolbar";
export type { MessageToolbarProps } from "./message-toolbar";
