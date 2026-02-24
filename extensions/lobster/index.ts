import type {
  AnyAgentTool,
  AGDIPluginApi,
  AGDIPluginToolFactory,
} from "../../src/plugins/types.js";
import { createLobsterTool } from "./src/lobster-tool.js";

export default function register(api: AGDIPluginApi) {
  api.registerTool(
    ((ctx) => {
      if (ctx.sandboxed) {
        return null;
      }
      return createLobsterTool(api) as AnyAgentTool;
    }) as AGDIPluginToolFactory,
    { optional: true },
  );
}
