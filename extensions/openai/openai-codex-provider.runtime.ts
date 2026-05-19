import { getOAuthApiKey as getOAuthApiKeyFromPi } from "@mariozechner/pi-ai/oauth";
import { ensureGlobalUndiciEnvProxyDispatcher } from "agdi/plugin-sdk/infra-runtime";

export async function getOAuthApiKey(
  ...args: Parameters<typeof getOAuthApiKeyFromPi>
): Promise<Awaited<ReturnType<typeof getOAuthApiKeyFromPi>>> {
  ensureGlobalUndiciEnvProxyDispatcher();
  return await getOAuthApiKeyFromPi(...args);
}
