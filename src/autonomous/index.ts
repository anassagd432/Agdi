/**
 * Autonomous agent module — public API.
 *
 * This module provides a fully autonomous browser agent that:
 * - Runs continuously in a plan → act → observe → repair loop
 * - Controls a browser visually via Google Gemini's multimodal API
 * - Self-heals from errors (network, auth, selector changes, crashes)
 * - Accepts user input non-blockingly at any time
 * - Persists goals and memory across restarts
 *
 * Usage:
 *   import { startDaemon, stopDaemon, getDaemon } from "./autonomous/index.js";
 *
 *   const daemon = await startDaemon({ headless: false });
 *   daemon.getAgent()!.goals.add({ description: "Search Google for 'agdi'" });
 *   // ... later
 *   await stopDaemon();
 */

// Core types
export type {
  Action,
  ActionType,
  AgentEvent,
  AgentEventHandler,
  AgentState,
  AutonomousConfig,
  ErrorType,
  Goal,
  GoalPriority,
  GoalStatus,
  GoalType,
  MessagePriority,
  RepairDiagnosis,
  UserMessage,
  VisionAnalysis,
} from "./types.js";

export { DEFAULT_CONFIG } from "./types.js";

// Core loop
export { AutonomousAgent } from "./loop.js";

// Goal management
export { GoalQueue } from "./goal-queue.js";

// User messages
export { MessageQueue, classifyPriority } from "./message-queue.js";

// Vision (Gemini)
export { analyzeScreenshot, quickObserve, resolveGeminiApiKey } from "./vision.js";

// Grid overlay
export { addGridOverlay } from "./grid-overlay.js";

// Visual actions
export { executeVisualAction, executeActionSequence } from "./visual-actions.js";

// Self-repair
export { classifyError, diagnose, attemptRepair, type RepairResult } from "./repair.js";

// Decision engine
export { decideStrategy, assessGoalProgress, type InteractionStrategy } from "./decision.js";

// User interface
export { AgentUI, type NotificationLevel, type GoalCompletionReport } from "./user-interface.js";

// Memory
export {
  AgentMemory,
  type EpisodicEntry,
  type LearnedProcedure,
  type FailurePattern,
} from "./memory.js";

// Self-analysis
export {
  analyzePerformance,
  summarizeReport,
  type PerformanceReport,
  type Metric,
  type DomainProfile,
  type StrategyScore,
} from "./self-analyze.js";

// Self-improvement
export {
  SelfImprover,
  type LearnedRule,
  type ConfigMutation,
  type GoalTemplate,
  type ImprovementState,
  type ImprovementSummary,
} from "./self-improve.js";

// Tab manager
export { TabManager, type Tab } from "./tab-manager.js";

// Auth & session persistence
export { AuthManager, type SessionSnapshot, type CookieData } from "./auth-manager.js";

// Scheduler
export { GoalScheduler, type ScheduledGoal } from "./scheduler.js";

// Plugin system
export {
  PluginRegistry,
  createApiPlugin,
  createFilePlugin,
  type AgentPlugin,
  type PluginAction,
  type PluginContext,
  type PluginResult,
  type PluginManifest,
} from "./plugins.js";

// Task recording & replay
export {
  TaskRecorder,
  type Recording,
  type RecordedStep,
  type RecordingSummary,
} from "./recorder.js";

// Browser Dashboard
export { BrowserDashboard } from "./browser-ui/server.js";

// Daemon
export { AutonomousDaemon, startDaemon, stopDaemon, getDaemon } from "./daemon.js";

// Gateway integration
export {
  maybeStartAutonomous,
  stopAutonomous,
  isAutonomousActive,
} from "./autonomous-gateway-hook.js";

// Device control (cross-platform desktop automation)
export { DeviceController } from "./device-controller.js";
export { executeDeviceAction, executeDeviceActionSequence } from "./device-actions.js";
export type {
  DeviceBackend,
  DeviceAction,
  DeviceActionType,
  MouseButton,
  KeyModifier,
  ScrollDirection,
  WindowInfo,
  ScreenRegion,
  ScreenSize,
  Point,
} from "./device/types.js";

// Full Linux system control
export {
  LinuxSystemController,
  type ProcessInfo,
  type DiskUsage,
  type NetworkInterface,
  type ServiceStatus,
  type FileInfo,
  type CronJob,
  type SystemInfo,
} from "./device/linux-system.js";

// Live desktop streaming
export {
  DesktopLiveStream,
  type LiveStreamFrame,
  type LiveStreamOverlay,
  type StreamConfig,
} from "./live-stream.js";

// Natural language commander
export {
  NLCommander,
  type CommandResult,
  type CommandPlan,
  type CommandStep,
} from "./nl-commander.js";

// Safety & approval gate
export {
  ApprovalGate,
  type ApprovalRequest,
  type ApprovalLevel,
  type ApprovalRule,
} from "./approval.js";

// Voice control
export { VoiceController, type VoiceCommand, type VoiceConfig } from "./voice.js";

// User profile & persistent memory
export {
  UserProfile,
  type UserProfileData,
  type AppUsage,
  type WorkflowPattern,
  type UserPreference,
} from "./user-profile.js";

// Workflow recording & replay
export {
  WorkflowReplay,
  type SavedWorkflow,
  type WorkflowStep,
  type ReplayResult,
} from "./workflow-replay.js";

// One-command setup
export { runAgentSetup, type SetupResult } from "./device/setup-agent.js";

// Android device control (ADB)
export {
  AndroidBackend,
  type AndroidDevice,
  type AndroidApp,
  type AndroidScreenSize,
  type BatteryInfo,
} from "./device/android-backend.js";

// iOS device control (libimobiledevice + WDA)
export {
  IOSBackend,
  type IOSDevice,
  type IOSBatteryInfo,
  type IOSAppInfo,
  type IOSScreenSize,
} from "./device/ios-backend.js";

// REST API
export { AgentRestApi, type ApiConfig } from "./rest-api.js";

// Screen OCR
export {
  ScreenOCR,
  type OcrResult,
  type OcrWord,
  type TextLocation,
  type OcrConfig,
} from "./screen-ocr.js";

// Task scheduler
export { TaskScheduler, type ScheduledTask, type TaskSchedule } from "./task-scheduler.js";

// File watcher
export { FileWatcher, type FileWatchRule, type FileEvent } from "./file-watcher.js";

// Smart clipboard
export { SmartClipboard, type ClipboardEntry } from "./smart-clipboard.js";

// Multi-monitor
export { MultiMonitorManager, type Monitor, type VirtualScreen } from "./multi-monitor.js";

// AI-to-AI delegation
export {
  AIDelegation,
  type SubAgent,
  type DelegationPlan,
  type DelegationResult,
} from "./ai-delegation.js";

// Security & Cybersecurity Suite
export {
  NetworkRecon,
  WebSecurityScanner,
  WifiSecurity,
  CryptoToolkit,
  ExploitEngine,
  PacketSniffer,
  InfoGathering,
  VulnAnalysis,
  WebAttacks,
  PasswordAttacks,
  WirelessAttacks,
  Exploitation,
  SniffSpoof,
  PostExploitation,
  Forensics,
  ReverseEngineering,
  SocialEngineering,
  auditKaliTools,
  runTool,
} from "./security/index.js";

// Security Hardening
export {
  InputSanitiser,
  FileSandbox,
  AuditLog,
  SessionManager,
  RateLimiter,
  CommandGuard,
  SecurityError,
  SECURITY_HEADERS,
  auditLog,
  sandbox,
  sessions,
  rateLimiter,
} from "./security-hardening.js";
