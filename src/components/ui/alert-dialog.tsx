"use client"

import {
  Dialog as AlertDialog,
  DialogContent as BaseAlertDialogContent,
  DialogDescription as AlertDialogDescription,
  DialogFooter as AlertDialogFooter,
  DialogHeader as AlertDialogHeader,
  DialogTitle as AlertDialogTitle,
  DialogTrigger as AlertDialogTrigger,
  DialogClose,
} from "~/components/ui/dialog"

const AlertDialogContent = BaseAlertDialogContent
const AlertDialogAction = DialogClose
const AlertDialogCancel = DialogClose

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
}
