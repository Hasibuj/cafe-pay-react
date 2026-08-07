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
    <div className="cp-filters" role="radiogroup" aria-label="Filter by category">
      {CATEGORIES.map(({ id, label, Icon }) => {
        const isActive = activeCategory === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onCategoryChange(id)}
            role="radio"
            aria-checked={isActive}
            className={`cp-filter-btn${isActive ? ' is-active' : ''}`}
          >
            <Icon size={14} aria-hidden />
            {label}
          </button>
        )
      })}
    </div>
  )
}

export default memo(CategoryFilter)
