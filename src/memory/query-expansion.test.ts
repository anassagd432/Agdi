import { describe, expect, it } from "vitest";
import { expandQueryForFts, extractKeywords } from "./query-expansion.js";

describe("extractKeywords", () => {
  it("extracts keywords from English conversational query", () => {
    const keywords = extractKeywords("that thing we discussed about the API");
    expect(keywords).toContain("discussed");
    expect(keywords).toContain("api");
    // Should not include stop words
    expect(keywords).not.toContain("that");
    expect(keywords).not.toContain("thing");
    expect(keywords).not.toContain("we");
    expect(keywords).not.toContain("about");
    expect(keywords).not.toContain("the");
  });

  it("extracts keywords from Chinese conversational query", () => {
    const keywords = extractKeywords("ä¹‹å‰è®¨è®ºçš„é‚£ä¸ªæ–¹æ¡ˆ");
    expect(keywords).toContain("è®¨è®º");
    expect(keywords).toContain("æ–¹æ¡ˆ");
    // Should not include stop words
    expect(keywords).not.toContain("ä¹‹å‰");
    expect(keywords).not.toContain("çš„");
    expect(keywords).not.toContain("é‚£ä¸ª");
  });

  it("extracts keywords from mixed language query", () => {
    const keywords = extractKeywords("æ˜¨å¤©è®¨è®ºçš„ API design");
    expect(keywords).toContain("è®¨è®º");
    expect(keywords).toContain("api");
    expect(keywords).toContain("design");
  });

  it("returns specific technical terms", () => {
    const keywords = extractKeywords("what was the solution for the CFR bug");
    expect(keywords).toContain("solution");
    expect(keywords).toContain("cfr");
    expect(keywords).toContain("bug");
  });

  it("extracts keywords from Korean conversational query", () => {
    const keywords = extractKeywords("ì–´ì œ ë…¼ì˜í•œ ë°°í¬ ì „ëžµ");
    expect(keywords).toContain("ë…¼ì˜í•œ");
    expect(keywords).toContain("ë°°í¬");
    expect(keywords).toContain("ì „ëžµ");
    // Should not include stop words
    expect(keywords).not.toContain("ì–´ì œ");
  });

  it("strips Korean particles to extract stems", () => {
    const keywords = extractKeywords("ì„œë²„ì—ì„œ ë°œìƒí•œ ì—ëŸ¬ë¥¼ í™•ì¸");
    expect(keywords).toContain("ì„œë²„");
    expect(keywords).toContain("ì—ëŸ¬");
    expect(keywords).toContain("í™•ì¸");
  });

  it("filters Korean stop words including inflected forms", () => {
    const keywords = extractKeywords("ë‚˜ëŠ” ê·¸ë¦¬ê³  ê·¸ëž˜ì„œ");
    expect(keywords).not.toContain("ë‚˜");
    expect(keywords).not.toContain("ë‚˜ëŠ”");
    expect(keywords).not.toContain("ê·¸ë¦¬ê³ ");
    expect(keywords).not.toContain("ê·¸ëž˜ì„œ");
  });

  it("filters inflected Korean stop words not explicitly listed", () => {
    const keywords = extractKeywords("ê·¸ë…€ëŠ” ìš°ë¦¬ëŠ”");
    expect(keywords).not.toContain("ê·¸ë…€ëŠ”");
    expect(keywords).not.toContain("ìš°ë¦¬ëŠ”");
    expect(keywords).not.toContain("ê·¸ë…€");
    expect(keywords).not.toContain("ìš°ë¦¬");
  });

  it("does not produce bogus single-char stems from particle stripping", () => {
    const keywords = extractKeywords("ë…¼ì˜");
    expect(keywords).toContain("ë…¼ì˜");
    expect(keywords).not.toContain("ë…¼");
  });

  it("strips longest Korean trailing particles first", () => {
    const keywords = extractKeywords("ê¸°ëŠ¥ìœ¼ë¡œ ì„¤ëª…");
    expect(keywords).toContain("ê¸°ëŠ¥");
    expect(keywords).not.toContain("ê¸°ëŠ¥ìœ¼");
  });

  it("keeps stripped ASCII stems for mixed Korean tokens", () => {
    const keywords = extractKeywords("APIë¥¼ ë°°í¬í–ˆë‹¤");
    expect(keywords).toContain("api");
    expect(keywords).toContain("ë°°í¬í–ˆë‹¤");
  });

  it("handles mixed Korean and English query", () => {
    const keywords = extractKeywords("API ë°°í¬ì— ëŒ€í•œ ë…¼ì˜");
    expect(keywords).toContain("api");
    expect(keywords).toContain("ë°°í¬");
    expect(keywords).toContain("ë…¼ì˜");
  });

  it("extracts keywords from Japanese conversational query", () => {
    const keywords = extractKeywords("æ˜¨æ—¥è©±ã—ãŸãƒ‡ãƒ—ãƒ­ã‚¤æˆ¦ç•¥");
    expect(keywords).toContain("ãƒ‡ãƒ—ãƒ­ã‚¤");
    expect(keywords).toContain("æˆ¦ç•¥");
    expect(keywords).not.toContain("æ˜¨æ—¥");
  });

  it("handles mixed Japanese and English query", () => {
    const keywords = extractKeywords("æ˜¨æ—¥è©±ã—ãŸAPIã®ãƒã‚°");
    expect(keywords).toContain("api");
    expect(keywords).toContain("ãƒã‚°");
    expect(keywords).not.toContain("ã—ãŸ");
  });

  it("filters Japanese stop words", () => {
    const keywords = extractKeywords("ã“ã‚Œ ãã‚Œ ãã—ã¦ ã©ã†");
    expect(keywords).not.toContain("ã“ã‚Œ");
    expect(keywords).not.toContain("ãã‚Œ");
    expect(keywords).not.toContain("ãã—ã¦");
    expect(keywords).not.toContain("ã©ã†");
  });

  it("extracts keywords from Spanish conversational query", () => {
    const keywords = extractKeywords("ayer hablamos sobre la estrategia de despliegue");
    expect(keywords).toContain("estrategia");
    expect(keywords).toContain("despliegue");
    expect(keywords).not.toContain("ayer");
    expect(keywords).not.toContain("sobre");
  });

  it("extracts keywords from Portuguese conversational query", () => {
    const keywords = extractKeywords("ontem falamos sobre a estratÃ©gia de implantaÃ§Ã£o");
    expect(keywords).toContain("estratÃ©gia");
    expect(keywords).toContain("implantaÃ§Ã£o");
    expect(keywords).not.toContain("ontem");
    expect(keywords).not.toContain("sobre");
  });

  it("filters Spanish and Portuguese question stop words", () => {
    const keywords = extractKeywords("cÃ³mo cuando donde porquÃª quando onde");
    expect(keywords).not.toContain("cÃ³mo");
    expect(keywords).not.toContain("cuando");
    expect(keywords).not.toContain("donde");
    expect(keywords).not.toContain("porquÃª");
    expect(keywords).not.toContain("quando");
    expect(keywords).not.toContain("onde");
  });

  it("extracts keywords from Arabic conversational query", () => {
    const keywords = extractKeywords("Ø¨Ø§Ù„Ø£Ù…Ø³ Ù†Ø§Ù‚Ø´Ù†Ø§ Ø§Ø³ØªØ±Ø§ØªÙŠØ¬ÙŠØ© Ø§Ù„Ù†Ø´Ø±");
    expect(keywords).toContain("Ù†Ø§Ù‚Ø´Ù†Ø§");
    expect(keywords).toContain("Ø§Ø³ØªØ±Ø§ØªÙŠØ¬ÙŠØ©");
    expect(keywords).toContain("Ø§Ù„Ù†Ø´Ø±");
    expect(keywords).not.toContain("Ø¨Ø§Ù„Ø£Ù…Ø³");
  });

  it("filters Arabic question stop words", () => {
    const keywords = extractKeywords("ÙƒÙŠÙ Ù…ØªÙ‰ Ø£ÙŠÙ† Ù…Ø§Ø°Ø§");
    expect(keywords).not.toContain("ÙƒÙŠÙ");
    expect(keywords).not.toContain("Ù…ØªÙ‰");
    expect(keywords).not.toContain("Ø£ÙŠÙ†");
    expect(keywords).not.toContain("Ù…Ø§Ø°Ø§");
  });

  it("handles empty query", () => {
    expect(extractKeywords("")).toEqual([]);
    expect(extractKeywords("   ")).toEqual([]);
  });

  it("handles query with only stop words", () => {
    const keywords = extractKeywords("the a an is are");
    expect(keywords.length).toBe(0);
  });

  it("removes duplicate keywords", () => {
    const keywords = extractKeywords("test test testing");
    const testCount = keywords.filter((k) => k === "test").length;
    expect(testCount).toBe(1);
  });
});

describe("expandQueryForFts", () => {
  it("returns original query and extracted keywords", () => {
    const result = expandQueryForFts("that API we discussed");
    expect(result.original).toBe("that API we discussed");
    expect(result.keywords).toContain("api");
    expect(result.keywords).toContain("discussed");
  });

  it("builds expanded OR query for FTS", () => {
    const result = expandQueryForFts("the solution for bugs");
    expect(result.expanded).toContain("OR");
    expect(result.expanded).toContain("solution");
    expect(result.expanded).toContain("bugs");
  });

  it("returns original query when no keywords extracted", () => {
    const result = expandQueryForFts("the");
    expect(result.keywords.length).toBe(0);
    expect(result.expanded).toBe("the");
  });
});
