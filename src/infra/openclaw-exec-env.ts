export const AGDI_CLI_ENV_VAR = "AGDI_CLI";
export const AGDI_CLI_ENV_VALUE = "1";

/** @deprecated Use AGDI_CLI_ENV_VAR */
export const OPENCLAW_CLI_ENV_VAR = "OPENCLAW_CLI";
/** @deprecated Use AGDI_CLI_ENV_VALUE */
export const OPENCLAW_CLI_ENV_VALUE = AGDI_CLI_ENV_VALUE;

export function markAgdiExecEnv<T extends Record<string, string | undefined>>(env: T): T {
  return {
    ...env,
    [AGDI_CLI_ENV_VAR]: AGDI_CLI_ENV_VALUE,
    // Backward compat: also set the legacy name so external tools checking OPENCLAW_CLI still work.
    [OPENCLAW_CLI_ENV_VAR]: AGDI_CLI_ENV_VALUE,
  };
}

/** @deprecated Use markAgdiExecEnv */
export const markOpenClawExecEnv = markAgdiExecEnv;

export function ensureAgdiExecMarkerOnProcess(
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  env[AGDI_CLI_ENV_VAR] = AGDI_CLI_ENV_VALUE;
  // Backward compat
  env[OPENCLAW_CLI_ENV_VAR] = AGDI_CLI_ENV_VALUE;
  return env;
}

/** @deprecated Use ensureAgdiExecMarkerOnProcess */
export const ensureOpenClawExecMarkerOnProcess = ensureAgdiExecMarkerOnProcess;
