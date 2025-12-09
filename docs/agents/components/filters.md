## Filters module overview

The viewer filters UI now lives in `src/components/ui/filters/` and is split into focused modules:

| File | Purpose |
| --- | --- |
| `Filters.tsx` | Primary client component that renders the add-filter popover and active filters. |
| `FiltersContent.tsx` | Stateless renderer for an existing filters array (used when the add button isn’t needed). |
| `FilterInput.tsx`, `FilterOperatorDropdown.tsx`, `FilterValueSelector.tsx`, `FilterRemoveButton.tsx` | Presentational subcomponents that encapsulate validation, operator selection, value editors, and removal controls. |
| `FilterContext.tsx` | Provides styling/i18n props to all subcomponents. |
| `i18n.ts` | Default copy/validation strings plus helpers (`mergeI18nConfig`, `createOperatorsFromI18n`). |
| `filter-utils.ts` | Pure helpers (`flattenFields`, `getFieldsMap`, `createFilter`, `createFilterGroup`, `getOperatorsForField`). |
| `types.ts` | Shared TypeScript definitions for filters, fields, operators, and props. |
| `variants.ts` | All `cva` style variants so Tailwind class churn stays centralized. |

### Extending filters

1. **Add new field types** by extending `FilterFieldConfig` options in `types.ts` and adding render logic inside `FilterValueSelector`.
2. **Custom operators**: pass `operators` on a `FilterFieldConfig` or override strings through `mergeI18nConfig`.
3. **Programmatic creation**: use `createFilter`/`createFilterGroup` to build initial state, or call `flattenFields`/`getFieldsMap` to inspect configuration at runtime.

### Usage

```tsx
import { Filters, type Filter, type FilterFieldsConfig } from '~/components/ui/filters';

const [filters, setFilters] = useState<Filter[]>([]);

return (
  <Filters
    filters={filters}
    fields={fieldConfig as FilterFieldsConfig}
    onChange={setFilters}
    i18n={{ addFilter: 'Add timeline filter' }}
  />
);
```

When you only need to render existing filters (e.g., inside a panel), wrap your own state manager around `FiltersContent` and supply `filters`, `fields`, and `onChange`.
