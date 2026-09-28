/**
 * Laya decision support for exec approvals.
 *
 * Laya returns advice for a human reviewer. It never grants permission, never
 * resolves an approval, and never overrides allowlists or safety checks.
 */

const DEFAULT_BASE_URL = "https://api.laya.studio";
const DEFAULT_TIMEOUT_MS = 4_000;
const DEFAULT_CONFIDENCE_MIN = 0.6;
const MIN_TIMEOUT_MS = 250;
const MAX_TIMEOUT_MS = 15_000;
const MAX_ADVICE_CHARS = 420;
const MAX_STATE_CHARS = 4_000;

const POLICY_TEXT =
  "Human exec approval stays required. Laya advice is not permission. It cannot override allowlists, safety checks, or user instructions, and it cannot allow or skip approval.";

const USER_REQUEST_SUMMARY = "Original chat text is not attached to this exec approval check.";

const READ_ONLY_COMMANDS = new Set([
  "ls",
  "cat",
  "head",
  "tail",
  "wc",
  "pwd",
  "echo",
  "printf",
  "true",
  "false",
  "date",
  "whoami",
  "id",
  "uname",
  "hostname",
  "which",
  "file",
  "stat",
  "rg",
  "grep",
  "egrep",
  "fgrep",
  "nl",
  "sort",
  "uniq",
  "cut",
  "tr",
  "basename",
  "dirname",
  "realpath",
  "readlink",
  "printenv",
]);

const GIT_READ_ONLY_SUBCOMMANDS = new Set([
  "status",
  "diff",
  "log",
  "show",
  "rev-parse",
  "rev-list",
  "ls-files",
  "describe",
  "blame",
  "shortlog",
  "name-rev",
  "check-ignore",
  "version",
  "help",
  "symbolic-ref",
]);

const SHELL_WRAPPERS = new Set([
  "sh",
  "bash",
  "zsh",
  "dash",
  "fish",
  "ksh",
  "ash",
  "cmd",
  "powershell",
  "pwsh",
]);

const ALLOW_SIGNAL_VALUES = new Set([
  "allow",
  "allow-once",
  "allow-always",
  "allowed",
  "auto-allow",
  "permit",
]);

const FLAG_IDS = ["uncertainty", "mistakes", "contradictions", "harm"] as const;

const QUESTIONS = {
  uncertainty: {
    type: "noul",
    instructions: "Is there material uncertainty about what this proposed action will do?",
  },
  mistakes: {
    type: "noul",
    instructions: "Does the proposed action look mistaken or aimed at the wrong target?",
  },
  contradictions: {
    type: "noul",
    instructions: "Does the proposed action contradict the policy or the user request summary?",
  },
  harm: {
    type: "noul",
    instructions:
      "Could this action cause hard-to-reverse harm, such as deleting data, spending money, publishing, or sending a message?",
  },
} as const;

export type LayaDecisionFlag = (typeof FLAG_IDS)[number];

export type LayaDecisionSupportInput = {
  userRequestSummary: string;
  action: string;
  args?: string[];
  policy: string;
  evidence?: string;
};

export type LayaDecisionSupportResult = {
  advice: string;
  unavailable: boolean;
  uncertain: boolean;
  flags: LayaDecisionFlag[];
  confidence: number | null;
  /** True when the payload contained an allow-like signal. Callers must ignore it. */
  allowSignalIgnored: boolean;
};

export type LayaFetch = (
  url: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
    signal: AbortSignal;
    redirect: "error";
  },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export type ExecApprovalLayaContext = {
  command: string;
  commandArgv?: string[];
  cwd?: string | null;
  host?: string | null;
  security?: string | null;
  ask?: string | null;
  agentId?: string | null;
  sessionKey?: string | null;
  resolvedPath?: string | null;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: LayaFetch;
};

type ConsultOptions = {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: LayaFetch;
};

function readEnv(env: NodeJS.ProcessEnv | undefined): NodeJS.ProcessEnv {
  return env ?? process.env;
}

function envFlagEnabled(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function isLayaEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return envFlagEnabled(env.LAYA_ENABLED);
}

function readApiKey(env: NodeJS.ProcessEnv): string | null {
  const key = env.LAYA_API_KEY?.trim();
  return key ? key : null;
}

function readBoundedNumber(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!raw?.trim()) {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function readConfidenceMin(env: NodeJS.ProcessEnv): number {
  return readBoundedNumber(env.LAYA_CONFIDENCE_MIN, DEFAULT_CONFIDENCE_MIN, 0, 1);
}

function readTimeoutMs(env: NodeJS.ProcessEnv): number {
  return readBoundedNumber(env.LAYA_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS);
}

function resolveEndpoint(env: NodeJS.ProcessEnv): string | null {
  const raw = env.LAYA_BASE_URL?.trim() || DEFAULT_BASE_URL;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }
  const path = url.pathname.replace(/\/+$/, "");
  if (!path.endsWith("/v1/systemone")) {
    url.pathname = `${path}/v1/systemone`;
  }
  return url.toString();
}

function clampText(text: string, max: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, max - 3))}...`;
}

function unavailableResult(reason: string): LayaDecisionSupportResult {
  return {
    advice: clampText(
      `Laya unavailable (${reason}). Approval is still required. Silence is not clearance.`,
      MAX_ADVICE_CHARS,
    ),
    unavailable: true,
    uncertain: true,
    flags: [],
    confidence: null,
    allowSignalIgnored: false,
  };
}

function commandBasename(token: string): string {
  const trimmed = token.trim().replace(/^['"]|['"]$/g, "");
  const parts = trimmed.split(/[\\/]/);
  return (parts[parts.length - 1] ?? trimmed).toLowerCase();
}

function tokenizeSegment(segment: string): string[] {
  return segment
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

function stripSudo(tokens: string[]): string[] {
  if (commandBasename(tokens[0] ?? "") !== "sudo") {
    return tokens;
  }
  let index = 1;
  while (index < tokens.length && tokens[index]?.startsWith("-")) {
    index += 1;
  }
  return tokens.slice(index);
}

function isReadOnlyGit(args: string[]): boolean {
  const subcommand = args.find((arg) => !arg.startsWith("-"));
  if (!subcommand || !GIT_READ_ONLY_SUBCOMMANDS.has(subcommand)) {
    return false;
  }
  return !args.some((arg) => arg === "--hard" || arg === "-d" || arg === "-D");
}

function isReadOnlyInvocation(tokens: string[]): boolean {
  const argv = stripSudo(tokens);
  if (argv.length === 0) {
    return false;
  }
  const bin = commandBasename(argv[0] ?? "");
  if (bin === "git") {
    return isReadOnlyGit(argv.slice(1));
  }
  return READ_ONLY_COMMANDS.has(bin);
}

/**
 * Split a shell command into segments. Returns null when the command contains
 * expansion, redirects, or quoting we will not treat as read-only.
 */
function splitShellSegments(command: string): string[] | null {
  const segments: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  for (let index = 0; index < command.length; index += 1) {
    const char = command[index] ?? "";
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "`" || char === "$" || char === ">" || char === "<") {
      return null;
    }
    if (char === "\n" || char === ";" || char === "|") {
      if (char === "|" && command[index + 1] === "|") {
        index += 1;
      }
      segments.push(current);
      current = "";
      continue;
    }
    if (char === "&") {
      if (command[index + 1] !== "&") {
        return null;
      }
      index += 1;
      segments.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (quote) {
    return null;
  }
  segments.push(current);
  return segments;
}

function isReadOnlyShellCommand(command: string): boolean {
  const segments = splitShellSegments(command);
  if (!segments || segments.length === 0) {
    return false;
  }
  return segments.every((segment) => isReadOnlyInvocation(tokenizeSegment(segment)));
}

function extractShellScript(tokens: string[]): string | null {
  const flagIndex = tokens.findIndex(
    (token) =>
      token === "-c" ||
      token === "-lc" ||
      token === "--command" ||
      token === "-Command" ||
      token === "-command",
  );
  if (flagIndex < 0) {
    return null;
  }
  const script = tokens[flagIndex + 1];
  return script?.trim() ? script : null;
}

/**
 * Read-only commands do not need Laya. Anything else on the approval path is
 * treated as consequential so advice is requested rather than skipped.
 */
export function isConsequentialExecAction(command: string, argv?: string[]): boolean {
  const direct = argv?.map((token) => token.trim()).filter((token) => token.length > 0);
  if (direct && direct.length > 0) {
    const unwrapped = stripSudo(direct);
    if (SHELL_WRAPPERS.has(commandBasename(unwrapped[0] ?? ""))) {
      const script = extractShellScript(unwrapped);
      return script ? !isReadOnlyShellCommand(script) : true;
    }
    return !isReadOnlyInvocation(unwrapped);
  }
  return !isReadOnlyShellCommand(command);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readUnitInterval(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    return null;
  }
  return value;
}

function isAllowSignal(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return ALLOW_SIGNAL_VALUES.has(normalized) || normalized.startsWith("allow");
}

function readFlagList(value: unknown): LayaDecisionFlag[] {
  if (!isRecord(value)) {
    return [];
  }
  const flags: LayaDecisionFlag[] = [];
  for (const flag of FLAG_IDS) {
    if (value[flag] === true) {
      flags.push(flag);
    }
  }
  return flags;
}

type ParsedLayaBody = {
  flags: LayaDecisionFlag[];
  confidence: number | null;
  uncertain: boolean;
  allowSignalIgnored: boolean;
};

function confidenceForAnswer(answer: Record<string, unknown>, noul: number | null): number | null {
  const explicit = readUnitInterval(answer.confidence);
  if (explicit !== null) {
    return explicit;
  }
  if (noul === null) {
    return null;
  }
  return Math.max(noul, 1 - noul);
}

function parseLayaBody(body: unknown, confidenceMin: number): ParsedLayaBody | null {
  if (!isRecord(body)) {
    return null;
  }
  const answers = isRecord(body.answers) ? body.answers : null;
  if (!answers && !isRecord(body.flags)) {
    return null;
  }

  const flags = new Set<LayaDecisionFlag>(readFlagList(body.flags));
  const confidences: number[] = [];
  let uncertain = false;
  let allowSignalIgnored = isAllowSignal(body.decision);

  const topConfidence = readUnitInterval(body.confidence);
  if (topConfidence !== null) {
    confidences.push(topConfidence);
  }

  if (isRecord(body.action) && body.action.act === true) {
    allowSignalIgnored = true;
  }

  for (const flag of FLAG_IDS) {
    const answer = answers?.[flag];
    if (!isRecord(answer)) {
      if (!flags.has(flag)) {
        uncertain = true;
      }
      continue;
    }
    if (isAllowSignal(answer.choice) || isAllowSignal(answer.decision)) {
      allowSignalIgnored = true;
    }
    if (isRecord(answer.action) && answer.action.act === true) {
      allowSignalIgnored = true;
    }
    const noul = readUnitInterval(answer.noul);
    if (noul !== null && noul >= 0.5) {
      flags.add(flag);
    } else if (noul !== null && noul >= 0.4) {
      uncertain = true;
    }
    const confidence = confidenceForAnswer(answer, noul);
    if (confidence === null || confidence < confidenceMin) {
      uncertain = true;
    }
    if (confidence !== null) {
      confidences.push(confidence);
    }
  }

  if (answers) {
    for (const answer of Object.values(answers)) {
      if (!isRecord(answer)) {
        continue;
      }
      if (isAllowSignal(answer.choice) || isAllowSignal(answer.decision)) {
        allowSignalIgnored = true;
      }
      if (isRecord(answer.action) && answer.action.act === true) {
        allowSignalIgnored = true;
      }
    }
  }

  const confidence = confidences.length > 0 ? Math.min(...confidences) : topConfidence;
  if (confidence === null || confidence < confidenceMin) {
    uncertain = true;
  }
  if (flags.size > 0) {
    uncertain = true;
  }

  return {
    flags: FLAG_IDS.filter((flag) => flags.has(flag)),
    confidence,
    uncertain,
    allowSignalIgnored,
  };
}

function flagLabel(flag: LayaDecisionFlag): string {
  switch (flag) {
    case "mistakes":
      return "possible mistake";
    case "contradictions":
      return "contradiction";
    default:
      return flag;
  }
}

function adviceFromParsed(parsed: ParsedLayaBody): string {
  const ignored = parsed.allowSignalIgnored ? " An allow-like Laya signal was ignored." : "";
  if (parsed.flags.length > 0) {
    const labels = parsed.flags.map(flagLabel).join(", ");
    return clampText(
      `Laya advice only, not permission: ${labels}. Approval is still required.${ignored}`,
      MAX_ADVICE_CHARS,
    );
  }
  if (parsed.uncertain) {
    return clampText(
      `Laya advice uncertain. Approval is still required. Confidence is not permission.${ignored}`,
      MAX_ADVICE_CHARS,
    );
  }
  return clampText(
    "Laya advice only, not permission: no uncertainty, mistake, contradiction, or harm flag. Approval is still required. This does not allow the action." +
      ignored,
    MAX_ADVICE_CHARS,
  );
}

function defaultFetch(url: string, init: Parameters<LayaFetch>[1]): ReturnType<LayaFetch> {
  return fetch(url, init);
}

function isAbortError(err: unknown): boolean {
  return isRecord(err) && err.name === "AbortError";
}

async function postSystemOne(params: {
  url: string;
  apiKey: string;
  body: string;
  timeoutMs: number;
  fetchImpl: LayaFetch;
}): Promise<{ ok: true; body: unknown } | { ok: false; reason: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), params.timeoutMs);
  try {
    const response = await params.fetchImpl(params.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: params.body,
      signal: controller.signal,
      redirect: "error",
    });
    if (!response.ok) {
      return { ok: false, reason: `HTTP ${response.status}` };
    }
    return { ok: true, body: await response.json() };
  } catch (err) {
    return { ok: false, reason: isAbortError(err) ? "timeout" : "request failed" };
  } finally {
    clearTimeout(timer);
  }
}

function buildState(input: LayaDecisionSupportInput): string {
  const args = input.args && input.args.length > 0 ? input.args.join(" ") : "(none)";
  const evidence = input.evidence?.trim() || "(none)";
  return clampText(
    [
      `Proposed action: ${input.action}`,
      `Arguments: ${args}`,
      `Policy: ${input.policy}`,
      `User request summary: ${input.userRequestSummary}`,
      `Evidence: ${evidence}`,
    ].join("\n"),
    MAX_STATE_CHARS,
  );
}

export async function consultLayaDecisionSupport(
  input: LayaDecisionSupportInput,
  options?: ConsultOptions,
): Promise<LayaDecisionSupportResult> {
  const env = readEnv(options?.env);
  const apiKey = readApiKey(env);
  if (!apiKey) {
    return unavailableResult("missing API key");
  }
  const endpoint = resolveEndpoint(env);
  if (!endpoint) {
    return unavailableResult("invalid base URL");
  }
  const confidenceMin = readConfidenceMin(env);
  const posted = await postSystemOne({
    url: endpoint,
    apiKey,
    body: JSON.stringify({
      state: buildState(input),
      questions: QUESTIONS,
    }),
    timeoutMs: readTimeoutMs(env),
    fetchImpl: options?.fetchImpl ?? defaultFetch,
  });
  if (!posted.ok) {
    return unavailableResult(posted.reason);
  }
  const parsed = parseLayaBody(posted.body, confidenceMin);
  if (!parsed) {
    return unavailableResult("invalid response");
  }
  return {
    advice: adviceFromParsed(parsed),
    unavailable: false,
    uncertain: parsed.uncertain,
    flags: parsed.flags,
    confidence: parsed.confidence,
    allowSignalIgnored: parsed.allowSignalIgnored,
  };
}

function evidenceForApproval(input: ExecApprovalLayaContext): string {
  const parts = [
    input.host ? `host=${input.host}` : "",
    input.cwd ? `cwd=${input.cwd}` : "",
    input.security ? `security=${input.security}` : "",
    input.ask ? `ask=${input.ask}` : "",
    input.agentId ? `agent=${input.agentId}` : "",
    input.sessionKey ? `session=${input.sessionKey}` : "",
    input.resolvedPath ? `resolvedPath=${input.resolvedPath}` : "",
  ].filter((part) => part.length > 0);
  return parts.join("; ");
}

/**
 * Advice string for a pending exec approval, or undefined when Laya is off
 * or the command is read-only. Failures still return advice and never throw.
 */
export async function resolveExecApprovalLayaAdvice(
  input: ExecApprovalLayaContext,
): Promise<string | undefined> {
  try {
    const env = readEnv(input.env);
    if (!isLayaEnabled(env)) {
      return undefined;
    }
    if (!isConsequentialExecAction(input.command, input.commandArgv)) {
      return undefined;
    }
    const result = await consultLayaDecisionSupport(
      {
        userRequestSummary: USER_REQUEST_SUMMARY,
        action: input.command,
        args: input.commandArgv,
        policy: POLICY_TEXT,
        evidence: evidenceForApproval(input),
      },
      { env, fetchImpl: input.fetchImpl },
    );
    return result.advice;
  } catch {
    return unavailableResult("internal error").advice;
  }
}
