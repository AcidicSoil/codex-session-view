import { createContext, useContext } from 'react';
import { FilterI18nConfig } from './types';
import { DEFAULT_I18N } from './constants';

interface FilterContextState {
  i18n: FilterI18nConfig;
}

const FilterContext = createContext<FilterContextState | null>(null);

export const FilterProvider = ({
  children,
  i18n,
}: {
  children: React.ReactNode;
  i18n?: Partial<FilterI18nConfig>;
}) => {
  // Merge default i18n with provided overrides
  const mergedI18n: FilterI18nConfig = {
    ...DEFAULT_I18N,
    ...i18n,
    operators: {
      ...DEFAULT_I18N.operators,
      ...(i18n?.operators || {}),
    },
  };

  return (
    <FilterContext.Provider value={{ i18n: mergedI18n }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilterContext = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilterContext must be used within a FilterProvider');
  }
  return context;
};