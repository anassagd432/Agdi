"use client";

import React, { useState } from 'react';
import { Smartphone, Monitor, Mic, Camera, ShieldAlert, Cpu, Laptop, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface NodeDevice {
  id: string;
  name: string;
  type: 'ios' | 'android' | 'macos' | 'linux';
  status: 'online' | 'offline';
  ip: string;
  permissions: {
    mic: boolean;
    camera: boolean;
    screen: boolean;
  };
}

export default function NodesPage() {
  const [nodes, setNodes] = useState<NodeDevice[]>([
    { id: 'node-1', name: "Owner's iPhone", type: 'ios', status: 'online', ip: '192.168.1.45', permissions: { mic: true, camera: true, screen: false } },
    { id: 'node-2', name: "Studio Mac Mini", type: 'macos', status: 'online', ip: '192.168.1.10', permissions: { mic: true, camera: true, screen: true } },
    { id: 'node-3', name: "Backup Android", type: 'android', status: 'offline', ip: 'Disconnected', permissions: { mic: false, camera: false, screen: false } },
  ]);

  const togglePermission = (nodeId: string, perm: keyof NodeDevice['permissions'], deviceName: string) => {
    setNodes(prev => prev.map(n => {
      if (n.id === nodeId) {
        const newValue = !n.permissions[perm];
        toast.success(`${perm.charAt(0).toUpperCase() + perm.slice(1)} permission ${newValue ? 'granted' : 'revoked'} for ${deviceName}`);
        return { ...n, permissions: { ...n.permissions, [perm]: newValue } };
      }
      return n;
    }));
  };

  const removeNode = (id: string, name: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    toast.error(`${name} has been unregistered from the Gateway.`);
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
        <button className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4 fill-black" /> Pair New Node
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {nodes.map(node => (
          <div key={node.id} className="glass-panel p-6 rounded-xl border border-white/5 relative flex flex-col">
             
             {/* Status Badge */}
             <div className="absolute top-6 right-6 flex items-center gap-2">
               <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${node.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                 {node.status.toUpperCase()}
               </span>
             </div>

             <div className="flex items-center gap-4 mb-6">
               <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                 {node.type === 'ios' || node.type === 'android' ? <Smartphone className="w-8 h-8 text-white/70" /> : <Laptop className="w-8 h-8 text-white/70" />}
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
               <div className="text-sm text-gray-400 mb-3 font-medium border-b border-white/10 pb-2">Hardware Permissions</div>
               
               <div className="space-y-3">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-white/90">
                       <Mic className="w-4 h-4 text-cyan-400" /> Voice Wake (Microphone)
                    </div>
                    <button 
                      onClick={() => togglePermission(node.id, 'mic', node.name)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${node.permissions.mic ? 'bg-cyan-500' : 'bg-gray-600'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${node.permissions.mic ? 'translate-x-5' : 'translate-x-0'}`}></span>
                    </button>
                 </div>
                 
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-white/90">
                       <Camera className="w-4 h-4 text-cyan-400" /> Camera Access
                    </div>
                    <button 
                      onClick={() => togglePermission(node.id, 'camera', node.name)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${node.permissions.camera ? 'bg-cyan-500' : 'bg-gray-600'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${node.permissions.camera ? 'translate-x-5' : 'translate-x-0'}`}></span>
                    </button>
                 </div>

                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-white/90">
                       <Monitor className="w-4 h-4 text-cyan-400" /> Screen Recording
                    </div>
                    <button 
                      onClick={() => togglePermission(node.id, 'screen', node.name)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${node.permissions.screen ? 'bg-cyan-500' : 'bg-gray-600'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${node.permissions.screen ? 'translate-x-5' : 'translate-x-0'}`}></span>
                    </button>
                 </div>
               </div>
             </div>

             <div className="text-xs text-muted-foreground flex items-center justify-between mt-auto">
               <span>Local IP: {node.ip}</span>
               <button onClick={() => removeNode(node.id, node.name)} className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1">
                 <ShieldAlert className="w-3.5 h-3.5" /> Unpair Device
               </button>
             </div>

          </div>
        ))}
      </div>

    </div>
  );
}
