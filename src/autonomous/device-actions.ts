/**
 * Execute device actions from the agent's action system.
 *
 * This is the device-level counterpart to `visual-actions.ts` (which handles
 * browser-based actions via Playwright). Device actions control the native
 * desktop — mouse, keyboard, apps, and windows.
 */

import type { DeviceController } from "./device-controller.js";
import type { DeviceAction } from "./device/types.js";

// ---------------------------------------------------------------------------
// Humanized timing
// ---------------------------------------------------------------------------

function humanDelay(minMs: number = 50, maxMs: number = 200): number {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Action executor
// ---------------------------------------------------------------------------

/**
 * Execute a single device action using the DeviceController.
 * Returns a screenshot buffer after the action for verification.
 */
export async function executeDeviceAction(
  action: DeviceAction,
  controller: DeviceController,
): Promise<{ screenshot: Buffer | null }> {
  switch (action.action) {
    case "device_click": {
      if (!action.coordinates) throw new Error("device_click requires coordinates");
      await sleep(humanDelay(30, 100));
      await controller.click(action.coordinates.x, action.coordinates.y);
      await sleep(humanDelay(200, 500));
      break;
    }

    case "device_click_image": {
      if (!action.imageTemplatePath)
        throw new Error("device_click_image requires imageTemplatePath");
      await sleep(humanDelay(50, 150));
      const match = await controller.findImageOnScreen(action.imageTemplatePath, 0.8);
      if (match.match && match.x !== undefined && match.y !== undefined) {
        await controller.click(match.x, match.y);
        await sleep(humanDelay(200, 500));
      } else {
        throw new Error(
          `Vision Match Failed: Template ${action.imageTemplatePath} not found on screen`,
        );
      }
      break;
    }

    case "device_double_click": {
      if (!action.coordinates) throw new Error("device_double_click requires coordinates");
      await sleep(humanDelay(30, 100));
      await controller.doubleClick(action.coordinates.x, action.coordinates.y);
      await sleep(humanDelay(200, 500));
      break;
    }

    case "device_right_click": {
      if (!action.coordinates) throw new Error("device_right_click requires coordinates");
      await sleep(humanDelay(30, 100));
      await controller.rightClick(action.coordinates.x, action.coordinates.y);
      await sleep(humanDelay(200, 500));
      break;
    }

    case "device_type": {
      if (!action.text) throw new Error("device_type requires text");
      if (action.coordinates) {
        await controller.click(action.coordinates.x, action.coordinates.y);
        await sleep(humanDelay(100, 200));
      }
      await controller.type(action.text);
      await sleep(humanDelay(100, 300));
      break;
    }

    case "device_press_key": {
      if (!action.key) throw new Error("device_press_key requires key");
      await sleep(humanDelay(50, 150));
      await controller.pressKey(action.key);
      await sleep(humanDelay(200, 400));
      break;
    }

    case "device_hotkey": {
      if (!action.modifiers || !action.key) {
        throw new Error("device_hotkey requires modifiers and key");
      }
      await sleep(humanDelay(50, 150));
      await controller.hotkey(action.modifiers, action.key);
      await sleep(humanDelay(200, 500));
      break;
    }

    case "device_scroll": {
      const dir = action.scrollDirection ?? "down";
      await controller.scroll(dir, action.scrollAmount ?? 3);
      await sleep(humanDelay(300, 600));
      break;
    }

    case "device_drag": {
      if (!action.coordinates || !action.toCoordinates) {
        throw new Error("device_drag requires coordinates and toCoordinates");
      }
      await controller.drag(action.coordinates, action.toCoordinates);
      await sleep(humanDelay(200, 400));
      break;
    }

    case "device_open_app": {
      if (!action.appName) throw new Error("device_open_app requires appName");
      await controller.openApp(action.appName);
      await sleep(humanDelay(1000, 2000)); // Apps take time to launch
      break;
    }

    case "device_open_file": {
      if (!action.filePath) throw new Error("device_open_file requires filePath");
      await controller.openFile(action.filePath);
      await sleep(humanDelay(500, 1000));
      break;
    }

    case "device_open_url": {
      if (!action.url) throw new Error("device_open_url requires url");
      await controller.openUrl(action.url);
      await sleep(humanDelay(500, 1000));
      break;
    }

    case "device_focus_window": {
      if (!action.windowTitle) throw new Error("device_focus_window requires windowTitle");
      await controller.focusWindow(action.windowTitle);
      await sleep(humanDelay(200, 400));
      break;
    }

    case "device_minimize_window": {
      await controller.minimizeWindow(action.windowTitle);
      await sleep(humanDelay(200, 400));
      break;
    }

    case "device_maximize_window": {
      await controller.maximizeWindow(action.windowTitle);
      await sleep(humanDelay(200, 400));
      break;
    }

    case "device_close_window": {
      await controller.closeWindow(action.windowTitle);
      await sleep(humanDelay(200, 400));
      break;
    }

    case "device_screenshot": {
      const screenshot = action.region
        ? await controller.captureRegion(action.region)
        : await controller.captureScreen();
      return { screenshot };
    }

    default: {
      throw new Error(`Unknown device action: ${(action as DeviceAction).action}`);
    }
  }

  // Take a verification screenshot after the action
  const screenshot = await controller.captureScreen();
  return { screenshot };
}

/**
 * Execute a sequence of device actions.
 * Returns all verification screenshots and whether the sequence completed.
 */
export async function executeDeviceActionSequence(
  actions: DeviceAction[],
  controller: DeviceController,
): Promise<{ screenshots: Buffer[]; completed: boolean }> {
  const screenshots: Buffer[] = [];

  for (const action of actions) {
    const result = await executeDeviceAction(action, controller);
    if (result.screenshot) {
      screenshots.push(result.screenshot);
    }
  }

  return { screenshots, completed: true };
}
