import { useState } from 'react';
import { Check } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '~/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { cn } from '~/lib/utils';
import { useFilterContext } from './FilterContext';
import type { FilterFieldConfig } from './types';
import { filterFieldValueVariants } from './variants';

interface FallbackOptionsPopoverProps<T = unknown> {
  field: FilterFieldConfig<T>;
  values: T[];
  onChange: (values: T[]) => void;
}

export function FallbackOptionsPopover<T = unknown>({ field, values, onChange }: FallbackOptionsPopoverProps<T>) {
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const context = useFilterContext();

  const isMultiSelect = values.length > 1;
  const selectedOptions = field.options?.filter((opt) => values.includes(opt.value)) || [];
  const unselectedOptions = field.options?.filter((opt) => !values.includes(opt.value)) || [];

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setTimeout(() => setSearchInput(''), 200);
        }
      }}
    >
      <PopoverTrigger
        className={filterFieldValueVariants({
          variant: context.variant,
          size: context.size,
          cursorPointer: context.cursorPointer,
        })}
      >
        <div className="flex gap-1.5 items-center">
          {field.customValueRenderer ? (
            field.customValueRenderer(values, field.options || [])
          ) : (
            <>
              {selectedOptions.length > 0 && (
                <div className="flex items-center -space-x-1.5">
                  {selectedOptions.slice(0, 3).map((option) => (
                    <div key={String(option.value)}>{option.icon}</div>
                  ))}
                </div>
              )}
              {selectedOptions.length === 1
                ? selectedOptions[0].label
                : selectedOptions.length > 1
                  ? `${selectedOptions.length} ${context.i18n.selectedCount}`
                  : context.i18n.select}
            </>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className={cn('w-36 p-0', field.popoverContentClassName)}>
        <Command>
          {field.searchable !== false && (
            <CommandInput
              placeholder={context.i18n.placeholders.searchField(field.label || '')}
              className="h-9 text-sm"
              value={searchInput}
              onValueChange={setSearchInput}
            />
          )}
          <CommandList>
            <CommandEmpty>{context.i18n.noResultsFound}</CommandEmpty>
            {selectedOptions.length > 0 && (
              <CommandGroup>
                {selectedOptions.map((option) => (
                  <CommandItem
                    key={String(option.value)}
                    className="group flex gap-2 items-center"
                    onSelect={() => {
                      if (isMultiSelect) {
                        onChange(values.filter((v) => v !== option.value) as T[]);
                      } else {
                        onChange([] as T[]);
                      }
                      if (!isMultiSelect) {
                        setOpen(false);
                      }
                    }}
                  >
                    {option.icon}
                    <span className="text-accent-foreground truncate">{option.label}</span>
                    <Check className="text-primary ms-auto" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {unselectedOptions.length > 0 && (
              <>
                {selectedOptions.length > 0 && <CommandSeparator />}
                <CommandGroup>
                  {unselectedOptions.map((option) => (
                    <CommandItem
                      key={String(option.value)}
                      className="group flex gap-2 items-center"
                      value={option.label}
                      onSelect={() => {
                        if (isMultiSelect) {
                          const newValues = [...values, option.value] as T[];
                          if (field.maxSelections && newValues.length > field.maxSelections) {
                            return;
                          }
                          onChange(newValues);
                        } else {
                          onChange([option.value] as T[]);
                          setOpen(false);
                        }
                      }}
                    >
                      {option.icon}
                      <span className="text-accent-foreground truncate">{option.label}</span>
                      <Check className="text-primary ms-auto opacity-0" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
