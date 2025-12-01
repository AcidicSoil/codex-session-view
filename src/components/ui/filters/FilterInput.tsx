import { AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';
import type { FilterFieldConfig } from './types';
import { useFilterContext } from './FilterContext';
import { filterFieldAddonVariants, filterInputVariants } from './variants';

type FilterInputProps<T> = React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
  field?: FilterFieldConfig<T>;
  onInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export function FilterInput<T = unknown>({ field, onInputChange, className, ...props }: FilterInputProps<T>) {
  const context = useFilterContext();
  const [isValid, setIsValid] = useState(true);
  const [validationMessage, setValidationMessage] = useState('');

  const validateInput = (value: string, pattern?: string): boolean => {
    if (!pattern || !value) return true;
    const regex = new RegExp(pattern);
    return regex.test(value);
  };

  const getValidationMessage = (fieldType: string, hasCustomPattern: boolean = false): string => {
    if ((fieldType === 'text' || fieldType === 'number') && hasCustomPattern) {
      return context.i18n.validation.invalid;
    }

    switch (fieldType) {
      case 'email':
        return context.i18n.validation.invalidEmail;
      case 'url':
        return context.i18n.validation.invalidUrl;
      case 'tel':
        return context.i18n.validation.invalidTel;
      default:
        return context.i18n.validation.invalid;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.onChange?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const pattern = field?.pattern || props.pattern;

    if (value && pattern) {
      let valid = true;

      if (field?.validation) {
        valid = field.validation(value);
      } else {
        valid = validateInput(value, pattern);
      }

      setIsValid(valid);
      const hasCustomPattern = Boolean(field?.pattern || props.pattern);
      setValidationMessage(valid ? '' : getValidationMessage(field?.type || '', hasCustomPattern));
    } else {
      setIsValid(true);
      setValidationMessage('');
    }

    if (onInputChange) {
      onInputChange(e as React.ChangeEvent<HTMLInputElement>);
    }

    props.onBlur?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isValid && !['Tab', 'Escape', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      setIsValid(true);
      setValidationMessage('');
    }

    if (e.key === 'Enter' && onInputChange) {
      const syntheticEvent = {
        ...e,
        target: e.target as HTMLInputElement,
        currentTarget: e.currentTarget as HTMLInputElement,
      } as React.ChangeEvent<HTMLInputElement>;
      onInputChange(syntheticEvent);
    }

    props.onKeyDown?.(e);
  };

  return (
    <div
      className={cn('w-36', filterInputVariants({ variant: context.variant, size: context.size }), className)}
      data-slot="filters-input-wrapper"
    >
      {field?.prefix && (
        <div
          data-slot="filters-prefix"
          className={filterFieldAddonVariants({ variant: context.variant, size: context.size })}
        >
          {field.prefix}
        </div>
      )}

      <div className="w-full flex items-stretch">
        <input
          className="w-full outline-none"
          aria-invalid={!isValid}
          aria-describedby={!isValid && validationMessage ? `${field?.key || 'input'}-error` : undefined}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          data-slot="filters-input"
          {...props}
        />
        {!isValid && validationMessage && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                <AlertCircle className="size-3.5 text-destructive" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">{validationMessage}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {field?.suffix && (
        <div
          data-slot="filters-suffix"
          className={cn(filterFieldAddonVariants({ variant: context.variant, size: context.size }))}
        >
          {field.suffix}
        </div>
      )}
    </div>
  );
}
