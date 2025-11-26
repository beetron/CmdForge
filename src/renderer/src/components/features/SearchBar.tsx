import React from "react";
import { useTranslation } from "../../contexts/I18nContext";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, onFocus }) => {
  const { t } = useTranslation();

  return (
    <div className="search-container">
      <input
        className="search-input"
        value={value}
        placeholder={t("app.search")}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
      />
    </div>
  );
};
