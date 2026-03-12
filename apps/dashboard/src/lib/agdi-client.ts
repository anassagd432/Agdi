export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "thought" | "action";
  message: string;
}

export interface AgentStatus {
  status: "idle" | "running" | "paused" | "offline";
  activeTasks: number;
}

class AgdiClient {
  private listeners: Set<(log: LogEntry) => void> = new Set();
  private mockInterval: NodeJS.Timeout | null = null;
  public status: AgentStatus = { status: "offline", activeTasks: 0 };

  constructor() {
    // Attempt real connection, fallback to mock for portfolio presentation
    this.initMockStream();
  }

  public subscribe(callback: (log: LogEntry) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emit(log: Omit<LogEntry, "id" | "timestamp">) {
    const entry: LogEntry = {
      ...log,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
    };
    this.listeners.forEach((cb) => cb(entry));
  }

  public async spawnAgent(task: string) {
    this.emit({ level: "action", message: `Spawning agent for task: ${task}` });
    this.status = { status: "running", activeTasks: this.status.activeTasks + 1 };
  }

  public async runCommand(cmd: string) {
    this.emit({ level: "action", message: `Executing command: ${cmd}` });
    setTimeout(() => {
      this.emit({ level: "info", message: `Command returned exit code 0` });
    }, 1500);
  }

  private initMockStream() {
    this.status = { status: "running", activeTasks: 1 };
    
    const mockThoughts = [
      "Analyzing layout constraints...",
      "Reading file src/app/page.tsx",
      "Generating AST for TS component",
      "No critical errors found in build trace.",
      "Optimizing memory allocation for V8 instance.",
    ];

    this.mockInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        this.emit({
          level: "thought",
          message: mockThoughts[Math.floor(Math.random() * mockThoughts.length)]
        });
      }
    }, 3000);
  }

  public destroy() {
    if (this.mockInterval) clearInterval(this.mockInterval);
    this.listeners.clear();
  }
}

export const agdi = new AgdiClient();
