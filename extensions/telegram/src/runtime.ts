import type { PluginRuntime } from "agdi/plugin-sdk/core";
import { createPluginRuntimeStore } from "agdi/plugin-sdk/runtime-store";

const { setRuntime: setTelegramRuntime, getRuntime: getTelegramRuntime } =
  createPluginRuntimeStore<PluginRuntime>("Telegram runtime not initialized");
export { getTelegramRuntime, setTelegramRuntime };
