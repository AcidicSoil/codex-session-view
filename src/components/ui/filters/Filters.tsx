'use client';

import { Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
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
import { FilterContextProvider } from './FilterContext';
import { FilterOperatorDropdown } from './FilterOperatorDropdown';
import { FilterRemoveButton } from './FilterRemoveButton';
import { FilterValueSelector } from './FilterValueSelector';
import { SelectOptionsPopover } from './SelectOptionsPopover';
import { mergeI18nConfig } from './i18n';
import {
  createFilter,
  flattenFields,
  getFieldsMap,
  isFieldGroup,
  isGroupLevelField,
} from './filter-utils';
import type { Filter, FilterFieldConfig, FiltersProps } from './types';
import { filterAddButtonVariants, filterFieldLabelVariants, filterItemVariants, filtersContainerVariants } from './variants';

export function Filters<T = unknown>({
  filters,
  fields,
  onChange,
  className,
  showAddButton = true,
  addButtonText,
  addButtonIcon,
  addButtonClassName,
  addButton,
  variant = 'outline',
  size = 'md',
  radius = 'md',
  i18n,
  showSearchInput = true,
  cursorPointer = true,
  trigger,
  allowMultiple = true,
  popoverContentClassName,
}: FiltersProps<T>) {
  const [addFilterOpen, setAddFilterOpen] = useState(false);
  const [selectedFieldForOptions, setSelectedFieldForOptions] = useState<FilterFieldConfig<T> | null>(null);
  const [tempSelectedValues, setTempSelectedValues] = useState<unknown[]>([]);

  const mergedI18n = mergeI18nConfig(i18n);
  const fieldsMap = useMemo(() => getFieldsMap(fields), [fields]);

  const updateFilter = useCallback(
    (filterId: string, updates: Partial<Filter<T>>) => {
      onChange(
        filters.map((filter) => {
          if (filter.id === filterId) {
            const updatedFilter = { ...filter, ...updates };
            if (updates.operator === 'empty' || updates.operator === 'not_empty') {
              updatedFilter.values = [] as T[];
            }
            return updatedFilter;
          }
          return filter;
        }),
      );
    },
    [filters, onChange],
  );

  const removeFilter = useCallback(
    (filterId: string) => {
      onChange(filters.filter((filter) => filter.id !== filterId));
    },
    [filters, onChange],
  );

  const addFilter = useCallback(
    (fieldKey: string) => {
      const field = fieldsMap[fieldKey];
      if (!field || !field.key) return;

      if (field.type === 'select' || field.type === 'multiselect') {
        setSelectedFieldForOptions(field);
        const existingFilter = filters.find((f) => f.field === fieldKey);
        const initialValues = field.type === 'multiselect' && existingFilter ? existingFilter.values : [];
        setTempSelectedValues(initialValues);
        return;
      }

      const defaultOperator =
        field.defaultOperator ||
        (field.type === 'daterange'
          ? 'between'
          : field.type === 'numberrange'
            ? 'between'
            : field.type === 'boolean'
              ? 'is'
              : 'is');
      let defaultValues: unknown[] = [];

      if (['text', 'number', 'date', 'email', 'url', 'tel', 'time', 'datetime'].includes(field.type || '')) {
        defaultValues = [''];
      } else if (field.type === 'daterange') {
        defaultValues = ['', ''];
      } else if (field.type === 'numberrange') {
        defaultValues = [field.min || 0, field.max || 100];
      } else if (field.type === 'boolean') {
        defaultValues = [false];
      } else if (field.type === 'time') {
        defaultValues = [''];
      } else if (field.type === 'datetime') {
        defaultValues = [''];
      }

      const newFilter = createFilter<T>(fieldKey, defaultOperator, defaultValues as T[]);
      onChange([...filters, newFilter]);
      setAddFilterOpen(false);
    },
    [fieldsMap, filters, onChange],
  );

  const addFilterWithOption = useCallback(
    (field: FilterFieldConfig<T>, values: unknown[], closePopover: boolean = true) => {
      if (!field.key) return;
      const defaultOperator = field.defaultOperator || (field.type === 'multiselect' ? 'is_any_of' : 'is');
      const existingFilterIndex = filters.findIndex((f) => f.field === field.key);

      if (existingFilterIndex >= 0) {
        const updatedFilters = [...filters];
        updatedFilters[existingFilterIndex] = {
          ...updatedFilters[existingFilterIndex],
          values: values as T[],
        };
        onChange(updatedFilters);
      } else {
        const newFilter = createFilter<T>(field.key, defaultOperator, values as T[]);
        onChange([...filters, newFilter]);
      }

      if (closePopover) {
        setAddFilterOpen(false);
        setSelectedFieldForOptions(null);
        setTempSelectedValues([]);
      } else {
        setTempSelectedValues(values as unknown[]);
      }
    },
    [filters, onChange],
  );

  const selectableFields = useMemo(() => {
    const flatFields = flattenFields(fields);
    return flatFields.filter((field) => {
      if (!field.key || field.type === 'separator') {
        return false;
      }
      if (allowMultiple) {
        return true;
      }
      return !filters.some((filter) => filter.field === field.key);
    });
  }, [fields, filters, allowMultiple]);

  return (
    <FilterContextProvider
      value={{
        variant,
        size,
        radius,
        i18n: mergedI18n,
        cursorPointer,
        className,
        showAddButton,
        addButtonText,
        addButtonIcon,
        addButtonClassName,
        addButton,
        showSearchInput,
        trigger,
        allowMultiple,
      }}
    >
      <div className={cn(filtersContainerVariants({ variant, size }), className)}>
        {showAddButton && selectableFields.length > 0 && (
          <Popover
            open={addFilterOpen}
            onOpenChange={(open) => {
              setAddFilterOpen(open);
              if (!open) {
                setSelectedFieldForOptions(null);
                setTempSelectedValues([]);
              }
            }}
          >
            <PopoverTrigger asChild>
              {addButton ? (
                addButton
              ) : (
                <button
                  className={cn(
                    filterAddButtonVariants({
                      variant,
                      size,
                      cursorPointer,
                      radius,
                    }),
                    addButtonClassName,
                  )}
                  title={mergedI18n.addFilterTitle}
                >
                  {addButtonIcon || <Plus />}
                  {addButtonText || mergedI18n.addFilter}
                </button>
              )}
            </PopoverTrigger>
            <PopoverContent className={cn('w-[200px] p-0', popoverContentClassName)} align="start">
              <Command>
                {selectedFieldForOptions ? (
                  <SelectOptionsPopover<T>
                    field={selectedFieldForOptions}
                    values={tempSelectedValues as T[]}
                    onChange={(values) => {
                      const shouldClosePopover = selectedFieldForOptions.type === 'select';
                      addFilterWithOption(selectedFieldForOptions, values as unknown[], shouldClosePopover);
                    }}
                    onClose={() => setAddFilterOpen(false)}
                    inline
                  />
                ) : (
                  <>
                    {showSearchInput && <CommandInput placeholder={mergedI18n.searchFields} className="h-9" />}
                    <CommandList>
                      <CommandEmpty>{mergedI18n.noFieldsFound}</CommandEmpty>
                      {fields.map((item, index) => {
                        if (isFieldGroup(item)) {
                          const groupFields = item.fields.filter((field) => {
                            if (field.type === 'separator') {
                              return true;
                            }
                            if (allowMultiple) {
                              return true;
                            }
                            return !filters.some((filter) => filter.field === field.key);
                          });

                          if (groupFields.length === 0) return null;

                          return (
                            <CommandGroup key={`group-${index}`} heading={item.group || 'Fields'}>
                              {groupFields.map((field, fieldIndex) => {
                                if (field.type === 'separator') {
                                  return <CommandSeparator key={`separator-${fieldIndex}`} />;
                                }

                                return (
                                  <CommandItem key={field.key} onSelect={() => field.key && addFilter(field.key)}>
                                    {field.icon}
                                    <span>{field.label}</span>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          );
                        }

                        if (isGroupLevelField(item)) {
                          const groupFields = item.fields!.filter((field) => {
                            if (field.type === 'separator') {
                              return true;
                            }
                            if (allowMultiple) {
                              return true;
                            }
                            return !filters.some((filter) => filter.field === field.key);
                          });

                          if (groupFields.length === 0) return null;

                          return (
                            <CommandGroup key={`group-${index}`} heading={item.group || 'Fields'}>
                              {groupFields.map((field, fieldIndex) => {
                                if (field.type === 'separator') {
                                  return <CommandSeparator key={`separator-${fieldIndex}`} />;
                                }

                                return (
                                  <CommandItem key={field.key} onSelect={() => field.key && addFilter(field.key)}>
                                    {field.icon}
                                    <span>{field.label}</span>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          );
                        }

                        const field = item as FilterFieldConfig<T>;

                        if (field.type === 'separator') {
                          return <CommandSeparator key={`separator-${index}`} />;
                        }

                        return (
                          <CommandItem key={field.key} onSelect={() => field.key && addFilter(field.key)}>
                            {field.icon}
                            <span>{field.label}</span>
                          </CommandItem>
                        );
                      })}
                    </CommandList>
                  </>
                )}
              </Command>
            </PopoverContent>
          </Popover>
        )}

        {filters.map((filter) => {
          const field = fieldsMap[filter.field];
          if (!field) return null;

          return (
            <div key={filter.id} className={filterItemVariants({ variant })} data-slot="filter-item">
              <div className={filterFieldLabelVariants({ variant, size, radius })}>
                {field.icon}
                {field.label}
              </div>
              <FilterOperatorDropdown<T>
                field={field}
                operator={filter.operator}
                values={filter.values}
                onChange={(operator) => updateFilter(filter.id, { operator })}
              />
              <FilterValueSelector<T>
                field={field}
                values={filter.values}
                onChange={(values) => updateFilter(filter.id, { values })}
                operator={filter.operator}
              />
              <FilterRemoveButton onClick={() => removeFilter(filter.id)} />
            </div>
          );
        })}
      </div>
    </FilterContextProvider>
  );
}
