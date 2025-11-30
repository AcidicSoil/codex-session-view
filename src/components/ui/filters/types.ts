import type { ReactNode } from 'react';

// Basic primitives for filter values
export type FilterValue = string | number | boolean | Date | null | undefined;

// Supported input types for the filter fields
export type FilterInputType =
  | 'text'
  | 'number'
  | 'select'
  | 'multi-select'
  | 'date'
  | 'date-range'
  | 'boolean';

// Configuration for a single field that can be filtered
export interface FilterFieldConfig<T = unknown> {
  id: string;
  label: string;
  type: FilterInputType;
  icon?: ReactNode;
  options?: { label: string; value: string | number }[]; // For select/multi-select
  operators?: string[]; // Limit specific operators for this field
  placeholder?: string;
  className?: string;
  // Validation or other field-specific metadata can go here
}

// The core Filter object structure
export interface Filter<T = unknown> {
  id: string;
  field: string;
  operator: string;
  values: T[];
}

// A group of filters (for saved views or complex queries)
export interface FilterGroup<T = unknown> {
  id: string;
  label: string;
  filters: Filter<T>[];
  fields: FilterFieldConfig<T>[]; // Fields available in this group
}

// Internationalization Configuration
export interface FilterI18nConfig {
  addFilter: string;
  searchFields: string;
  noFieldsFound: string;
  noResultsFound: string;
  select: string;
  true: string;
  false: string;
  min: string;
  max: string;
  to: string;
  typeAndPressEnter: string;
  selected: string;
  selectedCount: string;
  percent: string;
  defaultCurrency: string;
  defaultColor: string;
  addFilterTitle: string;
  operators: {
    is: string;
    isNot: string;
    contains: string;
    doesNotContain: string;
    startsWith: string;
    endsWith: string;
    gt: string;
    lt: string;
    gte: string;
    lte: string;
    between: string;
    isEmpty: string;
    isNotEmpty: string;
    // Add other operator labels as needed
    [key: string]: string;
  };
}