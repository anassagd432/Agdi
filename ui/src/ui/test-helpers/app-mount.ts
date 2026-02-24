import { afterEach, beforeEach } from "vitest";
import { AgdiApp } from "../app.ts";

// oxlint-disable-next-line typescript/unbound-method
const originalConnect = AgdiApp.prototype.connect;

export function mountApp(pathname: string) {
  window.history.replaceState({}, "", pathname);
  const app = document.createElement("agdi-app") as AgdiApp;
  document.body.append(app);
  return app;
}

export function registerAppMountHooks() {
  beforeEach(() => {
    AgdiApp.prototype.connect = () => {
      // no-op: avoid real gateway WS connections in browser tests
    };
    window.__AGDI_CONTROL_UI_BASE_PATH__ = undefined;
    localStorage.clear();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    AgdiApp.prototype.connect = originalConnect;
    window.__AGDI_CONTROL_UI_BASE_PATH__ = undefined;
    localStorage.clear();
    document.body.innerHTML = "";
  });
}
