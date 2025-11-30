import { FilterI18nConfig } from './types';

export const DEFAULT_I18N: FilterI18nConfig = {
  addFilter: 'Add Filter',
  searchFields: 'Search fields...',
  noFieldsFound: 'No fields found.',
  noResultsFound: 'No results found.',
  select: 'Select...',
  true: 'True',
  false: 'False',
  min: 'Min',
  max: 'Max',
  to: 'to',
  typeAndPressEnter: 'Type and press enter...',
  selected: 'selected',
  selectedCount: 'selected',
  percent: '%',
  defaultCurrency: '$',
  defaultColor: 'blue',
  addFilterTitle: 'Filter by...',
  operators: {
    is: 'Is',
    isNot: 'Is not',
    contains: 'Contains',
    doesNotContain: 'Does not contain',
    startsWith: 'Starts with',
    endsWith: 'Ends with',
    gt: 'Greater than',
    lt: 'Less than',
    gte: 'Greater than or equal',
    lte: 'Less than or equal',
    between: 'Between',
    isEmpty: 'Is empty',
    isNotEmpty: 'Is not empty',
  },
};

// Default operators per type
export const OPERATORS_BY_TYPE: Record<string, string[]> = {
  text: ['is', 'isNot', 'contains', 'doesNotContain', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'],
  number: ['is', 'isNot', 'gt', 'lt', 'gte', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
  select: ['is', 'isNot', 'isEmpty', 'isNotEmpty'],
  'multi-select': ['contains', 'doesNotContain', 'isEmpty', 'isNotEmpty'],
  date: ['is', 'isNot', 'gt', 'lt', 'gte', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
  boolean: ['is'],
};