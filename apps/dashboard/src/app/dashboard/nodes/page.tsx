"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Smartphone, Monitor, Mic, Camera, ShieldAlert, Cpu, Laptop, Plus, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { agdi } from "@/lib/agdi-client";

interface NodeDevice {
  id: string;
  name: string;
  type: "ios" | "android" | "macos" | "linux";
  status: "online" | "offline";
  ip: string;
  permissions: {
    mic: boolean;
    camera: boolean;
    screen: boolean;
  };
}

export default function NodesPage() {
  const [nodes, setNodes] = useState<NodeDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPairInfo, setShowPairInfo] = useState(false);

  const fetchNodes = useCallback(async () => {
    try {
      const res = await agdi.call("node.list");
      if (res && res.nodes) {
        const mapped: NodeDevice[] = (res.nodes as any[]).map((n: any) => ({
          id: n.id,
          name: n.name || n.id,
          type: n.platform === "ios" ? "ios" : n.platform === "android" ? "android" : "macos",
          status: n.presence === "online" ? "online" : "offline",
          ip: n.ip || "Unknown",
          permissions: {
            mic: n.permissions?.mic ?? true,
            camera: n.permissions?.camera ?? true,
            screen: n.permissions?.screen ?? false,
            ...n.permissions,
          },
        }));
        setNodes(mapped);
      } else {
        setNodes([]);
      }
    } catch (e) {
      console.warn("node.list error:", e);
      setNodes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNodes();
    const iv = setInterval(fetchNodes, 5000);
    return () => clearInterval(iv);
  }, [fetchNodes]);

  const togglePermission = async (
    nodeId: string,
    perm: keyof NodeDevice["permissions"],
    deviceName: string
  ) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const newValue = !node.permissions[perm];

    // Optimistic local update
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? { ...n, permissions: { ...n.permissions, [perm]: newValue } }
          : n
      )
    );

    try {
      await agdi.call("devices.update", {
        deviceId: nodeId,
        permissions: { [perm]: newValue },
      });
      toast.success(
        `${perm.charAt(0).toUpperCase() + perm.slice(1)} ${newValue ? "granted" : "revoked"} for ${deviceName}`
      );
    } catch (e: any) {
      // Revert on failure
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? { ...n, permissions: { ...n.permissions, [perm]: !newValue } }
            : n
        )
      );
      toast.error(`Permission sync failed: ${e.message || e}`);
    }
  };

  const removeNode = async (id: string, name: string) => {
    if (!confirm(`Unpair ${name}? This will revoke its access token.`)) return;
    try {
      await agdi.call("device.token.revoke", { deviceId: id });
      setNodes((prev) => prev.filter((n) => n.id !== id));
      toast.success(`${name} has been unpaired from the Gateway.`);
    } catch (e: any) {
      setNodes((prev) => prev.filter((n) => n.id !== id));
      toast.error(`Removed ${name} locally (gateway sync failed: ${e.message || e})`);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Smartphone className="w-8 h-8 text-cyan-400" /> Linked Nodes
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage paired devices for Voice Wake, Camera Snap, and Screen Control.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setLoading(true); fetchNodes(); }}
            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowPairInfo(!showPairInfo)}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4 fill-black" /> Pair New Node
          </button>
        </div>
      </div>

      {/* Pair Info */}
      {showPairInfo && (
        <div className="glass-panel p-5 border-cyan-500/20 ring-1 ring-cyan-500/10 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Pair a New Device</h3>
            <button onClick={() => setShowPairInfo(false)} className="text-muted-foreground hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="text-sm text-gray-300 space-y-2">
            <p>1. Install the <strong>Agdi</strong> app on your iOS or Android device.</p>
            <p>2. Open the app and tap <strong>Pair with Gateway</strong>.</p>
            <p>3. The device will automatically connect to your gateway at <code className="font-mono text-cyan-400">localhost:18789</code>.</p>
            <p className="text-xs text-muted-foreground mt-3">
              Or run <code className="font-mono text-cyan-400">agdi device pair</code> in your terminal.
            </p>
          </div>
        </div>
      )}

      {/* Nodes Grid or Empty State */}
      {nodes.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500 gap-3">
          <Smartphone className="w-12 h-12 opacity-20" />
          <p className="text-sm">No devices paired yet. Click "Pair New Node" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {nodes.map((node) => (
            <div key={node.id} className="glass-panel p-6 rounded-xl border border-white/5 relative flex flex-col">
              {/* Status Badge */}
              <div className="absolute top-6 right-6 flex items-center gap-2">
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                    node.status === "online"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                  }`}
                >
                  {node.status.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                  {node.type === "ios" || node.type === "android" ? (
                    <Smartphone className="w-8 h-8 text-white/70" />
                  ) : (
                    <Laptop className="w-8 h-8 text-white/70" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{node.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-400 font-mono mt-1">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Bridge ID: {node.id}</span>
                  </div>
                </div>
              </div>

              <div className="bg-black/30 rounded-lg p-4 border border-white/5 mb-6">
                <div className="text-sm text-gray-400 mb-3 font-medium border-b border-white/10 pb-2">
                  Hardware Permissions
                </div>
                <div className="space-y-3">
                  {[
                    { key: "mic" as const, icon: <Mic className="w-4 h-4 text-cyan-400" />, label: "Voice Wake (Microphone)" },
                    { key: "camera" as const, icon: <Camera className="w-4 h-4 text-cyan-400" />, label: "Camera Access" },
                    { key: "screen" as const, icon: <Monitor className="w-4 h-4 text-cyan-400" />, label: "Screen Recording" },
                  ].map(({ key, icon, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-white/90">
                        {icon} {label}
                      </div>
                      <button
                        onClick={() => togglePermission(node.id, key, node.name)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${
                          node.permissions[key] ? "bg-cyan-500" : "bg-gray-600"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            node.permissions[key] ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-xs text-muted-foreground flex items-center justify-between mt-auto">
                <span>Local IP: {node.ip}</span>
                <button
                  onClick={() => removeNode(node.id, node.name)}
                  className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                >
                  <ShieldAlert className="w-3.5 h-3.5" /> Unpair Device
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
