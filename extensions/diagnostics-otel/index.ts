import type { AGDIPluginApi } from "agdi/plugin-sdk";
import { emptyPluginConfigSchema } from "agdi/plugin-sdk";
import { createDiagnosticsOtelService } from "./src/service.js";

const plugin = {
  id: "diagnostics-otel",
  name: "Diagnostics OpenTelemetry",
  description: "Export diagnostics events to OpenTelemetry",
  configSchema: emptyPluginConfigSchema(),
  register(api: AGDIPluginApi) {
    api.registerService(createDiagnosticsOtelService());
  },
};

export default plugin;
