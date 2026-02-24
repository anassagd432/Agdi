/**
 * Decision engine for choosing between DOM-based and visual approaches.
 *
 * Evaluates the current page state and goal to determine the optimal
 * interaction strategy: pure DOM manipulation, visual (coordinate-based),
 * or a hybrid combining both.
 */

import type { Page } from "playwright-core";
import type { Goal, VisionAnalysis } from "./types.js";

// ---------------------------------------------------------------------------
// Strategy selection
// ---------------------------------------------------------------------------

export type InteractionStrategy = "dom" | "vision" | "hybrid";

/**
 * Decide which interaction strategy to use for the current page + goal.
 *
 * Decision factors:
 * - If the page has rich ARIA roles and accessible elements → DOM
 * - If previous attempts with DOM failed → vision
 * - If the page uses canvas/WebGL → vision
 * - Default → hybrid (try DOM first, fall back to vision)
 */
export async function decideStrategy(
  page: Page,
  goal: Goal,
): Promise<InteractionStrategy> {
  // If the goal context explicitly says to use vision-only
  if (goal.context.some((c) => c.includes("vision-only") || c.includes("coordinate-based"))) {
    return "vision";
  }

  // If the goal context says DOM selectors aren't working
  if (goal.context.some((c) => c.includes("DOM selectors not working"))) {
    return "vision";
  }

  // Try to assess the page structure
  try {
    const accessibilityInfo = await assessPageAccessibility(page);

    if (accessibilityInfo.hasCanvas || accessibilityInfo.hasWebGL) {
      return "vision";
    }

    if (accessibilityInfo.interactiveElements > 5) {
      return "hybrid";
    }

    if (accessibilityInfo.interactiveElements > 0) {
      return "dom";
    }

    // No interactive elements found via DOM — use vision
    return "vision";
  } catch {
    // If we can't assess the page, default to vision (safest)
    return "vision";
  }
}

// ---------------------------------------------------------------------------
// Goal progress assessment
// ---------------------------------------------------------------------------

/**
 * Assess whether the current goal step is complete based on vision analysis.
 */
export function assessGoalProgress(
  goal: Goal,
  analysis: VisionAnalysis,
): "continue" | "done" | "stuck" {
  // Trust the vision model's assessment if confidence is high
  if (analysis.confidence >= 0.8) {
    return analysis.goalProgress;
  }

  // If confidence is low but the model says "done", verify
  if (analysis.goalProgress === "done" && analysis.confidence >= 0.6) {
    return "done";
  }

  // If the model says "stuck", trust it even at lower confidence
  if (analysis.goalProgress === "stuck" && analysis.confidence >= 0.5) {
    return "stuck";
  }

  return "continue";
}

// ---------------------------------------------------------------------------
// Page accessibility assessment
// ---------------------------------------------------------------------------

type PageAccessibility = {
  interactiveElements: number;
  hasCanvas: boolean;
  hasWebGL: boolean;
  hasIframes: boolean;
  hasShadowDom: boolean;
};

async function assessPageAccessibility(page: Page): Promise<PageAccessibility> {
  try {
    const result = await page.evaluate(() => {
      const interactive = document.querySelectorAll(
        'a, button, input, select, textarea, [role="button"], [role="link"], [role="textbox"], [role="combobox"], [tabindex]',
      );

      const canvases = document.querySelectorAll("canvas");
      const hasWebGL = Array.from(canvases).some((canvas) => {
        try {
          return !!(
            canvas.getContext("webgl") ||
            canvas.getContext("webgl2") ||
            canvas.getContext("experimental-webgl")
          );
        } catch {
          return false;
        }
      });

      const iframes = document.querySelectorAll("iframe");
      const shadowHosts = document.querySelectorAll("*");
      let hasShadowDom = false;
      for (const el of shadowHosts) {
        if (el.shadowRoot) {
          hasShadowDom = true;
          break;
        }
      }

      return {
        interactiveElements: interactive.length,
        hasCanvas: canvases.length > 0,
        hasWebGL,
        hasIframes: iframes.length > 0,
        hasShadowDom,
      };
    });

    return result;
  } catch {
    return {
      interactiveElements: 0,
      hasCanvas: false,
      hasWebGL: false,
      hasIframes: false,
      hasShadowDom: false,
    };
  }
}

export { assessPageAccessibility };
