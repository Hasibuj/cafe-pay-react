import { memo } from 'react'
import { Search } from 'lucide-react'

function SearchBar({ value, onChange }) {
  return (
    <div className="relative w-full md:max-w-sm md:flex-1">
      <Search
        size={16}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: 'var(--text-tertiary)' }}
        aria-hidden
      />
      <input
        type="search"
        placeholder="Search cafés & restaurants…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cp-input !pl-10 !pr-4"
        aria-label="Search restaurants"
        autoComplete="off"
        enterKeyHint="search"
      />
    </div>
  )
}

export default memo(SearchBar)
