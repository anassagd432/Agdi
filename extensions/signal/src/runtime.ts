import type { PluginRuntime } from "agdi/plugin-sdk/core";
import { createPluginRuntimeStore } from "agdi/plugin-sdk/runtime-store";

const { setRuntime: setSignalRuntime, getRuntime: getSignalRuntime } =
  createPluginRuntimeStore<PluginRuntime>("Signal runtime not initialized");
export { getSignalRuntime, setSignalRuntime };
