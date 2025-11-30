import { Filter, FilterFieldConfig, FilterGroup } from './types';
import { OPERATORS_BY_TYPE } from './constants';

/**
 * Creates a new filter object with a unique ID.
 */
export const createFilter = <T = unknown>(
  field: string,
  operator?: string,
  values: T[] = []
): Filter<T> => ({
  id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
  field,
  operator: operator || 'is',
  values,
});

/**
 * Creates a standard filter group structure.
 */
export const createFilterGroup = <T = unknown>(
  id: string,
  label: string,
  fields: FilterFieldConfig<T>[],
  initialFilters: Filter<T>[] = []
): FilterGroup<T> => ({
  id,
  label,
  filters: initialFilters,
  fields,
});

/**
 * Determines the default operator for a given field type.
 */
export const getDefaultOperator = (inputType: string): string => {
  const ops = OPERATORS_BY_TYPE[inputType];
  return ops && ops.length > 0 ? ops[0] : 'is';
};