import type { AGDIConfig } from "../config/config.js";

export function applyOnboardingLocalWorkspaceConfig(
  baseConfig: AGDIConfig,
  workspaceDir: string,
): AGDIConfig {
  return {
    ...baseConfig,
    agents: {
      ...baseConfig.agents,
      defaults: {
        ...baseConfig.agents?.defaults,
        workspace: workspaceDir,
      },
    },
    gateway: {
      ...baseConfig.gateway,
      mode: "local",
    },
  };
}
