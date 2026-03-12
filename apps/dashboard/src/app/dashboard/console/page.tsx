import LogViewer from "@/components/dashboard/LogViewer";

export default function ConsolePage() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      <div className="flex flex-col gap-2 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Agent Console</h1>
        <p className="text-muted-foreground">Real-time telemetry and execution logs directly from the AGDI daemon.</p>
      </div>

      <div className="flex-1 w-full overflow-hidden">
         <LogViewer />
      </div>
    </div>
  );
}
