import React from "react";
import { useTranslation } from "../../contexts/I18nContext";

interface GroupFilterProps {
  value: string | undefined;
  groups: string[];
  onChange: (value: string | undefined) => void;
}

export const GroupFilter: React.FC<GroupFilterProps> = ({ value, groups, onChange }) => {
  const { t } = useTranslation();

  return (
    <select
      className="group-filter"
      value={value || ""}
      onChange={(e) => onChange(e.target.value || undefined)}
    >
      <option value="">{t("commands.allGroups")}</option>
      {groups.map((g) => (
        <option key={g} value={g}>
          {g}
        </option>
      ))}
    </select>
  );
};
