/**
 * Execute browser actions based on Gemini vision responses.
 *
 * Bridges the gap between VisionAnalysis (coordinates-based) and
 * Playwright's page API. Adds humanized delays between actions.
 */

import type { Page } from "playwright-core";
import type { Action } from "./types.js";

// ---------------------------------------------------------------------------
// Humanized timing
// ---------------------------------------------------------------------------

/** Random delay between min and max ms. */
function humanDelay(minMs: number = 50, maxMs: number = 200): number {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/** Sleep for `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Action executor
// ---------------------------------------------------------------------------

/**
 * Execute a single visual action on a Playwright Page.
 *
 * Returns a screenshot buffer after the action for verification.
 */
export async function executeVisualAction(
  action: Action,
  page: Page,
): Promise<{ screenshot: Buffer | null }> {
  switch (action.action) {
    case "click": {
      if (!action.coordinates) {
        throw new Error("Click action requires coordinates");
      }
      await sleep(humanDelay(30, 100));
      // Move mouse smoothly to the target
      await page.mouse.move(action.coordinates.x, action.coordinates.y, {
        steps: 5,
      });
      await sleep(humanDelay(20, 60));
      await page.mouse.click(action.coordinates.x, action.coordinates.y);
      await sleep(humanDelay(200, 500));
      break;
    }

    case "type": {
      if (!action.text) {
        throw new Error("Type action requires text");
      }
      // If coordinates provided, click the target field first
      if (action.coordinates) {
        await page.mouse.click(action.coordinates.x, action.coordinates.y);
        await sleep(humanDelay(100, 200));
      }
      // Type with human-like delays between keystrokes
      await page.keyboard.type(action.text, {
        delay: humanDelay(30, 80),
      });
      await sleep(humanDelay(100, 300));
      break;
    }

    case "press_key": {
      if (!action.key) {
        throw new Error("Press key action requires key name");
      }
      await sleep(humanDelay(50, 150));
      await page.keyboard.press(action.key);
      await sleep(humanDelay(200, 400));
      break;
    }

    case "scroll": {
      const deltaY = action.direction === "up" ? -400 : 400;
      await page.mouse.wheel(0, deltaY);
      await sleep(humanDelay(300, 600));
      break;
    }

    case "navigate": {
      if (!action.url) {
        throw new Error("Navigate action requires url");
      }
      await page.goto(action.url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await sleep(humanDelay(500, 1000));
      break;
    }

    case "wait": {
      const duration = action.durationMs ?? 2000;
      await sleep(duration);
      break;
    }

    case "screenshot": {
      // Just take a screenshot, no other action
      break;
    }

    case "done": {
      // Agent signaled completion — no browser action needed
      return { screenshot: null };
    }

    default: {
      throw new Error(`Unknown action type: ${(action as Action).action}`);
    }
  }

  // Take a verification screenshot after the action
  const screenshot = await page.screenshot({
    type: "jpeg",
    quality: 80,
  });

  return { screenshot: Buffer.from(screenshot) };
}

/**
 * Execute a sequence of actions. Stops early if the agent signals "done".
 */
export async function executeActionSequence(
  actions: Action[],
  page: Page,
): Promise<{ screenshots: Buffer[]; completed: boolean }> {
  const screenshots: Buffer[] = [];

  for (const action of actions) {
    if (action.action === "done") {
      return { screenshots, completed: true };
    }

    const result = await executeVisualAction(action, page);
    if (result.screenshot) {
      screenshots.push(result.screenshot);
    }
  }

  return { screenshots, completed: false };
}
