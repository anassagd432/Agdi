import * as crypto from "node:crypto";

export interface ContextMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  toolCallId?: string;
  [key: string]: unknown;
}

export interface PruneOptions {
  maxOutputLines?: number;
  keepRecentCount?: number;
  headLinesToKeep?: number;
  tailLinesToKeep?: number;
}

export interface PromptCachePartitionResult {
  prefixHash: string;
  staticPrefix: {
    systemPrompt: string;
    toolSchemasJson: string;
  };
  dynamicTail: ContextMessage[];
}

export class ContextCompactor {
  private readonly defaultMaxLines: number;
  private readonly defaultKeepRecent: number;

  constructor(maxOutputLines = 25, keepRecentCount = 4) {
    this.defaultMaxLines = maxOutputLines;
    this.defaultKeepRecent = keepRecentCount;
  }

  public pruneToolOutputs(messages: ContextMessage[], options?: PruneOptions): ContextMessage[] {
    const maxLines = options?.maxOutputLines ?? this.defaultMaxLines;
    const keepRecent = options?.keepRecentCount ?? this.defaultKeepRecent;
    const headLines = options?.headLinesToKeep ?? 5;
    const tailLines = options?.tailLinesToKeep ?? 5;

    let toolCountFromEnd = 0;

    // Traverse from newest to oldest
    const result: ContextMessage[] = new Array(messages.length);

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];

      if (msg.role !== "tool") {
        result[i] = msg;
        continue;
      }

      toolCountFromEnd++;

      // Keep recent tool outputs completely untouched
      if (toolCountFromEnd <= keepRecent) {
        result[i] = msg;
        continue;
      }

      // Check if output needs pruning
      const lines = msg.content.split("\n");
      if (lines.length <= maxLines) {
        result[i] = msg;
        continue;
      }

      const head = lines.slice(0, headLines);
      const tail = lines.slice(-tailLines);
      const prunedCount = lines.length - headLines - tailLines;

      const condensedContent = [
        ...head,
        `\n[... Agdi Context Compactor: ${prunedCount} lines pruned from historical tool execution ...]\n`,
        ...tail,
      ].join("\n");

      result[i] = {
        ...msg,
        content: condensedContent,
      };
    }

    return result;
  }

  public partitionPromptCache(
    systemPrompt: string,
    toolSchemas: unknown[],
    history: ContextMessage[],
  ): PromptCachePartitionResult {
    const toolSchemasJson = JSON.stringify(toolSchemas);
    const prefixHash = crypto
      .createHash("sha256")
      .update(systemPrompt)
      .update(toolSchemasJson)
      .digest("hex")
      .slice(0, 16);

    return {
      prefixHash,
      staticPrefix: {
        systemPrompt,
        toolSchemasJson,
      },
      dynamicTail: history,
    };
  }
}
