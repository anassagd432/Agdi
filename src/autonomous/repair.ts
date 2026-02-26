/**
 * Self-healing error diagnosis and recovery.
 *
 * Classifies errors, determines repair strategies, and applies fixes.
 * Each repair strategy has a max attempt limit before escalating to the user.
 */

import type { Action, ErrorType, Goal, RepairDiagnosis, VisionAnalysis } from "./types.js";

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

const ERROR_PATTERNS: Array<{ type: ErrorType; patterns: RegExp[] }> = [
  {
    type: "NETWORK_ERROR",
    patterns: [
      /net::ERR_/i,
      /ECONNREFUSED/i,
      /ECONNRESET/i,
      /ETIMEDOUT/i,
      /fetch failed/i,
      /network\s*error/i,
      /ERR_INTERNET_DISCONNECTED/i,
    ],
  },
  {
    type: "TIMEOUT",
    patterns: [/timeout/i, /timed?\s*out/i, /exceeded.*time/i, /waiting.*exceeded/i],
  },
  {
    type: "AUTH_EXPIRED",
    patterns: [
      /401/,
      /403/,
      /unauthorized/i,
      /forbidden/i,
      /session\s*expired/i,
      /login\s*required/i,
      /sign\s*in/i,
    ],
  },
  {
    type: "SELECTOR_CHANGED",
    patterns: [
      /element.*not\s*found/i,
      /no\s*such\s*element/i,
      /selector.*did\s*not\s*match/i,
      /ref.*not\s*found/i,
      /locator.*resolved.*nothing/i,
    ],
  },
  {
    type: "CAPTCHA",
    patterns: [
      /captcha/i,
      /recaptcha/i,
      /hcaptcha/i,
      /verify.*human/i,
      /robot\s*check/i,
      /challenge/i,
    ],
  },
  {
    type: "PAGE_CRASH",
    patterns: [
      /crashed/i,
      /page\s*closed/i,
      /context\s*destroyed/i,
      /target\s*closed/i,
      /browser\s*disconnected/i,
    ],
  },
];

/**
 * Classify an error into one of the known error types.
 */
export function classifyError(error: Error, visionContext?: VisionAnalysis): ErrorType {
  const message = error.message;

  // Check vision context for visual cues
  if (visionContext?.observation) {
    const obs = visionContext.observation.toLowerCase();
    if (obs.includes("captcha") || obs.includes("verify you are human")) {
      return "CAPTCHA";
    }
    if (obs.includes("login") || obs.includes("sign in") || obs.includes("unauthorized")) {
      return "AUTH_EXPIRED";
    }
  }

  // Check error message against patterns
  for (const { type, patterns } of ERROR_PATTERNS) {
    if (patterns.some((p) => p.test(message))) {
      return type;
    }
  }

  return "LOGIC_ERROR";
}

/**
 * Diagnose an error and suggest a repair strategy.
 */
export function diagnose(
  error: Error,
  goal: Goal,
  visionContext?: VisionAnalysis,
): RepairDiagnosis {
  const type = classifyError(error, visionContext);

  switch (type) {
    case "NETWORK_ERROR":
      return {
        type,
        insight: `Network error: ${error.message}`,
        suggestedFix: "Wait and retry with exponential backoff",
        canAutoRepair: true,
      };

    case "TIMEOUT":
      return {
        type,
        insight: `Operation timed out: ${error.message}`,
        suggestedFix: "Retry with longer timeout or simplified approach",
        canAutoRepair: true,
      };

    case "AUTH_EXPIRED":
      return {
        type,
        insight: "Authentication required or session expired",
        suggestedFix: "Attempt re-login flow or escalate for credentials",
        canAutoRepair: goal.retries < 1, // Only try auto-login once
      };

    case "SELECTOR_CHANGED":
      return {
        type,
        insight: `UI element not found: ${error.message}`,
        suggestedFix: "Switch to vision-only mode (coordinate-based interaction)",
        canAutoRepair: true,
      };

    case "CAPTCHA":
      return {
        type,
        insight: "CAPTCHA or bot detection encountered",
        suggestedFix: "Cannot auto-solve CAPTCHAs — escalate to user",
        canAutoRepair: false,
      };

    case "PAGE_CRASH":
      return {
        type,
        insight: `Browser page crashed: ${error.message}`,
        suggestedFix: "Restart browser context and retry",
        canAutoRepair: true,
      };

    case "LOGIC_ERROR":
      return {
        type,
        insight: `Logic error: ${error.message}`,
        suggestedFix: "Re-plan with the error as context, try alternative approach",
        canAutoRepair: true,
      };

    case "UNRECOVERABLE":
      return {
        type,
        insight: `Unrecoverable error: ${error.message}`,
        suggestedFix: "Cannot auto-repair — escalate to user",
        canAutoRepair: false,
      };
  }
}

// ---------------------------------------------------------------------------
// Repair strategies
// ---------------------------------------------------------------------------

export type RepairResult = {
  repaired: boolean;
  strategy: string;
  goalMutation?: {
    addContext?: string;
    changePriority?: Goal["priority"];
    changeStrategy?: string;
  };
};

/**
 * Attempt to repair a failed goal based on the diagnosis.
 *
 * @returns RepairResult indicating whether the repair succeeded and what changes to apply.
 */
export async function attemptRepair(diagnosis: RepairDiagnosis, goal: Goal): Promise<RepairResult> {
  switch (diagnosis.type) {
    case "NETWORK_ERROR": {
      // Exponential backoff: 2^retries seconds
      const backoffMs = Math.pow(2, goal.retries) * 1000;
      const maxBackoff = 30_000;
      const waitMs = Math.min(backoffMs, maxBackoff);
      await sleep(waitMs);
      return {
        repaired: true,
        strategy: `network-backoff-${waitMs}ms`,
        goalMutation: {
          addContext: `Network error — waited ${waitMs}ms before retry`,
        },
      };
    }

    case "TIMEOUT": {
      return {
        repaired: true,
        strategy: "timeout-retry",
        goalMutation: {
          addContext: "Timeout — retrying with simpler approach",
        },
      };
    }

    case "AUTH_EXPIRED": {
      if (!diagnosis.canAutoRepair) {
        return { repaired: false, strategy: "auth-escalate" };
      }
      return {
        repaired: true,
        strategy: "auth-retry-login",
        goalMutation: {
          addContext: "Auth expired — look for login button or sign-in page",
          changeStrategy: "vision-login-first",
        },
      };
    }

    case "SELECTOR_CHANGED": {
      return {
        repaired: true,
        strategy: "switch-to-vision",
        goalMutation: {
          addContext: "DOM selectors not working — use vision/coordinate-based interaction only",
          changeStrategy: "vision-only",
        },
      };
    }

    case "PAGE_CRASH": {
      // Short wait, then retry — browser context will be re-created
      await sleep(2000);
      return {
        repaired: true,
        strategy: "page-crash-restart",
        goalMutation: {
          addContext: "Browser crashed — restarted context",
        },
      };
    }

    case "LOGIC_ERROR": {
      return {
        repaired: true,
        strategy: "replan",
        goalMutation: {
          addContext: `Previous approach failed (${diagnosis.insight}) — try different method`,
        },
      };
    }

    case "CAPTCHA":
    case "UNRECOVERABLE": {
      return { repaired: false, strategy: "escalate-to-user" };
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
