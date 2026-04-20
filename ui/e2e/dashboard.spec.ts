import { expect, test, type Page, type TestInfo } from "@playwright/test";

type CapturedErrors = {
  consoleErrors: string[];
  pageErrors: string[];
};

test.describe("Dashboard smoke coverage", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      class StubWebSocket extends EventTarget {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSING = 2;
        static CLOSED = 3;

        url: string;
        readyState = StubWebSocket.CONNECTING;
        protocol = "";
        extensions = "";
        bufferedAmount = 0;
        binaryType: BinaryType = "blob";
        onopen: ((event: Event) => void) | null = null;
        onclose: ((event: CloseEvent) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;
        onmessage: ((event: MessageEvent) => void) | null = null;

        constructor(url: string | URL) {
          super();
          this.url = String(url);
        }

        send() {}

        close() {
          this.readyState = StubWebSocket.CLOSED;
          const event = new CloseEvent("close");
          this.dispatchEvent(event);
          this.onclose?.(event);
        }
      }

      Object.defineProperty(window, "WebSocket", {
        configurable: true,
        writable: true,
        value: StubWebSocket,
      });
    });
  });

  test("renders the login gate with connection controls", async ({ page }, testInfo) => {
    const errors = captureFrontendErrors(page);

    await page.goto("/");
    await resetBrowserStorage(page);

    await expect(page).toHaveTitle("Agdi Control");
    await expect(page.locator("agdi-app")).toBeVisible();
    await expect(page.getByText("Agdi", { exact: true })).toBeVisible();
    await expect(page.getByText("Gateway Dashboard")).toBeVisible();
    await expect(page.getByText("How to connect")).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Read the docs/i })).toHaveAttribute(
      "href",
      "https://docs.agdi.ai/web/dashboard",
    );
    await expect(page.locator('input[placeholder="ws://127.0.0.1:18789"]')).toBeVisible();

    await attachScreenshot(page, testInfo, "login-gate");
    expectNoFrontendErrors(errors);
  });

  test("persists the token for the current gateway while leaving password transient", async ({
    page,
  }, testInfo) => {
    const errors = captureFrontendErrors(page);

    await page.goto("/");
    await resetBrowserStorage(page);

    const wsUrlInput = page.locator('input[placeholder="ws://127.0.0.1:18789"]');
    const tokenInput = page.locator('input[placeholder*="OPENCLAW_GATEWAY_TOKEN"]');
    const passwordInput = page.locator('input[placeholder="optional"]');

    await tokenInput.fill("test-gateway-token");
    await passwordInput.fill("secret-password");

    await expect(tokenInput).toHaveAttribute("type", "password");
    await expect(passwordInput).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: "Toggle token visibility" }).click();
    await page.getByRole("button", { name: "Toggle password visibility" }).click();

    await expect(tokenInput).toHaveAttribute("type", "text");
    await expect(passwordInput).toHaveAttribute("type", "text");

    await page.reload();

    await expect(wsUrlInput).toHaveValue("ws://127.0.0.1:18789");
    await expect(tokenInput).toHaveValue("test-gateway-token");
    await expect(passwordInput).toHaveValue("");

    await attachScreenshot(page, testInfo, "login-gate-persistence");
    expectNoFrontendErrors(errors);
  });

  test("renders the connected dashboard shell and supports nav routing", async ({
    page,
  }, testInfo) => {
    const errors = captureFrontendErrors(page);

    await page.goto("/");
    await resetBrowserStorage(page);
    await injectConnectedDashboard(page);

    await expect(page.getByText("Gateway Access")).toBeVisible();
    await expect(page.getByText("Snapshot")).toBeVisible();
    await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Channels" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Agents", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Config" })).toBeVisible();

    await page.getByRole("link", { name: "Channels" }).click();
    await expect(page).toHaveURL(/\/channels$/);
    await expect(page.getByText("Channel health")).toBeVisible();
    await expect(page.getByText("Discord", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Agents", exact: true }).click();
    await expect(page).toHaveURL(/\/agents$/);
    await expect(page.locator("main").getByText("Agents", { exact: true })).toBeVisible();
    await expect(page.locator("main").getByText("Workspaces, tools, identities.")).toBeVisible();

    await attachScreenshot(page, testInfo, "dashboard-shell");
    expectNoFrontendErrors(errors);
  });
});

function captureFrontendErrors(page: Page): CapturedErrors {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  return { consoleErrors, pageErrors };
}

async function resetBrowserStorage(page: Page) {
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload();
}

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
}

async function injectConnectedDashboard(page: Page) {
  await page.evaluate(() => {
    const app = document.querySelector("agdi-app") as
      | (HTMLElement & Record<string, unknown> & { requestUpdate?: () => void })
      | null;
    if (!app) {
      throw new Error("agdi-app not found");
    }

    const now = Date.now();
    const currentSettings =
      typeof app.settings === "object" && app.settings ? (app.settings as Record<string, unknown>) : {};

    Object.assign(app, {
      connected: true,
      tab: "overview",
      lastError: null,
      lastErrorCode: null,
      hello: {
        server: { version: "test-version" },
        policy: { tickIntervalMs: 5_000 },
        features: { methods: [] },
        snapshot: {
          uptimeMs: 61_000,
          authMode: "token",
          sessionDefaults: {
            mainSessionKey: "main",
            mainKey: "main",
          },
        },
      },
      settings: {
        ...currentSettings,
        gatewayUrl: "ws://127.0.0.1:18789",
        token: "test-gateway-token",
        sessionKey: "main",
        lastActiveSessionKey: "main",
        navCollapsed: false,
      },
      sessionsResult: {
        count: 1,
        sessions: [
          {
            key: "main",
            kind: "direct",
            label: "Main Session",
            displayName: "Main Session",
            updatedAt: now,
          },
        ],
      },
      channelsSnapshot: {
        ts: now,
        channelOrder: ["discord", "telegram"],
        channelLabels: {
          discord: "Discord",
          telegram: "Telegram",
        },
        channelMeta: [
          { id: "discord", label: "Discord", detailLabel: "Discord" },
          { id: "telegram", label: "Telegram", detailLabel: "Telegram" },
        ],
        channels: {
          discord: {
            configured: false,
            running: false,
          },
          telegram: {
            configured: false,
            running: false,
            mode: "polling",
          },
        },
        channelAccounts: {
          discord: [],
          telegram: [],
        },
        channelDefaultAccountId: {},
      },
      channelsLastSuccess: now,
      presenceEntries: [],
      cronJobs: [],
      cronStatus: {
        enabled: true,
        jobs: 0,
        nextWakeAtMs: now + 60_000,
      },
      attentionItems: [],
      eventLog: [],
      overviewLogLines: ["gateway ready"],
      usageResult: null,
      skillsReport: {
        workspaceDir: "",
        managedSkillsDir: "",
        skills: [],
      },
      agentsList: {
        defaultId: "main",
        mainKey: "main",
        scope: "global",
        agents: [],
      },
    });

    app.requestUpdate?.();
  });
}

function expectNoFrontendErrors(errors: CapturedErrors) {
  expect.soft(errors.pageErrors, "unexpected page errors").toEqual([]);
  expect.soft(errors.consoleErrors, "unexpected console errors").toEqual([]);
}
