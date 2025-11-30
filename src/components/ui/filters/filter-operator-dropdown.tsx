import React from 'react';
import { FilterFieldConfig } from './types';
import { OPERATORS_BY_TYPE } from './constants';
import { useFilterContext } from './context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';

interface FilterOperatorDropdownProps<T> {
  field: FilterFieldConfig<T>;
  operator: string;
  values: T[];
  onChange: (operator: string) => void;
}

export function FilterOperatorDropdown<T>({
  field,
  operator,
  onChange,
}: FilterOperatorDropdownProps<T>) {
  const { i18n } = useFilterContext();

  // Get valid operators for this field type
  const validOperators = field.operators || OPERATORS_BY_TYPE[field.type] || OPERATORS_BY_TYPE.text;

  return (
    <Select value={operator} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[140px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {validOperators.map((op) => (
          <SelectItem key={op} value={op} className="text-xs">
            {i18n.operators[op] || op}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}