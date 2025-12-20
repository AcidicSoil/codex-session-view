import type { ReactNode } from "react"
import clsx from "clsx"

interface FamilyDrawerHeaderProps {
  icon: ReactNode
  title: string
  description: string
  className?: string
}

export function FamilyDrawerHeader({
  icon,
  title,
  description,
  className,
}: FamilyDrawerHeaderProps) {
  return (
    <header className={clsx("mt-[21px]", className)}>
      {icon}
      <h2 className="mt-2.5 text-[22px] font-semibold text-foreground md:font-medium">
        {title}
      </h2>
      <p className="mt-3 text-[17px] font-medium leading-[24px] text-muted-foreground md:font-normal">
        {description}
      </p>
    </header>
  )
}
