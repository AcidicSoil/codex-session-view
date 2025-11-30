import React from 'react';
import { FilterFieldConfig } from './types';
import { Input } from '~/components/ui/input';
import { Switch } from '~/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { useFilterContext } from './context';
import { cn } from '~/lib/utils';

interface FilterValueSelectorProps<T> {
  field: FilterFieldConfig<T>;
  operator: string;
  values: T[];
  onChange: (values: T[]) => void;
  className?: string;
}

export function FilterValueSelector<T = unknown>({
  field,
  operator,
  values,
  onChange,
  className,
}: FilterValueSelectorProps<T>) {
  const { i18n } = useFilterContext();
  const firstValue = values[0] as unknown;
  const secondValue = values[1] as unknown;

  // No value needed for empty checks
  if (operator === 'isEmpty' || operator === 'isNotEmpty') {
    return null;
  }

  // Handle Boolean
  if (field.type === 'boolean') {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <Switch
          checked={firstValue === true}
          onCheckedChange={(checked) => onChange([checked as unknown as T])}
        />
        <span className="text-sm text-muted-foreground">
          {firstValue ? i18n.true : i18n.false}
        </span>
      </div>
    );
  }

  // Handle Select / Multi-Select
  if (field.type === 'select' && field.options) {
    return (
      <Select
        value={String(firstValue || '')}
        onValueChange={(val) => onChange([val as unknown as T])}
      >
        <SelectTrigger className={cn("h-8 w-[180px]", className)}>
          <SelectValue placeholder={i18n.select} />
        </SelectTrigger>
        <SelectContent>
          {field.options.map((opt) => (
            <SelectItem key={opt.value} value={String(opt.value)}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Handle Date & Date Range (Simplified as text/date inputs for now)
  if (field.type === 'date' || field.type === 'date-range') {
    // Note: In a full production app, integrate a dedicated DatePicker component here
    return (
      <Input
        type="date"
        value={String(firstValue || '')}
        onChange={(e) => onChange([e.target.value as unknown as T])}
        className={cn("h-8 w-[180px]", className)}
      />
    );
  }

  // Handle Range (Between) for Numbers
  if (operator === 'between' && field.type === 'number') {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <Input
          type="number"
          placeholder={i18n.min}
          value={String(firstValue || '')}
          onChange={(e) => onChange([e.target.value as unknown as T, secondValue as T])}
          className="h-8 w-20"
        />
        <span className="text-xs text-muted-foreground">{i18n.to}</span>
        <Input
          type="number"
          placeholder={i18n.max}
          value={String(secondValue || '')}
          onChange={(e) => onChange([firstValue as T, e.target.value as unknown as T])}
          className="h-8 w-20"
        />
      </div>
    );
  }

  // Default Text/Number Input
  return (
    <Input
      type={field.type === 'number' ? 'number' : 'text'}
      placeholder={field.placeholder || i18n.typeAndPressEnter}
      value={String(firstValue || '')}
      onChange={(e) => onChange([e.target.value as unknown as T])}
      className={cn("h-8 w-[180px]", className)}
    />
  );
}