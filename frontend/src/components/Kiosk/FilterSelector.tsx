interface FilterSelectorProps {
  selectedFilter: string
  onSelect: (filterId: string) => void
  disabled?: boolean
}

const filters = [
  { id: "Normal", label: "Normal" },
  { id: "Lembut", label: "Lembut" },
  { id: "Hitam-Putih", label: "Hitam-Putih" },
  { id: "BW2", label: "BW-2" },
  { id: "BW3", label: "BW-3" },
  { id: "Vintage", label: "Vintage" },
  { id: "Bright", label: "Bright" },
]

export default function FilterSelector({
  selectedFilter,
  onSelect,
  disabled,
}: FilterSelectorProps) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-2">
      {filters.map((f) => {
        const isActive = f.id === selectedFilter
        return (
          <button
            type="button"
            key={f.id}
            disabled={disabled}
            onClick={() => onSelect(f.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all active:scale-95 ${
              isActive
                ? "text-white shadow-md"
                : "text-[var(--k-on-surface-variant)]"
            }`}
            style={{
              background: isActive
                ? "linear-gradient(135deg, var(--k-primary), var(--k-primary-container))"
                : "var(--k-surface-container)",
            }}
          >
            <span className="material-symbols-outlined text-sm">
              {isActive ? "filter" : "filter_none"}
            </span>
            {f.label}
            <span
              className="rounded-full px-1.5 py-0.5 text-[8px]"
              style={{
                background: isActive
                  ? "rgba(255,255,255,0.2)"
                  : "var(--k-surface-container-high)",
              }}
            >
              Free
            </span>
          </button>
        )
      })}
    </div>
  )
}
