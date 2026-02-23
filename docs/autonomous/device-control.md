---
title: "Device Control"
description: "Native mouse, keyboard, and screen control across Linux, macOS, Windows, Android, and iOS."
---

# Device Control

AGDI controls devices at the OS level — no browser automation, no accessibility hacks. It binds directly to platform APIs for pixel-perfect control.

## Supported Platforms

| Platform | Backend | Mouse | Keyboard | Screen | Apps | Windows |
|----------|---------|-------|----------|--------|------|---------|
| **Linux** | X11 / xdotool | ✅ | ✅ | ✅ | ✅ | ✅ |
| **macOS** | osascript / cliclick | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Windows** | PowerShell / P/Invoke | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Android** | ADB | ✅ | ✅ | ✅ | ✅ | — |
| **iOS** | libimobiledevice + WDA | ✅ | ✅ | ✅ | ✅ | — |

## Usage

```typescript
import { DeviceController } from "agdi/autonomous";

const controller = new DeviceController();

// Mouse
await controller.click(500, 250);
await controller.doubleClick(500, 250);
await controller.rightClick(500, 250);
await controller.drag({ x: 100, y: 100 }, { x: 500, y: 500 });
await controller.scroll("down", 3);

// Keyboard
await controller.type("Hello, world!");
await controller.pressKey("Enter");
await controller.hotkey(["ctrl"], "c");

// Screen
const screenshot = await controller.captureScreen();
const size = await controller.getScreenSize();

// Applications
await controller.openApp("firefox");
await controller.openUrl("https://example.com");
await controller.openFile("/path/to/document.pdf");

// Windows
const windows = await controller.listWindows();
await controller.focusWindow("Terminal");
await controller.maximizeWindow();
await controller.closeWindow();
```

## Android (ADB)

```typescript
import { AndroidBackend } from "agdi/autonomous";

const android = new AndroidBackend();

// List connected devices
const devices = await android.listDevices();

// Control
await android.tap(500, 800);
await android.swipe(500, 1500, 500, 500);
await android.typeText("search query");
await android.pressKey("home");

// Apps
await android.launchApp("com.android.chrome");
const apps = await android.listApps();

// Screenshot
const screenshot = await android.screenshot();
```

## iOS (libimobiledevice + WDA)

```typescript
import { IOSBackend } from "agdi/autonomous";

const ios = new IOSBackend();

// Device info
const devices = await ios.listDevices();
const info = await ios.getDeviceInfo();

// Control via WebDriverAgent
await ios.tap(200, 400);
await ios.swipe(200, 600, 200, 200);
await ios.typeText("hello");

// Apps
await ios.launchApp("com.apple.mobilesafari");
const screenshot = await ios.screenshot();
```

## Screen OCR

Read text directly from the screen using Tesseract:

```typescript
import { ScreenOCR } from "agdi/autonomous";

const ocr = new ScreenOCR();
const result = await ocr.readScreen();

console.log(result.text);          // Full text
console.log(result.words);         // Individual words with positions
console.log(result.confidence);    // OCR confidence score

// Find specific text on screen
const location = await ocr.findText("Submit");
if (location) {
  await controller.click(location.x, location.y);
}
```

## Dependency Check

Each backend can check if required tools are installed:

```typescript
const deps = await controller.checkDependencies();
console.log("Available:", deps.available);
console.log("Missing:", deps.missing);
```
