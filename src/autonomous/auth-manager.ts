/**
 * Auth & session persistence for the autonomous agent.
 *
 * Saves and restores cookies, localStorage, and sessionStorage
 * across agent restarts so that authenticated sessions survive.
 */

import type { BrowserContext, Page } from "playwright-core";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SessionSnapshot = {
  cookies: CookieData[];
  localStorage: Record<string, Record<string, string>>;
  savedAt: string;
};

export type CookieData = {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Strict" | "Lax" | "None";
};

// ---------------------------------------------------------------------------
// AuthManager
// ---------------------------------------------------------------------------

export class AuthManager {
  private readonly sessionFile: string;
  private snapshot: SessionSnapshot | null = null;

  constructor(dataDir: string) {
    this.sessionFile = join(dataDir, "session.json");
  }

  /**
   * Save the current browser session (cookies + localStorage).
   * Call this periodically and on shutdown.
   */
  async save(context: BrowserContext, page: Page): Promise<void> {
    try {
      const cookies = await context.cookies();
      const cookieData: CookieData[] = cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expires,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite as CookieData["sameSite"],
      }));

      // Capture localStorage from the current page
      const localStorageData: Record<string, Record<string, string>> = {};
      try {
        const origin = new URL(page.url()).origin;
        const storage = await page.evaluate(() => {
          const data: Record<string, string> = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) data[key] = localStorage.getItem(key) ?? "";
          }
          return data;
        });
        localStorageData[origin] = storage;
      } catch {
        // Page may not have a valid origin (about:blank, etc.)
      }

      this.snapshot = {
        cookies: cookieData,
        localStorage: localStorageData,
        savedAt: new Date().toISOString(),
      };

      await mkdir(join(this.sessionFile, ".."), { recursive: true });
      await writeFile(this.sessionFile, JSON.stringify(this.snapshot, null, 2));
    } catch {
      // Best-effort — don't crash the agent
    }
  }

  /**
   * Restore a previously saved session into the browser context.
   * Call this on startup before navigating.
   */
  async restore(context: BrowserContext, page: Page): Promise<boolean> {
    try {
      const raw = await readFile(this.sessionFile, "utf-8");
      this.snapshot = JSON.parse(raw);
      if (!this.snapshot) return false;

      // Restore cookies
      if (this.snapshot.cookies.length > 0) {
        await context.addCookies(this.snapshot.cookies);
      }

      // Restore localStorage for each origin
      for (const [origin, storage] of Object.entries(this.snapshot.localStorage)) {
        try {
          // Navigate to origin temporarily to set localStorage
          const currentUrl = page.url();
          if (!currentUrl.startsWith(origin)) {
            await page
              .goto(origin, { waitUntil: "domcontentloaded", timeout: 5000 })
              .catch(() => {});
          }
          await page.evaluate((data: Record<string, string>) => {
            for (const [key, value] of Object.entries(data)) {
              localStorage.setItem(key, value);
            }
          }, storage);
        } catch {
          // Couldn't restore this origin's localStorage
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /** Clear saved session data. */
  async clear(): Promise<void> {
    this.snapshot = null;
    try {
      const { unlink } = await import("node:fs/promises");
      await unlink(this.sessionFile);
    } catch {
      // File may not exist
    }
  }

  /** Get the last saved session info (for status display). */
  getInfo(): { savedAt: string; cookieCount: number; originCount: number } | null {
    if (!this.snapshot) return null;
    return {
      savedAt: this.snapshot.savedAt,
      cookieCount: this.snapshot.cookies.length,
      originCount: Object.keys(this.snapshot.localStorage).length,
    };
  }
}
