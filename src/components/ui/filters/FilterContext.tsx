import { createContext, useContext } from 'react';
import type { FilterContextValue } from './types';
import { DEFAULT_I18N } from './i18n';

const FilterContext = createContext<FilterContextValue>({
  variant: 'outline',
  size: 'md',
  radius: 'md',
  i18n: DEFAULT_I18N,
  cursorPointer: true,
  className: undefined,
  showAddButton: true,
  addButtonText: undefined,
  addButtonIcon: undefined,
  addButtonClassName: undefined,
  addButton: undefined,
  showSearchInput: true,
  trigger: undefined,
  allowMultiple: true,
});

export const FilterContextProvider = FilterContext.Provider;
export const useFilterContext = () => useContext(FilterContext);
