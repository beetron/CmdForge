import React from "react";

interface GroupFilterProps {
  value: string | undefined;
  groups: string[];
  onChange: (value: string | undefined) => void;
}

export const GroupFilter: React.FC<GroupFilterProps> = ({ value, groups, onChange }) => {
  return (
    <select
      className="group-filter"
      value={value || ""}
      onChange={(e) => onChange(e.target.value || undefined)}
    >
      <option value="">All Groups</option>
      {groups.map((g) => (
        <option key={g} value={g}>
          {g}
        </option>
      ))}
    </select>
  );
};
