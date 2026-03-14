"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Trash2,
  Shield,
  Eye,
  Loader2,
  RefreshCw,
  ArrowLeft,
  UserPlus,
  Crown,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface UserInfo {
  id: string;
  username: string;
  role: "admin" | "viewer";
  createdAt: number;
  lastLogin?: number;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "viewer">("viewer");

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else if (res.status === 403) {
        toast.error("Admin access required to manage users.");
      }
    } catch {
      toast.error("Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async () => {
    if (!newUsername || !newPassword) {
      toast.error("Username and password are required.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole,
        }),
      });
      if (res.ok) {
        toast.success(`User "${newUsername}" created.`);
        setShowCreate(false);
        setNewUsername("");
        setNewPassword("");
        setNewRole("viewer");
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create user.");
      }
    } catch {
      toast.error("Failed to create user.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (user: UserInfo) => {
    if (!confirm(`Delete user "${user.username}"? This cannot be undone.`))
      return;
    try {
      const res = await fetch(`/api/users?id=${user.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`User "${user.username}" deleted.`);
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete user.");
      }
    } catch {
      toast.error("Failed to delete user.");
    }
  };

  const handleRoleChange = async (user: UserInfo, newRole: string) => {
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, role: newRole }),
      });
      if (res.ok) {
        toast.success(`${user.username} is now ${newRole}.`);
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to change role.");
      }
    } catch {
      toast.error("Failed to change role.");
    }
  };

  const formatDate = (ts: number) => {
    if (!ts) return "Never";
    return new Date(ts).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/settings"
            className="p-2 glass hover:bg-white/10 rounded-md text-muted-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <Users className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> User
              Management
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Create, manage, and assign roles to dashboard users.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setLoading(true);
              fetchUsers();
            }}
            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
              showCreate
                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                : "bg-cyan-500 text-black hover:bg-cyan-400"
            }`}
          >
            {showCreate ? (
              "Cancel"
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Add User
              </>
            )}
          </button>
        </div>
      </div>

      {/* Create User Form */}
      {showCreate && (
        <div className="glass-panel p-6 animate-in slide-in-from-top-4 duration-300 border-cyan-500/30 ring-1 ring-cyan-500/20">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-cyan-400" /> Create New User
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. john"
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                Role
              </label>
              <div className="flex gap-2">
                <select
                  value={newRole}
                  onChange={(e) =>
                    setNewRole(e.target.value as "admin" | "viewer")
                  }
                  className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
                >
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={handleCreate}
                  disabled={creating || !newUsername || !newPassword}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_100px_140px_140px_80px] gap-4 px-6 py-3 border-b border-white/10 bg-black/40 text-xs font-semibold text-gray-400 uppercase tracking-widest">
          <div>User</div>
          <div>Role</div>
          <div>Created</div>
          <div>Last Login</div>
          <div className="text-right">Actions</div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!loading && users.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No users found. Click &quot;Add User&quot; to create the first one.
          </div>
        )}

        {/* Rows */}
        {!loading &&
          users.map((user) => (
            <div
              key={user.id}
              className="grid grid-cols-[1fr_100px_140px_140px_80px] gap-4 px-6 py-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors items-center"
            >
              {/* Username */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    user.role === "admin"
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-white text-sm flex items-center gap-1.5">
                    {user.username}
                    {user.role === "admin" && (
                      <Crown className="w-3 h-3 text-amber-400" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{user.id}</div>
                </div>
              </div>

              {/* Role */}
              <div>
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user, e.target.value)}
                  className="bg-transparent border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-cyan-500/50 focus:outline-none"
                >
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              {/* Created */}
              <div className="text-xs text-gray-400">
                {formatDate(user.createdAt)}
              </div>

              {/* Last Login */}
              <div className="text-xs text-gray-400">
                {user.lastLogin ? formatDate(user.lastLogin) : "Never"}
              </div>

              {/* Actions */}
              <div className="flex justify-end">
                <button
                  onClick={() => handleDelete(user)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete user"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-cyan-400" />
          <strong>Admin</strong> — full read/write access
        </span>
        <span className="flex items-center gap-1.5">
          <Eye className="w-3 h-3 text-gray-400" />
          <strong>Viewer</strong> — read-only dashboard access
        </span>
      </div>
    </div>
  );
}
