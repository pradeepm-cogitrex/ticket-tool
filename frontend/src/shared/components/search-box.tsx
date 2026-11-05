import { forwardRef } from 'react';
import { Search } from 'lucide-react';
import { TextInput } from './form/text-input';

interface SearchBoxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBox = forwardRef<HTMLInputElement, SearchBoxProps>(function SearchBox(
  { id, value, onChange, placeholder = 'Search…', className },
  ref,
) {
  return (
    <div className={className}>
      <TextInput
        ref={ref}
        id={id}
        type="search"
        icon={<Search />}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onClear={() => onChange('')}
        aria-label={placeholder}
      />
    </div>
  );
});
