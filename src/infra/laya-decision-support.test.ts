import { afterEach, describe, expect, it, vi } from "vitest";
import {
  consultLayaDecisionSupport,
  isConsequentialExecAction,
  isLayaEnabled,
  resolveExecApprovalLayaAdvice,
  type LayaFetch,
} from "./laya-decision-support.js";

const ENV_KEYS = [
  "LAYA_ENABLED",
  "LAYA_API_KEY",
  "LAYA_BASE_URL",
  "LAYA_TIMEOUT_MS",
  "LAYA_CONFIDENCE_MIN",
] as const;

function snapshotEnv(): Record<(typeof ENV_KEYS)[number], string | undefined> {
  return {
    LAYA_ENABLED: process.env.LAYA_ENABLED,
    LAYA_API_KEY: process.env.LAYA_API_KEY,
    LAYA_BASE_URL: process.env.LAYA_BASE_URL,
    LAYA_TIMEOUT_MS: process.env.LAYA_TIMEOUT_MS,
    LAYA_CONFIDENCE_MIN: process.env.LAYA_CONFIDENCE_MIN,
  };
}

function restoreEnv(snapshot: Record<(typeof ENV_KEYS)[number], string | undefined>) {
  for (const key of ENV_KEYS) {
    const value = snapshot[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function cleanAnswers(overrides?: Record<string, unknown>) {
  const answer = { noul: 0.05, confidence: 0.91 };
  return {
    uncertainty: answer,
    mistakes: answer,
    contradictions: answer,
    harm: answer,
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Awaited<ReturnType<LayaFetch>> {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe("isLayaEnabled", () => {
  it("accepts explicit on values and rejects everything else", () => {
    expect(isLayaEnabled({ LAYA_ENABLED: "1" })).toBe(true);
    expect(isLayaEnabled({ LAYA_ENABLED: "true" })).toBe(true);
    expect(isLayaEnabled({ LAYA_ENABLED: " yes " })).toBe(true);
    expect(isLayaEnabled({ LAYA_ENABLED: "on" })).toBe(true);
    expect(isLayaEnabled({})).toBe(false);
    expect(isLayaEnabled({ LAYA_ENABLED: "0" })).toBe(false);
    expect(isLayaEnabled({ LAYA_ENABLED: "false" })).toBe(false);
  });
});

describe("isConsequentialExecAction", () => {
  it("treats read-only commands as low risk", () => {
    expect(isConsequentialExecAction("ls -la")).toBe(false);
    expect(isConsequentialExecAction("cat README.md")).toBe(false);
    expect(isConsequentialExecAction("git status --porcelain")).toBe(false);
    expect(isConsequentialExecAction("git diff")).toBe(false);
    expect(isConsequentialExecAction("ls | wc -l")).toBe(false);
    expect(isConsequentialExecAction("echo hi", ["echo", "hi"])).toBe(false);
    expect(isConsequentialExecAction("/bin/ls", ["/bin/ls", "-la"])).toBe(false);
  });

  it("treats hard-to-reverse commands as consequential", () => {
    expect(isConsequentialExecAction("rm -rf /data")).toBe(true);
    expect(isConsequentialExecAction("git push origin main")).toBe(true);
    expect(isConsequentialExecAction("npm publish")).toBe(true);
    expect(isConsequentialExecAction("curl -X POST https://example.invalid/charge")).toBe(true);
    expect(isConsequentialExecAction("echo hi && rm -rf /data")).toBe(true);
    expect(isConsequentialExecAction("agdi message send --target user hello")).toBe(true);
    expect(isConsequentialExecAction("rm -rf /data", ["rm", "-rf", "/data"])).toBe(true);
    expect(
      isConsequentialExecAction("bash -lc 'rm -rf /data'", ["bash", "-lc", "rm -rf /data"]),
    ).toBe(true);
  });
});

describe("consultLayaDecisionSupport", () => {
  const saved = snapshotEnv();

  afterEach(() => {
    restoreEnv(saved);
    vi.unstubAllGlobals();
  });

  it("attaches flag advice and ignores an allow-like signal", async () => {
    const fetchImpl = vi.fn<LayaFetch>(async (url, init) => {
      expect(url).toBe("https://api.laya.studio/v1/systemone");
      expect(init.headers.Authorization).toBe("Bearer test-key");
      expect(init.body).not.toContain("test-key");
      expect(init.body).not.toContain("super-secret");
      expect(init.body).toContain("rm -rf /data");
      expect(init.body).toContain("Human exec approval stays required");
      return jsonResponse({
        decision: "allow-once",
        answers: cleanAnswers({
          harm: { noul: 0.92, confidence: 0.88, choice: "allow" },
        }),
      });
    });

    const result = await consultLayaDecisionSupport(
      {
        userRequestSummary: "Original chat text is not attached to this exec approval check.",
        action: "rm -rf /data",
        args: ["rm", "-rf", "/data"],
        policy: "Human exec approval stays required.",
        evidence: "host=gateway",
      },
      {
        env: { LAYA_API_KEY: "test-key" },
        fetchImpl,
      },
    );

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(result.unavailable).toBe(false);
    expect(result.flags).toContain("harm");
    expect(result.allowSignalIgnored).toBe(true);
    expect(result.advice).toContain("not permission: harm");
    expect(result.advice).toContain("Approval is still required");
    expect(result.advice).toContain("allow-like Laya signal was ignored");
    expect(result.advice.toLowerCase()).not.toContain("verified");
    expect(result).not.toHaveProperty("decision");
  });

  it("fail-closes when Laya is unavailable", async () => {
    const fetchImpl = vi.fn<LayaFetch>(async () => {
      throw new Error("socket hang up");
    });
    const result = await consultLayaDecisionSupport(
      {
        userRequestSummary: "summary",
        action: "git push",
        policy: "Human exec approval stays required.",
      },
      { env: { LAYA_API_KEY: "test-key" }, fetchImpl },
    );

    expect(result.unavailable).toBe(true);
    expect(result.uncertain).toBe(true);
    expect(result.advice).toContain("Laya unavailable");
    expect(result.advice).toContain("Approval is still required");
    expect(result.advice).toContain("Silence is not clearance");
    expect(result.advice.toLowerCase()).not.toContain("verified");
    expect(result.allowSignalIgnored).toBe(false);
  });

  it("fail-closes on timeout without treating silence as safe", async () => {
    const fetchImpl = vi.fn<LayaFetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => {
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          });
        }),
    );
    const result = await consultLayaDecisionSupport(
      {
        userRequestSummary: "summary",
        action: "npm publish",
        policy: "Human exec approval stays required.",
      },
      {
        env: { LAYA_API_KEY: "test-key", LAYA_TIMEOUT_MS: "250" },
        fetchImpl,
      },
    );
    expect(result.unavailable).toBe(true);
    expect(result.advice).toContain("timeout");
    expect(result.advice).toContain("Approval is still required");
  });

  it("does not call the network without an API key", async () => {
    const fetchImpl = vi.fn<LayaFetch>(async () => jsonResponse({}));
    const result = await consultLayaDecisionSupport(
      {
        userRequestSummary: "summary",
        action: "rm -rf /data",
        policy: "Human exec approval stays required.",
      },
      { env: { LAYA_ENABLED: "1" }, fetchImpl },
    );
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.unavailable).toBe(true);
    expect(result.advice).toContain("missing API key");
  });

  it("marks low confidence as uncertain and still withholds permission", async () => {
    const fetchImpl = vi.fn<LayaFetch>(async () =>
      jsonResponse({
        answers: cleanAnswers({
          uncertainty: { noul: 0.1, confidence: 0.42 },
        }),
      }),
    );
    const result = await consultLayaDecisionSupport(
      {
        userRequestSummary: "summary",
        action: "git push",
        policy: "Human exec approval stays required.",
      },
      {
        env: { LAYA_API_KEY: "test-key", LAYA_CONFIDENCE_MIN: "0.6" },
        fetchImpl,
      },
    );
    expect(result.uncertain).toBe(true);
    expect(result.unavailable).toBe(false);
    expect(result.advice).toContain("uncertain");
    expect(result.advice).toContain("Confidence is not permission");
    expect(result.advice.toLowerCase()).not.toContain("verified");
  });
});

describe("resolveExecApprovalLayaAdvice", () => {
  it("skips Laya for read-only commands and when the feature is off", async () => {
    const fetchImpl = vi.fn<LayaFetch>(async () => jsonResponse({ answers: cleanAnswers() }));
    await expect(
      resolveExecApprovalLayaAdvice({
        command: "ls",
        commandArgv: ["ls"],
        env: { LAYA_ENABLED: "1", LAYA_API_KEY: "test-key" },
        fetchImpl,
      }),
    ).resolves.toBeUndefined();
    await expect(
      resolveExecApprovalLayaAdvice({
        command: "rm -rf /data",
        commandArgv: ["rm", "-rf", "/data"],
        env: { LAYA_API_KEY: "test-key" },
        fetchImpl,
      }),
    ).resolves.toBeUndefined();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns fail-closed advice when the consult call throws", async () => {
    const fetchImpl = vi.fn<LayaFetch>(async () => {
      throw new Error("boom");
    });
    const advice = await resolveExecApprovalLayaAdvice({
      command: "rm -rf /data",
      env: { LAYA_ENABLED: "1", LAYA_API_KEY: "test-key" },
      fetchImpl,
    });
    expect(advice).toContain("Laya unavailable");
    expect(advice).toContain("Approval is still required");
  });
});
