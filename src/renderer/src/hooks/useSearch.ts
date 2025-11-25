import { useState, useEffect } from "react";
import { Command } from "../types/command";

type UseSearchReturn = {
  search: string;
  setSearch: (value: string) => void;
  commands: Command[];
  filteredSuggestions: Command[];
  showSuggestions: boolean;
  setShowSuggestions: (value: boolean) => void;
};

export const useSearch = (allCommands: Command[]): UseSearchReturn => {
  const [search, setSearch] = useState<string>("");
  const [commands, setCommands] = useState<Command[]>(allCommands);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<Command[]>([]);

  useEffect(() => {
    if (search.trim()) {
      const term = search.toLowerCase();
      // Show all commands if user types "*"
      if (term === "*") {
        const sorted = [...allCommands].sort((a, b) => a.command.localeCompare(b.command));
        setFilteredSuggestions(sorted);
        setCommands(sorted);
        setShowSuggestions(sorted.length > 0);
      } else {
        const filtered = allCommands
          .filter(
            (c) =>
              c.command.toLowerCase().includes(term) ||
              (c.description || "").toLowerCase().includes(term)
          )
          .sort((a, b) => a.command.localeCompare(b.command));
        setFilteredSuggestions(filtered);
        setCommands(filtered);
        setShowSuggestions(filtered.length > 0);
      }
    } else {
      setCommands(allCommands);
      setShowSuggestions(false);
      setFilteredSuggestions([]);
    }
  }, [search, allCommands]);

  return {
    search,
    setSearch,
    commands,
    filteredSuggestions,
    showSuggestions,
    setShowSuggestions
  };
};
