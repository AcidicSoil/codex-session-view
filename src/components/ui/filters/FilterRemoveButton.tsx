import { X } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '~/lib/utils';
import { useFilterContext } from './FilterContext';
import { filterRemoveButtonVariants } from './variants';

export interface FilterRemoveButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
}

export function FilterRemoveButton({ className, icon = <X />, ...props }: FilterRemoveButtonProps) {
  const context = useFilterContext();

  return (
    <button
      data-slot="filters-remove"
      className={cn(
        filterRemoveButtonVariants({
          variant: context.variant,
          size: context.size,
          cursorPointer: context.cursorPointer,
          radius: context.radius,
        }),
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
