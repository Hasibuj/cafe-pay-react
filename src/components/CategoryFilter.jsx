import { memo } from 'react'
import { Coffee, UtensilsCrossed, Croissant, LayoutGrid } from 'lucide-react'

const CATEGORIES = [
  { id: 'all', label: 'All', Icon: LayoutGrid },
  { id: 'coffee', label: 'Coffee', Icon: Coffee },
  { id: 'fastfood', label: 'Fast Food', Icon: UtensilsCrossed },
  { id: 'bakery', label: 'Bakery', Icon: Croissant },
]

function CategoryFilter({ activeCategory, onCategoryChange }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto" role="radiogroup" aria-label="Filter by category">
      {CATEGORIES.map(({ id, label, Icon }) => {
        const isActive = activeCategory === id
        return (
          <button
            key={id}
            onClick={() => onCategoryChange(id)}
            role="radio"
            aria-checked={isActive}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all duration-200 whitespace-nowrap"
            style={isActive
              ? {
                  background: 'var(--color-brand-500)',
                  color: 'white',
                  boxShadow: '0 2px 8px oklch(0.65 0.19 70 / 0.25)',
                }
              : {
                  background: 'var(--bg-card)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-default)',
                }
            }
          >
            <Icon size={13} />
            {label}
          </button>
        )
      })}
    </div>
  )
}

export default memo(CategoryFilter)
