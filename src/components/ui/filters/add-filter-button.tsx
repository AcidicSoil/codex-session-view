import React, { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { FilterFieldConfig } from './types';
import { useFilterContext } from './context';
import { Button } from '~/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command';
import { cn } from '~/lib/utils';

interface AddFilterButtonProps<T> {
  fields: FilterFieldConfig<T>[];
  activeFieldIds: string[];
  onSelectField: (fieldId: string) => void;
  className?: string;
}

export function AddFilterButton<T>({
  fields,
  activeFieldIds,
  onSelectField,
  className,
}: AddFilterButtonProps<T>) {
  const { i18n } = useFilterContext();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 border-dashed", className)}
        >
          <Plus className="mr-2 h-4 w-4" />
          {i18n.addFilter}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={i18n.searchFields} />
          <CommandList>
            <CommandEmpty>{i18n.noFieldsFound}</CommandEmpty>
            <CommandGroup heading={i18n.addFilterTitle}>
              {fields.map((field) => {
                const isSelected = activeFieldIds.includes(field.id);
                return (
                  <CommandItem
                    key={field.id}
                    onSelect={() => {
                      onSelectField(field.id);
                      setOpen(false);
                    }}
                  >
                    <div className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                    )}>
                      <Check className={cn("h-4 w-4")} />
                    </div>
                    {field.icon && <span className="mr-2">{field.icon}</span>}
                    <span>{field.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}