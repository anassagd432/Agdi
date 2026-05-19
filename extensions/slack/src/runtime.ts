import type { PluginRuntime } from "agdi/plugin-sdk/core";
import { createPluginRuntimeStore } from "agdi/plugin-sdk/runtime-store";

const { setRuntime: setSlackRuntime, getRuntime: getSlackRuntime } =
  createPluginRuntimeStore<PluginRuntime>("Slack runtime not initialized");
export { getSlackRuntime, setSlackRuntime };
