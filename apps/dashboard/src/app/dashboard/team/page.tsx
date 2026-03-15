"use client";

import React, { useState } from "react";
import {
  Users, Plus, Trash2, Shield, Mail, Clock,
  UserCheck, UserX, Crown, Edit3,
} from "lucide-react";
import { toast } from "sonner";

interface TeamMember {
  id: string; name: string; email: string;
  role: "owner" | "admin" | "editor" | "viewer";
  status: "active" | "invited" | "disabled";
  joined: number; lastActive?: number;
  avatar: string;
}

const defaultMembers: TeamMember[] = [
  { id: "m1", name: "Admin User", email: "admin@agdi.ai", role: "owner", status: "active", joined: Date.now() - 86400000 * 90, lastActive: Date.now() - 300000, avatar: "AU" },
  { id: "m2", name: "Sarah Chen", email: "sarah@agdi.ai", role: "admin", status: "active", joined: Date.now() - 86400000 * 60, lastActive: Date.now() - 3600000, avatar: "SC" },
  { id: "m3", name: "Marcus Johnson", email: "marcus@agdi.ai", role: "editor", status: "active", joined: Date.now() - 86400000 * 30, lastActive: Date.now() - 86400000, avatar: "MJ" },
  { id: "m4", name: "Emily Park", email: "emily@agdi.ai", role: "viewer", status: "active", joined: Date.now() - 86400000 * 14, lastActive: Date.now() - 7200000, avatar: "EP" },
  { id: "m5", name: "Alex Rivera", email: "alex@agdi.ai", role: "editor", status: "invited", joined: Date.now() - 86400000 * 2, avatar: "AR" },
];

const roleColors: Record<string, string> = {
  owner: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  admin: "bg-red-500/10 text-red-400 border-red-500/20",
  editor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  viewer: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const roleIcons: Record<string, React.ReactNode> = {
  owner: <Crown className="w-3 h-3" />,
  admin: <Shield className="w-3 h-3" />,
  editor: <Edit3 className="w-3 h-3" />,
  viewer: <Users className="w-3 h-3" />,
};

const avatarGradients = [
  "from-cyan-500 to-blue-600", "from-purple-500 to-pink-600",
  "from-green-500 to-emerald-600", "from-amber-500 to-orange-600",
  "from-red-500 to-rose-600",
];

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>(defaultMembers);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamMember["role"]>("viewer");

  const invite = () => {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) return toast.error("Valid email required.");
    if (members.some((m) => m.email === inviteEmail.trim())) return toast.error("Already a member.");
    const initials = inviteEmail.split("@")[0].slice(0, 2).toUpperCase();
    const member: TeamMember = {
      id: crypto.randomUUID(), name: inviteEmail.split("@")[0],
      email: inviteEmail.trim(), role: inviteRole,
      status: "invited", joined: Date.now(), avatar: initials,
    };
    setMembers((prev) => [...prev, member]);
    setInviteEmail(""); setShowInvite(false);
    toast.success(`Invitation sent to ${member.email}`);
  };

  const changeRole = (id: string, role: TeamMember["role"]) => {
    setMembers((prev) => prev.map((m) => m.id === id ? { ...m, role } : m));
    toast.success("Role updated.");
  };

  const remove = (id: string) => {
    const m = members.find((m) => m.id === id);
    if (m?.role === "owner") return toast.error("Cannot remove owner.");
    if (!confirm(`Remove ${m?.name} from the team?`)) return;
    setMembers((prev) => prev.filter((m) => m.id !== id));
    toast.success("Member removed.");
  };

  function timeAgo(ts?: number): string {
    if (!ts) return "Never";
    const d = Date.now() - ts;
    if (d < 60000) return "Just now";
    if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
    if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
    return `${Math.floor(d / 86400000)}d ago`;
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Team
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{members.length} members · {members.filter((m) => m.status === "active").length} active</p>
        </div>
        <button onClick={() => setShowInvite(!showInvite)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
            showInvite ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-cyan-500 text-black hover:bg-cyan-400"}`}>
          {showInvite ? "Cancel" : <><Plus className="w-4 h-4" /> Invite</>}
        </button>
      </div>

      {showInvite && (
        <div className="glass-panel p-5 border border-cyan-500/20 rounded-xl animate-in slide-in-from-top-4 duration-300 space-y-3">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <input type="email" placeholder="email@example.com" value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as TeamMember["role"])}
              className="bg-[#0a0e17] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm cursor-pointer">
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button onClick={invite} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold px-5 py-2 rounded-lg text-sm flex items-center gap-2">
            <Mail className="w-4 h-4" /> Send Invite
          </button>
        </div>
      )}

      <div className="space-y-2 stagger-in">
        {members.map((m, i) => (
          <div key={m.id} className="glass-panel p-4 border border-white/5 rounded-xl flex items-center gap-4 hover:border-white/10 transition-all">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
              {m.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{m.name}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border flex items-center gap-1 ${roleColors[m.role]}`}>
                  {roleIcons[m.role]} {m.role}
                </span>
                {m.status === "invited" && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Pending
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500">{m.email}</p>
            </div>
            <div className="text-right text-[10px] text-gray-600 shrink-0">
              {m.lastActive && <p>Active {timeAgo(m.lastActive)}</p>}
              <p>Joined {timeAgo(m.joined)}</p>
            </div>
            {m.role !== "owner" && (
              <div className="flex items-center gap-1 shrink-0">
                <select value={m.role} onChange={(e) => changeRole(m.id, e.target.value as TeamMember["role"])}
                  className="bg-transparent border border-white/10 rounded px-1.5 py-1 text-[10px] text-gray-400 cursor-pointer">
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
                <button onClick={() => remove(m.id)} className="p-1.5 text-gray-600 hover:text-red-400">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
