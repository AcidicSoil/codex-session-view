import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';
import { Input } from '~/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import type { SessionExplorerFilterState, SizeUnit } from './sessionExplorerTypes';
import { SIZE_UNITS } from './sessionExplorerTypes';

interface AdvancedFilterAccordionProps {
  filters: SessionExplorerFilterState;
  updateFilter: <K extends keyof SessionExplorerFilterState>(key: K, value: SessionExplorerFilterState[K]) => void;
  openValues: string[];
  onOpenChange: (values: string[]) => void;
}

export function AdvancedFilterAccordion({ filters, updateFilter, openValues, onOpenChange }: AdvancedFilterAccordionProps) {
  return (
    <Accordion
      type="multiple"
      className="rounded-xl border border-border/70 bg-muted/10 p-4"
      value={openValues}
      onValueChange={(value) => onOpenChange(Array.isArray(value) ? value : [value])}
    >
      <AccordionItem value="size">
        <AccordionTrigger className="text-sm font-semibold">Size range</AccordionTrigger>
        <AccordionContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-size-min">
                Minimum size
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="filter-size-min"
                  type="number"
                  min={0}
                  value={filters.sizeMinValue}
                  onChange={(event) => updateFilter('sizeMinValue', event.target.value)}
                  placeholder="e.g. 10"
                />
                <Select value={filters.sizeMinUnit} onValueChange={(value: SizeUnit) => updateFilter('sizeMinUnit', value)}>
                  <SelectTrigger aria-label="Minimum size unit" className="w-[90px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {SIZE_UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-size-max">
                Maximum size
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="filter-size-max"
                  type="number"
                  min={0}
                  value={filters.sizeMaxValue}
                  onChange={(event) => updateFilter('sizeMaxValue', event.target.value)}
                  placeholder="e.g. 100"
                />
                <Select value={filters.sizeMaxUnit} onValueChange={(value: SizeUnit) => updateFilter('sizeMaxUnit', value)}>
                  <SelectTrigger aria-label="Maximum size unit" className="w-[90px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {SIZE_UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="timestamp">
        <AccordionTrigger className="text-sm font-semibold">Timestamp range</AccordionTrigger>
        <AccordionContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-ts-from">
                Start (UTC)
              </label>
              <Input
                id="filter-ts-from"
                type="datetime-local"
                value={filters.timestampFrom}
                onChange={(event) => updateFilter('timestampFrom', event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-ts-to">
                End (UTC)
              </label>
              <Input
                id="filter-ts-to"
                type="datetime-local"
                value={filters.timestampTo}
                onChange={(event) => updateFilter('timestampTo', event.target.value)}
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
