import React, { useCallback } from 'react';
import { Filter, FilterFieldConfig, FilterI18nConfig } from './types';
import { FilterProvider } from './context';
import { AddFilterButton } from './add-filter-button';
import { FilterItem } from './filter-item';
import { createFilter, getDefaultOperator } from './utils';
import { cn } from '~/lib/utils';

export * from './types';
export * from './utils';
export * from './context';

interface FilterBuilderProps<T = unknown> {
  fields: FilterFieldConfig<T>[];
  filters: Filter<T>[];
  onFiltersChange: (filters: Filter<T>[]) => void;
  i18n?: Partial<FilterI18nConfig>;
  className?: string;
  maxFilters?: number;
}

export function FilterBuilder<T = unknown>({
  fields,
  filters,
  onFiltersChange,
  i18n,
  className,
  maxFilters,
}: FilterBuilderProps<T>) {
  // --- Handlers ---

  const handleAddFilter = useCallback((fieldId: string) => {
    if (maxFilters && filters.length >= maxFilters) return;

    const fieldConfig = fields.find((f) => f.id === fieldId);
    if (!fieldConfig) return;

    const defaultOperator = getDefaultOperator(fieldConfig.type);
    const newFilter = createFilter<T>(fieldId, defaultOperator);

    onFiltersChange([...filters, newFilter]);
  }, [fields, filters, maxFilters, onFiltersChange]);

  const handleUpdateFilter = useCallback((id: string, updates: Partial<Filter<T>>) => {
    const updatedFilters = filters.map((f) =>
      f.id === id ? { ...f, ...updates } : f
    );
    onFiltersChange(updatedFilters);
  }, [filters, onFiltersChange]);

  const handleRemoveFilter = useCallback((id: string) => {
    onFiltersChange(filters.filter((f) => f.id !== id));
  }, [filters, onFiltersChange]);

  return (
    <FilterProvider i18n={i18n}>
      <div className={cn("flex flex-col space-y-4", className)}>
        {/* Active Filters List */}
        {filters.length > 0 && (
          <div className="flex flex-col gap-2">
            {filters.map((filter) => {
              const field = fields.find((f) => f.field === filter.field || f.id === filter.field);
              if (!field) return null; // Graceful fallback if field config is missing

              return (
                <FilterItem<T>
                  key={filter.id}
                  filter={filter}
                  field={field}
                  onUpdate={(updates) => handleUpdateFilter(filter.id, updates)}
                  onRemove={() => handleRemoveFilter(filter.id)}
                />
              );
            })}
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center space-x-2">
          <AddFilterButton
            fields={fields}
            activeFieldIds={filters.map((f) => f.field)}
            onSelectField={handleAddFilter}
          />
        </div>
      </div>
    </FilterProvider>
  );
}