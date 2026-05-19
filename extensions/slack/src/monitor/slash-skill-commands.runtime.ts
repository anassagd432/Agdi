import { listSkillCommandsForAgents as listSkillCommandsForAgentsImpl } from "agdi/plugin-sdk/command-auth";

type ListSkillCommandsForAgents =
  typeof import("agdi/plugin-sdk/command-auth").listSkillCommandsForAgents;

export function listSkillCommandsForAgents(
  ...args: Parameters<ListSkillCommandsForAgents>
): ReturnType<ListSkillCommandsForAgents> {
  return listSkillCommandsForAgentsImpl(...args);
}
