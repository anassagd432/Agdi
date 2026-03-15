"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Users, Plus, Trash2, RefreshCw, Loader2, Shield, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface UserInfo {
  id: string; username: string; role: "admin" | "viewer"; createdAt: number; lastLogin?: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState<{ username: string; password: string; role: UserInfo["role"] }>({ username: "", password: "", role: "viewer" });
  const [creating, setCreating] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers((await res.json()).users || []);
    } catch { toast.error("Failed to fetch users."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async () => {
    if (!newUser.username || !newUser.password) { toast.error("All fields required."); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      if (res.ok) { toast.success("User created."); setNewUser({ username: "", password: "", role: "viewer" }); setShowCreate(false); fetchUsers(); }
      else { const d = await res.json(); toast.error(d.error || "Failed"); }
    } catch { toast.error("Failed."); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete user "${name}"?`)) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("User deleted."); fetchUsers(); }
    } catch { toast.error("Failed."); }
  };

  const handleRoleChange = async (id: string, role: "admin" | "viewer") => {
    try {
      await fetch("/api/users", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role }),
      });
      toast.success("Role updated."); fetchUsers();
    } catch { toast.error("Failed."); }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-cyan-400" /> User Management
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage dashboard users and roles.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setLoading(true); fetchUsers(); }} className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowCreate(!showCreate)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${showCreate ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-cyan-500 text-black hover:bg-cyan-400"}`}>
            {showCreate ? "Cancel" : <><UserPlus className="w-4 h-4" /> Add User</>}
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="glass-panel p-5 border-cyan-500/30 ring-1 ring-cyan-500/20 animate-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="text" placeholder="Username" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
            <input type="password" placeholder="Password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
            <div className="flex gap-2">
              <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as "admin" | "viewer" })}
                className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500/50 focus:outline-none flex-1">
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
              <button onClick={handleCreate} disabled={creating}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 disabled:opacity-50">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_120px_120px_50px] gap-4 px-6 py-3 border-b border-white/10 bg-black/40 text-xs font-semibold text-gray-400 uppercase tracking-widest">
          <div>User</div><div>Role</div><div>Created</div><div>Last Login</div><div></div>
        </div>
        {loading && <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>}
        {!loading && users.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">No users yet.</div>}
        {!loading && users.map((u) => (
          <div key={u.id} className="grid grid-cols-[1fr_100px_120px_120px_50px] gap-4 px-6 py-3 border-b border-white/5 items-center hover:bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 flex items-center justify-center text-xs font-bold text-cyan-400">
                {u.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-white font-medium">{u.username}</span>
            </div>
            <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value as "admin" | "viewer")}
              className="bg-transparent border border-white/10 rounded px-2 py-1 text-xs text-gray-300">
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
            <div className="text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}</div>
            <div className="text-xs text-gray-400">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString([], { month: "short", day: "numeric" }) : "Never"}</div>
            <button onClick={() => handleDelete(u.id, u.username)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
