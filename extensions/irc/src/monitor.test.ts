import { describe, expect, it } from "vitest";
import { resolveIrcInboundTarget } from "./monitor.js";

describe("irc monitor inbound target", () => {
  it("keeps channel target for group messages", () => {
    expect(
      resolveIrcInboundTarget({
        target: "#agdi",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: true,
      target: "#agdi",
      rawTarget: "#agdi",
    });
  });

  it("maps DM target to sender nick and preserves raw target", () => {
    expect(
      resolveIrcInboundTarget({
        target: "agdi-bot",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: false,
      target: "alice",
      rawTarget: "agdi-bot",
    });
  });

  it("falls back to raw target when sender nick is empty", () => {
    expect(
      resolveIrcInboundTarget({
        target: "agdi-bot",
        senderNick: " ",
      }),
    ).toEqual({
      isGroup: false,
      target: "agdi-bot",
      rawTarget: "agdi-bot",
    });
  });
});
