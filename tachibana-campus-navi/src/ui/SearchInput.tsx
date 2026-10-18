import type { KeyboardEvent, Ref } from 'react'
import { CloseIcon, SearchIcon } from './icons.tsx'

interface SearchInputProps {
  ref?: Ref<HTMLInputElement>
  value: string
  onChange(value: string): void
  onFocus?(): void
  onKeyDown?(event: KeyboardEvent<HTMLInputElement>): void
  listboxId: string
  expanded: boolean
  activeOptionId?: string
}

/** 画面上部の教室検索バー（WAI-ARIA の combobox） */
export function SearchInput({
  ref,
  value,
  onChange,
  onFocus,
  onKeyDown,
  listboxId,
  expanded,
  activeOptionId,
}: SearchInputProps) {
  return (
    <div className="relative">
      <label htmlFor={`${listboxId}-input`} className="sr-only">
        教室番号・建物名・施設名で検索
      </label>
      <SearchIcon
        size={20}
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
      />
      <input
        ref={ref}
        id={`${listboxId}-input`}
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={expanded}
        aria-activedescendant={activeOptionId}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="search"
        placeholder="教室番号で検索（例: H301）"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        className="h-13 w-full rounded-2xl border border-line-strong bg-surface pr-12 pl-11 text-[17px] font-medium text-ink shadow-sm placeholder:font-normal placeholder:text-muted focus:border-accent-fill focus:outline-none focus-visible:ring-3 focus-visible:ring-accent-line focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value !== '' && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute top-1/2 right-1.5 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-sunken"
          aria-label="検索語を消す"
        >
          <CloseIcon size={18} />
        </button>
      )}
    </div>
  )
}
