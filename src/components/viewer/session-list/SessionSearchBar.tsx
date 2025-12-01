import { Search } from 'lucide-react';
import { Input } from '~/components/ui/input';
import { InputGroup, InputGroupText } from '~/components/ui/input-group';
import type { SessionExplorerFilterState } from './sessionExplorerTypes';

interface SessionSearchBarProps {
  filters: SessionExplorerFilterState;
  updateFilter: <K extends keyof SessionExplorerFilterState>(key: K, value: SessionExplorerFilterState[K]) => void;
}

export function SessionSearchBar({ filters, updateFilter }: SessionSearchBarProps) {
  return (
    <div className="w-full">
      <InputGroup className="w-full">
        <InputGroupText>
          <Search className="size-4" />
        </InputGroupText>
        <Input
          type="search"
          aria-label="Search sessions"
          value={filters.searchText}
          onChange={(event) => updateFilter('searchText', event.target.value)}
          placeholder="Search repo, branch, file label, tag, or year"
          className="border-0 focus-visible:ring-0"
        />
      </InputGroup>
    </div>
  );
}
