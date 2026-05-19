/**
 * Query expansion for FTS-only search mode.
 *
 * When no embedding provider is available, we fall back to FTS (full-text search).
 * FTS works best with specific keywords, but users often ask conversational queries
 * like "that thing we discussed yesterday" or "ä¹‹å‰è®¨è®ºçš„é‚£ä¸ªæ–¹æ¡ˆ".
 *
 * This module extracts meaningful keywords from such queries to improve FTS results.
 */

// Common stop words that don't add search value
const STOP_WORDS_EN = new Set([
  // Articles and determiners
  "a",
  "an",
  "the",
  "this",
  "that",
  "these",
  "those",
  // Pronouns
  "i",
  "me",
  "my",
  "we",
  "our",
  "you",
  "your",
  "he",
  "she",
  "it",
  "they",
  "them",
  // Common verbs
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "can",
  "may",
  "might",
  // Prepositions
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "about",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "between",
  "under",
  "over",
  // Conjunctions
  "and",
  "or",
  "but",
  "if",
  "then",
  "because",
  "as",
  "while",
  "when",
  "where",
  "what",
  "which",
  "who",
  "how",
  "why",
  // Time references (vague, not useful for FTS)
  "yesterday",
  "today",
  "tomorrow",
  "earlier",
  "later",
  "recently",
  "before",
  "ago",
  "just",
  "now",
  // Vague references
  "thing",
  "things",
  "stuff",
  "something",
  "anything",
  "everything",
  "nothing",
  // Question words
  "please",
  "help",
  "find",
  "show",
  "get",
  "tell",
  "give",
]);

const STOP_WORDS_ES = new Set([
  // Articles and determiners
  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
  "unos",
  "unas",
  "este",
  "esta",
  "ese",
  "esa",
  // Pronouns
  "yo",
  "me",
  "mi",
  "nosotros",
  "nosotras",
  "tu",
  "tus",
  "usted",
  "ustedes",
  "ellos",
  "ellas",
  // Prepositions and conjunctions
  "de",
  "del",
  "a",
  "en",
  "con",
  "por",
  "para",
  "sobre",
  "entre",
  "y",
  "o",
  "pero",
  "si",
  "porque",
  "como",
  // Common verbs / auxiliaries
  "es",
  "son",
  "fue",
  "fueron",
  "ser",
  "estar",
  "haber",
  "tener",
  "hacer",
  // Time references (vague)
  "ayer",
  "hoy",
  "maÃ±ana",
  "antes",
  "despues",
  "despuÃ©s",
  "ahora",
  "recientemente",
  // Question/request words
  "que",
  "quÃ©",
  "cÃ³mo",
  "cuando",
  "cuÃ¡ndo",
  "donde",
  "dÃ³nde",
  "porquÃ©",
  "favor",
  "ayuda",
]);

const STOP_WORDS_PT = new Set([
  // Articles and determiners
  "o",
  "a",
  "os",
  "as",
  "um",
  "uma",
  "uns",
  "umas",
  "este",
  "esta",
  "esse",
  "essa",
  // Pronouns
  "eu",
  "me",
  "meu",
  "minha",
  "nos",
  "nÃ³s",
  "vocÃª",
  "vocÃªs",
  "ele",
  "ela",
  "eles",
  "elas",
  // Prepositions and conjunctions
  "de",
  "do",
  "da",
  "em",
  "com",
  "por",
  "para",
  "sobre",
  "entre",
  "e",
  "ou",
  "mas",
  "se",
  "porque",
  "como",
  // Common verbs / auxiliaries
  "Ã©",
  "sÃ£o",
  "foi",
  "foram",
  "ser",
  "estar",
  "ter",
  "fazer",
  // Time references (vague)
  "ontem",
  "hoje",
  "amanhÃ£",
  "antes",
  "depois",
  "agora",
  "recentemente",
  // Question/request words
  "que",
  "quÃª",
  "quando",
  "onde",
  "porquÃª",
  "favor",
  "ajuda",
]);

const STOP_WORDS_AR = new Set([
  // Articles and connectors
  "Ø§Ù„",
  "Ùˆ",
  "Ø£Ùˆ",
  "Ù„ÙƒÙ†",
  "Ø«Ù…",
  "Ø¨Ù„",
  // Pronouns / references
  "Ø£Ù†Ø§",
  "Ù†Ø­Ù†",
  "Ù‡Ùˆ",
  "Ù‡ÙŠ",
  "Ù‡Ù…",
  "Ù‡Ø°Ø§",
  "Ù‡Ø°Ù‡",
  "Ø°Ù„Ùƒ",
  "ØªÙ„Ùƒ",
  "Ù‡Ù†Ø§",
  "Ù‡Ù†Ø§Ùƒ",
  // Common prepositions
  "Ù…Ù†",
  "Ø¥Ù„Ù‰",
  "Ø§Ù„Ù‰",
  "ÙÙŠ",
  "Ø¹Ù„Ù‰",
  "Ø¹Ù†",
  "Ù…Ø¹",
  "Ø¨ÙŠÙ†",
  "Ù„",
  "Ø¨",
  "Ùƒ",
  // Common auxiliaries / vague verbs
  "ÙƒØ§Ù†",
  "ÙƒØ§Ù†Øª",
  "ÙŠÙƒÙˆÙ†",
  "ØªÙƒÙˆÙ†",
  "ØµØ§Ø±",
  "Ø£ØµØ¨Ø­",
  "ÙŠÙ…ÙƒÙ†",
  "Ù…Ù…ÙƒÙ†",
  // Time references (vague)
  "Ø¨Ø§Ù„Ø£Ù…Ø³",
  "Ø§Ù…Ø³",
  "Ø§Ù„ÙŠÙˆÙ…",
  "ØºØ¯Ø§",
  "Ø§Ù„Ø¢Ù†",
  "Ù‚Ø¨Ù„",
  "Ø¨Ø¹Ø¯",
  "Ù…Ø¤Ø®Ø±Ø§",
  // Question/request words
  "Ù„Ù…Ø§Ø°Ø§",
  "ÙƒÙŠÙ",
  "Ù…Ø§Ø°Ø§",
  "Ù…ØªÙ‰",
  "Ø£ÙŠÙ†",
  "Ù‡Ù„",
  "Ù…Ù† ÙØ¶Ù„Ùƒ",
  "ÙØ¶Ù„Ø§",
  "Ø³Ø§Ø¹Ø¯",
]);

const STOP_WORDS_KO = new Set([
  // Particles (ì¡°ì‚¬)
  "ì€",
  "ëŠ”",
  "ì´",
  "ê°€",
  "ì„",
  "ë¥¼",
  "ì˜",
  "ì—",
  "ì—ì„œ",
  "ë¡œ",
  "ìœ¼ë¡œ",
  "ì™€",
  "ê³¼",
  "ë„",
  "ë§Œ",
  "ê¹Œì§€",
  "ë¶€í„°",
  "í•œí…Œ",
  "ì—ê²Œ",
  "ê»˜",
  "ì²˜ëŸ¼",
  "ê°™ì´",
  "ë³´ë‹¤",
  "ë§ˆë‹¤",
  "ë°–ì—",
  "ëŒ€ë¡œ",
  // Pronouns (ëŒ€ëª…ì‚¬)
  "ë‚˜",
  "ë‚˜ëŠ”",
  "ë‚´ê°€",
  "ë‚˜ë¥¼",
  "ë„ˆ",
  "ìš°ë¦¬",
  "ì €",
  "ì €í¬",
  "ê·¸",
  "ê·¸ë…€",
  "ê·¸ë“¤",
  "ì´ê²ƒ",
  "ì €ê²ƒ",
  "ê·¸ê²ƒ",
  "ì—¬ê¸°",
  "ì €ê¸°",
  "ê±°ê¸°",
  // Common verbs / auxiliaries (ì¼ë°˜ ë™ì‚¬/ë³´ì¡° ë™ì‚¬)
  "ìžˆë‹¤",
  "ì—†ë‹¤",
  "í•˜ë‹¤",
  "ë˜ë‹¤",
  "ì´ë‹¤",
  "ì•„ë‹ˆë‹¤",
  "ë³´ë‹¤",
  "ì£¼ë‹¤",
  "ì˜¤ë‹¤",
  "ê°€ë‹¤",
  // Nouns (ì˜ì¡´ ëª…ì‚¬ / vague)
  "ê²ƒ",
  "ê±°",
  "ë“±",
  "ìˆ˜",
  "ë•Œ",
  "ê³³",
  "ì¤‘",
  "ë¶„",
  // Adverbs
  "ìž˜",
  "ë”",
  "ë˜",
  "ë§¤ìš°",
  "ì •ë§",
  "ì•„ì£¼",
  "ë§Žì´",
  "ë„ˆë¬´",
  "ì¢€",
  // Conjunctions
  "ê·¸ë¦¬ê³ ",
  "í•˜ì§€ë§Œ",
  "ê·¸ëž˜ì„œ",
  "ê·¸ëŸ°ë°",
  "ê·¸ëŸ¬ë‚˜",
  "ë˜ëŠ”",
  "ê·¸ëŸ¬ë©´",
  // Question words
  "ì™œ",
  "ì–´ë–»ê²Œ",
  "ë­",
  "ì–¸ì œ",
  "ì–´ë””",
  "ëˆ„êµ¬",
  "ë¬´ì—‡",
  "ì–´ë–¤",
  // Time (vague)
  "ì–´ì œ",
  "ì˜¤ëŠ˜",
  "ë‚´ì¼",
  "ìµœê·¼",
  "ì§€ê¸ˆ",
  "ì•„ê¹Œ",
  "ë‚˜ì¤‘",
  "ì „ì—",
  // Request words
  "ì œë°œ",
  "ë¶€íƒ",
]);

// Common Korean trailing particles to strip from words for tokenization
// Sorted by descending length so longest-match-first is guaranteed.
const KO_TRAILING_PARTICLES = [
  "ì—ì„œ",
  "ìœ¼ë¡œ",
  "ì—ê²Œ",
  "í•œí…Œ",
  "ì²˜ëŸ¼",
  "ê°™ì´",
  "ë³´ë‹¤",
  "ê¹Œì§€",
  "ë¶€í„°",
  "ë§ˆë‹¤",
  "ë°–ì—",
  "ëŒ€ë¡œ",
  "ì€",
  "ëŠ”",
  "ì´",
  "ê°€",
  "ì„",
  "ë¥¼",
  "ì˜",
  "ì—",
  "ë¡œ",
  "ì™€",
  "ê³¼",
  "ë„",
  "ë§Œ",
].toSorted((a, b) => b.length - a.length);

function stripKoreanTrailingParticle(token: string): string | null {
  for (const particle of KO_TRAILING_PARTICLES) {
    if (token.length > particle.length && token.endsWith(particle)) {
      return token.slice(0, -particle.length);
    }
  }
  return null;
}

function isUsefulKoreanStem(stem: string): boolean {
  // Prevent bogus one-syllable stems from words like "ë…¼ì˜" -> "ë…¼".
  if (/[\uac00-\ud7af]/.test(stem)) {
    return stem.length >= 2;
  }
  // Keep stripped ASCII stems for mixed tokens like "APIë¥¼" -> "api".
  return /^[a-z0-9_]+$/i.test(stem);
}

const STOP_WORDS_JA = new Set([
  // Pronouns and references
  "ã“ã‚Œ",
  "ãã‚Œ",
  "ã‚ã‚Œ",
  "ã“ã®",
  "ãã®",
  "ã‚ã®",
  "ã“ã“",
  "ãã“",
  "ã‚ãã“",
  // Common auxiliaries / vague verbs
  "ã™ã‚‹",
  "ã—ãŸ",
  "ã—ã¦",
  "ã§ã™",
  "ã¾ã™",
  "ã„ã‚‹",
  "ã‚ã‚‹",
  "ãªã‚‹",
  "ã§ãã‚‹",
  // Particles / connectors
  "ã®",
  "ã“ã¨",
  "ã‚‚ã®",
  "ãŸã‚",
  "ãã—ã¦",
  "ã—ã‹ã—",
  "ã¾ãŸ",
  "ã§ã‚‚",
  "ã‹ã‚‰",
  "ã¾ã§",
  "ã‚ˆã‚Š",
  "ã ã‘",
  // Question words
  "ãªãœ",
  "ã©ã†",
  "ä½•",
  "ã„ã¤",
  "ã©ã“",
  "èª°",
  "ã©ã‚Œ",
  // Time (vague)
  "æ˜¨æ—¥",
  "ä»Šæ—¥",
  "æ˜Žæ—¥",
  "æœ€è¿‘",
  "ä»Š",
  "ã•ã£ã",
  "å‰",
  "å¾Œ",
]);

const STOP_WORDS_ZH = new Set([
  // Pronouns
  "æˆ‘",
  "æˆ‘ä»¬",
  "ä½ ",
  "ä½ ä»¬",
  "ä»–",
  "å¥¹",
  "å®ƒ",
  "ä»–ä»¬",
  "è¿™",
  "é‚£",
  "è¿™ä¸ª",
  "é‚£ä¸ª",
  "è¿™äº›",
  "é‚£äº›",
  // Auxiliary words
  "çš„",
  "äº†",
  "ç€",
  "è¿‡",
  "å¾—",
  "åœ°",
  "å—",
  "å‘¢",
  "å§",
  "å•Š",
  "å‘€",
  "å˜›",
  "å•¦",
  // Verbs (common, vague)
  "æ˜¯",
  "æœ‰",
  "åœ¨",
  "è¢«",
  "æŠŠ",
  "ç»™",
  "è®©",
  "ç”¨",
  "åˆ°",
  "åŽ»",
  "æ¥",
  "åš",
  "è¯´",
  "çœ‹",
  "æ‰¾",
  "æƒ³",
  "è¦",
  "èƒ½",
  "ä¼š",
  "å¯ä»¥",
  // Prepositions and conjunctions
  "å’Œ",
  "ä¸Ž",
  "æˆ–",
  "ä½†",
  "ä½†æ˜¯",
  "å› ä¸º",
  "æ‰€ä»¥",
  "å¦‚æžœ",
  "è™½ç„¶",
  "è€Œ",
  "ä¹Ÿ",
  "éƒ½",
  "å°±",
  "è¿˜",
  "åˆ",
  "å†",
  "æ‰",
  "åª",
  // Time (vague)
  "ä¹‹å‰",
  "ä»¥å‰",
  "ä¹‹åŽ",
  "ä»¥åŽ",
  "åˆšæ‰",
  "çŽ°åœ¨",
  "æ˜¨å¤©",
  "ä»Šå¤©",
  "æ˜Žå¤©",
  "æœ€è¿‘",
  // Vague references
  "ä¸œè¥¿",
  "äº‹æƒ…",
  "äº‹",
  "ä»€ä¹ˆ",
  "å“ªä¸ª",
  "å“ªäº›",
  "æ€Žä¹ˆ",
  "ä¸ºä»€ä¹ˆ",
  "å¤šå°‘",
  // Question/request words
  "è¯·",
  "å¸®",
  "å¸®å¿™",
  "å‘Šè¯‰",
]);

export function isQueryStopWordToken(token: string): boolean {
  return (
    STOP_WORDS_EN.has(token) ||
    STOP_WORDS_ES.has(token) ||
    STOP_WORDS_PT.has(token) ||
    STOP_WORDS_AR.has(token) ||
    STOP_WORDS_ZH.has(token) ||
    STOP_WORDS_KO.has(token) ||
    STOP_WORDS_JA.has(token)
  );
}

/**
 * Check if a token looks like a meaningful keyword.
 * Returns false for short tokens, numbers-only, etc.
 */
function isValidKeyword(token: string): boolean {
  if (!token || token.length === 0) {
    return false;
  }
  // Skip very short English words (likely stop words or fragments)
  if (/^[a-zA-Z]+$/.test(token) && token.length < 3) {
    return false;
  }
  // Skip pure numbers (not useful for semantic search)
  if (/^\d+$/.test(token)) {
    return false;
  }
  // Skip tokens that are all punctuation
  if (/^[\p{P}\p{S}]+$/u.test(token)) {
    return false;
  }
  return true;
}

/**
 * Simple tokenizer that handles English, Chinese, Korean, and Japanese text.
 * For Chinese, we do character-based splitting since we don't have a proper segmenter.
 * For English, we split on whitespace and punctuation.
 */
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const normalized = text.toLowerCase().trim();

  // Split into segments (English words, Chinese character sequences, etc.)
  const segments = normalized.split(/[\s\p{P}]+/u).filter(Boolean);

  for (const segment of segments) {
    // Japanese text often mixes scripts (kanji/kana/ASCII) without spaces.
    // Extract script-specific chunks so technical terms like "API" / "ãƒã‚°" are retained.
    if (/[\u3040-\u30ff]/.test(segment)) {
      const jpParts =
        segment.match(/[a-z0-9_]+|[\u30a0-\u30ffãƒ¼]+|[\u4e00-\u9fff]+|[\u3040-\u309f]{2,}/g) ?? [];
      for (const part of jpParts) {
        if (/^[\u4e00-\u9fff]+$/.test(part)) {
          tokens.push(part);
          for (let i = 0; i < part.length - 1; i++) {
            tokens.push(part[i] + part[i + 1]);
          }
        } else {
          tokens.push(part);
        }
      }
    } else if (/[\u4e00-\u9fff]/.test(segment)) {
      // Check if segment contains CJK characters (Chinese)
      // For Chinese, extract character n-grams (unigrams and bigrams)
      const chars = Array.from(segment).filter((c) => /[\u4e00-\u9fff]/.test(c));
      // Add individual characters
      tokens.push(...chars);
      // Add bigrams for better phrase matching
      for (let i = 0; i < chars.length - 1; i++) {
        tokens.push(chars[i] + chars[i + 1]);
      }
    } else if (/[\uac00-\ud7af\u3131-\u3163]/.test(segment)) {
      // For Korean (Hangul syllables and jamo), keep the word as-is unless it is
      // effectively a stop word once trailing particles are removed.
      const stem = stripKoreanTrailingParticle(segment);
      const stemIsStopWord = stem !== null && STOP_WORDS_KO.has(stem);
      if (!STOP_WORDS_KO.has(segment) && !stemIsStopWord) {
        tokens.push(segment);
      }
      // Also emit particle-stripped stems when they are useful keywords.
      if (stem && !STOP_WORDS_KO.has(stem) && isUsefulKoreanStem(stem)) {
        tokens.push(stem);
      }
    } else {
      // For non-CJK, keep as single token
      tokens.push(segment);
    }
  }

  return tokens;
}

/**
 * Extract keywords from a conversational query for FTS search.
 *
 * Examples:
 * - "that thing we discussed about the API" â†’ ["discussed", "API"]
 * - "ä¹‹å‰è®¨è®ºçš„é‚£ä¸ªæ–¹æ¡ˆ" â†’ ["è®¨è®º", "æ–¹æ¡ˆ"]
 * - "what was the solution for the bug" â†’ ["solution", "bug"]
 */
export function extractKeywords(query: string): string[] {
  const tokens = tokenize(query);
  const keywords: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    // Skip stop words
    if (isQueryStopWordToken(token)) {
      continue;
    }
    // Skip invalid keywords
    if (!isValidKeyword(token)) {
      continue;
    }
    // Skip duplicates
    if (seen.has(token)) {
      continue;
    }
    seen.add(token);
    keywords.push(token);
  }

  return keywords;
}

/**
 * Expand a query for FTS search.
 * Returns both the original query and extracted keywords for OR-matching.
 *
 * @param query - User's original query
 * @returns Object with original query and extracted keywords
 */
export function expandQueryForFts(query: string): {
  original: string;
  keywords: string[];
  expanded: string;
} {
  const original = query.trim();
  const keywords = extractKeywords(original);

  // Build expanded query: original terms OR extracted keywords
  // This ensures both exact matches and keyword matches are found
  const expanded = keywords.length > 0 ? `${original} OR ${keywords.join(" OR ")}` : original;

  return { original, keywords, expanded };
}

/**
 * Type for an optional LLM-based query expander.
 * Can be provided to enhance keyword extraction with semantic understanding.
 */
export type LlmQueryExpander = (query: string) => Promise<string[]>;

/**
 * Expand query with optional LLM assistance.
 * Falls back to local extraction if LLM is unavailable or fails.
 */
export async function expandQueryWithLlm(
  query: string,
  llmExpander?: LlmQueryExpander,
): Promise<string[]> {
  // If LLM expander is provided, try it first
  if (llmExpander) {
    try {
      const llmKeywords = await llmExpander(query);
      if (llmKeywords.length > 0) {
        return llmKeywords;
      }
    } catch {
      // LLM failed, fall back to local extraction
    }
  }

  // Fall back to local keyword extraction
  return extractKeywords(query);
}
