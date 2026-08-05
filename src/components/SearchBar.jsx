import { memo } from 'react'
import { Search } from 'lucide-react'

function SearchBar({ value, onChange }) {
  return (
    <div className="relative w-full sm:w-80">
      <Search
        size={15}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: 'var(--text-tertiary)' }}
      />
      <input
        type="text"
        placeholder="Search restaurants..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1"
        style={{
          background: 'var(--bg-input)',
          borderColor: 'var(--border-default)',
          color: 'var(--text-primary)',
          '--tw-ring-color': 'var(--color-brand-400)',
        }}
        aria-label="Search restaurants"
      />
    </div>
  )
}

export default memo(SearchBar)
