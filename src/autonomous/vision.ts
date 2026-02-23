/**
 * Screenshot → Gemini multimodal vision analysis pipeline.
 *
 * Sends browser screenshots to the Google Gemini API for visual
 * understanding and returns structured action recommendations.
 */

import { normalizeBrowserScreenshot } from "../browser/screenshot.js";
import type { Action, AutonomousConfig, Goal, VisionAnalysis } from "./types.js";

// ---------------------------------------------------------------------------
// Vision prompt templates
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an autonomous browser agent. You look at screenshots of web pages and decide what action to take next to achieve a given goal.

RULES:
- Respond ONLY with valid JSON, no markdown, no explanation outside the JSON.
- Be precise with coordinates — point to the CENTER of the element you want to interact with.
- If the goal appears to be achieved, set goalProgress to "done".
- If you are stuck and cannot make progress, set goalProgress to "stuck".
- Confidence should be between 0.0 and 1.0.
- For scrolling, use direction "up" or "down".

RESPONSE FORMAT:
{
  "observation": "Brief description of what you see on the screen",
  "reasoning": "Why you chose this action",
  "suggestedAction": {
    "action": "click|type|scroll|navigate|wait|press_key|done",
    "coordinates": { "x": 0, "y": 0 },
    "text": "text to type (if action is type)",
    "url": "url to navigate to (if action is navigate)",
    "key": "key name (if action is press_key, e.g. Enter, Tab, Escape)",
    "direction": "up|down (if action is scroll)",
    "durationMs": 2000,
    "confidence": 0.95,
    "reasoning": "Specific reason for this action"
  },
  "confidence": 0.95,
  "goalProgress": "continue|done|stuck"
}`;

function buildUserPrompt(goal: Goal, history: string[]): string {
  let prompt = `CURRENT GOAL: ${goal.description}\n`;

  if (goal.context.length > 0) {
    prompt += `\nADDITIONAL CONTEXT:\n${goal.context.slice(-5).join("\n")}\n`;
  }

  if (history.length > 0) {
    prompt += `\nRECENT ACTIONS:\n${history.slice(-5).join("\n")}\n`;
  }

  if (goal.retries > 0) {
    prompt += `\nNOTE: This is retry #${goal.retries}. Previous attempts failed. Try a different approach.\n`;
  }

  prompt += "\nAnalyze the screenshot and decide the next action.";
  return prompt;
}

// ---------------------------------------------------------------------------
// Gemini API client
// ---------------------------------------------------------------------------

type GeminiVisionResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

/**
 * Analyze a browser screenshot using Gemini's multimodal API.
 *
 * @param screenshot - Raw screenshot buffer (PNG or JPEG)
 * @param goal - The current goal being worked on
 * @param config - Autonomous agent config (contains API settings)
 * @param opts - Optional: action history, whether to use fast model
 */
export async function analyzeScreenshot(
  screenshot: Buffer,
  goal: Goal,
  config: AutonomousConfig,
  opts?: {
    history?: string[];
    useFastModel?: boolean;
    apiKey?: string;
  },
): Promise<VisionAnalysis> {
  const apiKey = opts?.apiKey ?? resolveGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "Gemini API key required. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.",
    );
  }

  // Optimize screenshot for API (reduce size/quality)
  const { buffer: optimized } = await normalizeBrowserScreenshot(screenshot, {
    maxSide: 1600,
    maxBytes: 2 * 1024 * 1024,
  });

  const model = opts?.useFastModel ? config.fastModel : config.visionModel;
  const userPrompt = buildUserPrompt(goal, opts?.history ?? []);

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: optimized.toString("base64"),
            },
          },
          { text: userPrompt },
        ],
      },
    ],
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini vision API error: ${response.status} ${text}`);
  }

  const data = (await response.json()) as GeminiVisionResponse;
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error("Gemini returned empty response");
  }

  return parseVisionResponse(rawText);
}

/**
 * Quick observation using the fast model — for simple "what's on screen?" checks.
 */
export async function quickObserve(
  screenshot: Buffer,
  question: string,
  config: AutonomousConfig,
  apiKey?: string,
): Promise<string> {
  const key = apiKey ?? resolveGeminiApiKey();
  if (!key) {
    throw new Error("Gemini API key required.");
  }

  const { buffer: optimized } = await normalizeBrowserScreenshot(screenshot, {
    maxSide: 1200,
    maxBytes: 1 * 1024 * 1024,
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.fastModel}:generateContent?key=${key}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: optimized.toString("base64"),
              },
            },
            { text: question },
          ],
        },
      ],
      generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = (await response.json()) as GeminiVisionResponse;
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

function parseVisionResponse(raw: string): VisionAnalysis {
  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const suggestedAction = parsed.suggestedAction as Record<string, unknown> | undefined;

    const action: Action = {
      action: (suggestedAction?.action as Action["action"]) ?? "wait",
      confidence: Number(suggestedAction?.confidence ?? 0.5),
      reasoning: String(suggestedAction?.reasoning ?? ""),
    };

    if (suggestedAction?.coordinates) {
      const coords = suggestedAction.coordinates as { x: number; y: number };
      action.coordinates = { x: Number(coords.x), y: Number(coords.y) };
    }
    if (suggestedAction?.text) action.text = String(suggestedAction.text);
    if (suggestedAction?.url) action.url = String(suggestedAction.url);
    if (suggestedAction?.key) action.key = String(suggestedAction.key);
    if (suggestedAction?.direction)
      action.direction = suggestedAction.direction as "up" | "down";
    if (suggestedAction?.durationMs) action.durationMs = Number(suggestedAction.durationMs);

    return {
      observation: String(parsed.observation ?? ""),
      reasoning: String(parsed.reasoning ?? ""),
      suggestedAction: action,
      confidence: Number(parsed.confidence ?? 0.5),
      goalProgress: (parsed.goalProgress as VisionAnalysis["goalProgress"]) ?? "continue",
    };
  } catch {
    // If JSON parsing fails, return a fallback
    return {
      observation: raw.slice(0, 200),
      reasoning: "Failed to parse Gemini response as JSON",
      suggestedAction: {
        action: "wait",
        durationMs: 2000,
        confidence: 0.1,
        reasoning: "Parsing error — waiting",
      },
      confidence: 0.1,
      goalProgress: "continue",
    };
  }
}

// ---------------------------------------------------------------------------
// API key resolution
// ---------------------------------------------------------------------------

function resolveGeminiApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    undefined
  );
}

export { buildUserPrompt, resolveGeminiApiKey };
