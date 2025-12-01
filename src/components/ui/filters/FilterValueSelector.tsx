import { Switch } from '~/components/ui/switch';
import { cn } from '~/lib/utils';
import { useFilterContext } from './FilterContext';
import { FilterInput } from './FilterInput';
import { SelectOptionsPopover } from './SelectOptionsPopover';
import { FallbackOptionsPopover } from './FallbackOptionsPopover';
import type { FilterFieldConfig } from './types';
import { filterFieldBetweenVariants, filterFieldValueVariants } from './variants';

interface FilterValueSelectorProps<T = unknown> {
  field: FilterFieldConfig<T>;
  values: T[];
  onChange: (values: T[]) => void;
  operator: string;
}

export function FilterValueSelector<T = unknown>({ field, values, onChange, operator }: FilterValueSelectorProps<T>) {
  const context = useFilterContext();

  if (operator === 'empty' || operator === 'not_empty') {
    return null;
  }

  if (field.customRenderer) {
    return (
      <div
        className={filterFieldValueVariants({
          variant: context.variant,
          size: context.size,
          cursorPointer: context.cursorPointer,
        })}
      >
        {field.customRenderer({ field, values, onChange, operator })}
      </div>
    );
  }

  if (field.type === 'boolean') {
    const isChecked = values[0] === true;
    const onLabel = field.onLabel || context.i18n.true;
    const offLabel = field.offLabel || context.i18n.false;

    return (
      <div
        className={filterFieldValueVariants({
          variant: context.variant,
          size: context.size,
          cursorPointer: context.cursorPointer,
        })}
      >
        <div className="flex items-center gap-2" data-slot="switch">
          <Switch checked={isChecked} onCheckedChange={(checked) => onChange([checked as T])} size="sm" />
          {field.onLabel && field.offLabel && (
            <span className="text-xs text-muted-foreground">{isChecked ? onLabel : offLabel}</span>
          )}
        </div>
      </div>
    );
  }

  if (field.type === 'time') {
    if (operator === 'between') {
      const startTime = (values[0] as string) || '';
      const endTime = (values[1] as string) || '';

      return (
        <div className="flex items-center" data-slot="filters-item">
          <FilterInput
            type="time"
            value={startTime}
            onChange={(e) => onChange([e.target.value, endTime] as T[])}
            onInputChange={field.onInputChange}
            className={field.className}
            field={field}
          />
          <div
            data-slot="filters-between"
            className={filterFieldBetweenVariants({ variant: context.variant, size: context.size })}
          >
            {context.i18n.to}
          </div>
          <FilterInput
            type="time"
            value={endTime}
            onChange={(e) => onChange([startTime, e.target.value] as T[])}
            onInputChange={field.onInputChange}
            className={field.className}
            field={field}
          />
        </div>
      );
    }

    return (
      <FilterInput
        type="time"
        value={(values[0] as string) || ''}
        onChange={(e) => onChange([e.target.value] as T[])}
        onInputChange={field.onInputChange}
        field={field}
        className={field.className}
      />
    );
  }

  if (field.type === 'datetime') {
    if (operator === 'between') {
      const startDateTime = (values[0] as string) || '';
      const endDateTime = (values[1] as string) || '';

      return (
        <div className="flex items-center" data-slot="filters-item">
          <FilterInput
            type="datetime-local"
            value={startDateTime}
            onChange={(e) => onChange([e.target.value, endDateTime] as T[])}
            onInputChange={field.onInputChange}
            className={cn('w-36', field.className)}
            field={field}
          />
          <div
            data-slot="filters-between"
            className={filterFieldBetweenVariants({ variant: context.variant, size: context.size })}
          >
            {context.i18n.to}
          </div>
          <FilterInput
            type="datetime-local"
            value={endDateTime}
            onChange={(e) => onChange([startDateTime, e.target.value] as T[])}
            onInputChange={field.onInputChange}
            className={cn('w-36', field.className)}
            field={field}
          />
        </div>
      );
    }

    return (
      <FilterInput
        type="datetime-local"
        value={(values[0] as string) || ''}
        onChange={(e) => onChange([e.target.value] as T[])}
        onInputChange={field.onInputChange}
        className={cn('w-36', field.className)}
        field={field}
      />
    );
  }

  if (['email', 'url', 'tel'].includes(field.type || '')) {
    const getInputType = () => {
      switch (field.type) {
        case 'email':
          return 'email';
        case 'url':
          return 'url';
        case 'tel':
          return 'tel';
        default:
          return 'text';
      }
    };

    const getPattern = () => {
      switch (field.type) {
        case 'email':
          return '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$';
        case 'url':
          return '^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$';
        case 'tel':
          return '^[\\+]?[1-9][\\d]{0,15}$';
        default:
          return undefined;
      }
    };

    return (
      <FilterInput
        type={getInputType()}
        value={(values[0] as string) || ''}
        onChange={(e) => onChange([e.target.value] as T[])}
        onInputChange={field.onInputChange}
        placeholder={field.placeholder || context.i18n.placeholders.enterField(field.type || 'text')}
        pattern={field.pattern || getPattern()}
        className={field.className}
        field={field}
      />
    );
  }

  if (field.type === 'daterange') {
    const startDate = (values[0] as string) || '';
    const endDate = (values[1] as string) || '';

    return (
      <div
        className={filterFieldValueVariants({
          variant: context.variant,
          size: context.size,
          cursorPointer: context.cursorPointer,
        })}
      >
        <FilterInput
          type="date"
          value={startDate}
          onChange={(e) => onChange([e.target.value, endDate] as T[])}
          onInputChange={field.onInputChange}
          className={cn('w-24', field.className)}
          field={field}
        />
        <div
          data-slot="filters-between"
          className={filterFieldBetweenVariants({ variant: context.variant, size: context.size })}
        >
          {context.i18n.to}
        </div>
        <FilterInput
          type="date"
          value={endDate}
          onChange={(e) => onChange([startDate, e.target.value] as T[])}
          onInputChange={field.onInputChange}
          className={cn('w-24', field.className)}
          field={field}
        />
      </div>
    );
  }

  if (field.type === 'text' || field.type === 'number') {
    if (field.type === 'number' && operator === 'between') {
      const minVal = (values[0] as string) || '';
      const maxVal = (values[1] as string) || '';

      return (
        <div className="flex items-center" data-slot="filters-item">
          <FilterInput
            type="number"
            value={minVal}
            onChange={(e) => onChange([e.target.value, maxVal] as T[])}
            onInputChange={field.onInputChange}
            placeholder={context.i18n.min}
            className={cn('w-16', field.className)}
            min={field.min}
            max={field.max}
            step={field.step}
            pattern={field.pattern}
            field={field}
          />
          <div
            data-slot="filters-between"
            className={filterFieldBetweenVariants({ variant: context.variant, size: context.size })}
          >
            {context.i18n.to}
          </div>
          <FilterInput
            type="number"
            value={maxVal}
            onChange={(e) => onChange([minVal, e.target.value] as T[])}
            onInputChange={field.onInputChange}
            placeholder={context.i18n.max}
            className={cn('w-16', field.className)}
            min={field.min}
            max={field.max}
            step={field.step}
            pattern={field.pattern}
            field={field}
          />
        </div>
      );
    }

    return (
      <div className="flex items-center" data-slot="filters-item">
        <FilterInput
          type={field.type === 'number' ? 'number' : 'text'}
          value={(values[0] as string) || ''}
          onChange={(e) => onChange([e.target.value] as T[])}
          onInputChange={field.onInputChange}
          placeholder={field.placeholder}
          min={field.type === 'number' ? field.min : undefined}
          max={field.type === 'number' ? field.max : undefined}
          step={field.type === 'number' ? field.step : undefined}
          pattern={field.pattern}
          field={field}
          className={cn('w-36', field.className)}
        />
      </div>
    );
  }

  if (field.type === 'date') {
    return (
      <FilterInput
        type="date"
        value={(values[0] as string) || ''}
        onChange={(e) => onChange([e.target.value] as T[])}
        onInputChange={field.onInputChange}
        field={field}
        className={cn('w-16', field.className)}
      />
    );
  }

  if (field.type === 'select' || field.type === 'multiselect') {
    return <SelectOptionsPopover field={field} values={values} onChange={onChange} />;
  }

  return <FallbackOptionsPopover field={field} values={values} onChange={onChange} />;
}
