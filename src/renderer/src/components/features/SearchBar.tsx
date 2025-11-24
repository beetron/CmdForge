import React from 'react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onFocus: () => void
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, onFocus }) => {
  return (
    <div className="search-container">
      <input
        className="search-input"
        value={value}
        placeholder="Search... * for all commands"
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
      />
    </div>
  )
}
