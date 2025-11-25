import { useState, useEffect } from "react";
import { Command } from "../types/command";
import { commandService } from "../services/commandService";

type UseCommandsReturn = {
  commands: Command[];
  setCommands: (commands: Command[]) => void;
  allCommands: Command[];
  setAllCommands: (commands: Command[]) => void;
  groups: string[];
  loadCommands: () => Promise<void>;
};

export const useCommands = (groupFilter?: string): UseCommandsReturn => {
  const [commands, setCommands] = useState<Command[]>([]);
  const [allCommands, setAllCommands] = useState<Command[]>([]);
  const [groups, setGroups] = useState<string[]>([]);

  const loadCommands = async (): Promise<void> => {
    const rows = await commandService.getCommands(groupFilter);
    setCommands(rows);
    setAllCommands(rows);
    const gs = await commandService.getGroups();
    setGroups(gs);
  };

  useEffect(() => {
    void loadCommands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupFilter]);

  return {
    commands,
    setCommands,
    allCommands,
    setAllCommands,
    groups,
    loadCommands
  };
};
