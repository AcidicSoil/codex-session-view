import { useRef } from 'react';
import { Search } from 'lucide-react';
import { Input } from '~/components/ui/input';
import { InputGroup, InputGroupText } from '~/components/ui/input-group';

interface TimelineSearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchNext?: () => void;
}

export function TimelineSearchBar({ searchQuery, onSearchChange, onSearchNext }: TimelineSearchBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <InputGroup className="bg-background">
      <InputGroupText>
        <Search className="size-4" />
      </InputGroupText>
      <Input
        type="search"
        value={searchQuery}
        ref={inputRef}
        onChange={(event) => onSearchChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onSearchNext?.();
            requestAnimationFrame(() => {
              inputRef.current?.focus();
            });
          }
        }}
        placeholder="Filter by content, path, or type…"
        className="border-0 focus-visible:ring-0"
      />
    </InputGroup>
  );
}
