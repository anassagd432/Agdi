import { describe, expect, it } from "vitest";
import { resolveEmojiAndHomepage } from "./entry-metadata.js";

describe("shared/entry-metadata", () => {
  it("prefers metadata emoji and homepage when present", () => {
    expect(
      resolveEmojiAndHomepage({
        metadata: { emoji: "ðŸ¦€", homepage: " https://openclaw.ai " },
        frontmatter: { emoji: "ðŸ™‚", homepage: "https://example.com" },
      }),
    ).toEqual({
      emoji: "ðŸ¦€",
      homepage: "https://openclaw.ai",
    });
  });

  it("keeps metadata precedence even when metadata values are blank", () => {
    expect(
      resolveEmojiAndHomepage({
        metadata: { emoji: "", homepage: "   " },
        frontmatter: { emoji: "ðŸ™‚", homepage: "https://example.com" },
      }),
    ).toEqual({});
  });

  it("falls back through frontmatter homepage aliases and drops blanks", () => {
    expect(
      resolveEmojiAndHomepage({
        frontmatter: { emoji: "ðŸ™‚", website: " https://docs.agdi.ai " },
      }),
    ).toEqual({
      emoji: "ðŸ™‚",
      homepage: "https://docs.agdi.ai",
    });
    expect(
      resolveEmojiAndHomepage({
        metadata: { homepage: "   " },
        frontmatter: { url: "   " },
      }),
    ).toEqual({});
    expect(
      resolveEmojiAndHomepage({
        frontmatter: { url: " https://openclaw.ai/install " },
      }),
    ).toEqual({
      homepage: "https://openclaw.ai/install",
    });
  });

  it("does not fall back once frontmatter homepage aliases are present but blank", () => {
    expect(
      resolveEmojiAndHomepage({
        frontmatter: {
          homepage: " ",
          website: "https://docs.agdi.ai",
          url: "https://openclaw.ai/install",
        },
      }),
    ).toEqual({});
  });
});
