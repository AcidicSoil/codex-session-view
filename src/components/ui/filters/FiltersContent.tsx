import { useCallback, useMemo } from 'react';
import { cn } from '~/lib/utils';
import { useFilterContext } from './FilterContext';
import { FilterOperatorDropdown } from './FilterOperatorDropdown';
import { FilterRemoveButton } from './FilterRemoveButton';
import { FilterValueSelector } from './FilterValueSelector';
import { getFieldsMap } from './filter-utils';
import type { Filter, FiltersContentProps } from './types';
import { filterFieldLabelVariants, filterItemVariants, filtersContainerVariants } from './variants';

export const FiltersContent = <T,>({ filters, fields, onChange }: FiltersContentProps<T>) => {
  const context = useFilterContext();
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

  return (
    <div className={cn(filtersContainerVariants({ variant: context.variant, size: context.size }), context.className)}>
      {filters.map((filter) => {
        const field = fieldsMap[filter.field];
        if (!field) return null;

        return (
          <div key={filter.id} className={filterItemVariants({ variant: context.variant })} data-slot="filter-item">
            <div
              className={filterFieldLabelVariants({
                variant: context.variant,
                size: context.size,
                radius: context.radius,
              })}
            >
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
  );
};
