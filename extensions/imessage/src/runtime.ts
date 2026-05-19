import type { PluginRuntime } from "agdi/plugin-sdk/core";
import { createPluginRuntimeStore } from "agdi/plugin-sdk/runtime-store";

const { setRuntime: setIMessageRuntime, getRuntime: getIMessageRuntime } =
  createPluginRuntimeStore<PluginRuntime>("iMessage runtime not initialized");
export { getIMessageRuntime, setIMessageRuntime };
