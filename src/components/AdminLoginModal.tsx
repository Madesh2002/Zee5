import React, { useState, useEffect } from "react";
import { ShieldCheck, Lock, Key, LogOut, Check, AlertCircle, Copy, Eye, EyeOff, User } from "lucide-react";
import { performAdminLogin, performChangeAdminCredentials, getLocalAdminCredentials, clearAdminSession } from "../utils/apiClient";

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  loggedInUser: string | null;
  onLoginSuccess: (username: string, token: string) => void;
  onLogout: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  isLoggedIn,
  loggedInUser,
  onLoginSuccess,
  onLogout
}) => {
  const localCreds = getLocalAdminCredentials();
  const [usernameInput, setUsernameInput] = useState(localCreds.username || "admin");
  const [passwordInput, setPasswordInput] = useState(localCreds.password || "admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<"status" | "changePassword">("status");
  const [currPass, setCurrPass] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changeMsg, setChangeMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setChangeMsg(null);
      const creds = getLocalAdminCredentials();
      if (!isLoggedIn) {
        setUsernameInput(creds.username || "admin");
        setPasswordInput(creds.password || "admin123");
      }
    }
  }, [isOpen, isLoggedIn]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await performAdminLogin(usernameInput, passwordInput);
      if (result.success && result.username) {
        onLoginSuccess(result.username, result.adminToken || "session");
      } else {
        setErrorMessage(result.error || "Authentication failed. Check credentials.");
      }
    } catch (err: any) {
      setErrorMessage("Authentication error: " + (err.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setChangeMsg(null);

    try {
      const result = await performChangeAdminCredentials(currPass, newUsername, newPassword);
      if (result.success && result.username) {
        setChangeMsg({ type: "success", text: "Admin credentials successfully updated!" });
        setCurrPass("");
        setNewUsername("");
        setNewPassword("");
        setUsernameInput(result.username);
      } else {
        setChangeMsg({ type: "error", text: result.error || "Failed to update credentials." });
      }
    } catch (err: any) {
      setChangeMsg({ type: "error", text: err.message || "Update failed." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDefaults = () => {
    const creds = getLocalAdminCredentials();
    setUsernameInput(creds.username || "admin");
    setPasswordInput(creds.password || "admin123");
  };

  const handleLogoutAction = () => {
    clearAdminSession();
    onLogout();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-xl border ${isLoggedIn ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-sky-500/10 border-sky-500/30 text-sky-400"}`}>
              {isLoggedIn ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {isLoggedIn ? "Admin Portal Access" : "Builder Admin Authentication"}
              </h3>
              <p className="text-xs text-slate-400">
                {isLoggedIn ? `Authenticated as ${loggedInUser || "admin"}` : "Log in to manage tokens and system settings"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-lg font-bold p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form or Authenticated Panel */}
        {isLoggedIn ? (
          <div className="space-y-4">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setActiveSubTab("status")}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${activeSubTab === "status" ? "bg-sky-600 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
              >
                Admin Status
              </button>
              <button
                onClick={() => setActiveSubTab("changePassword")}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${activeSubTab === "changePassword" ? "bg-sky-600 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
              >
                Change Credentials
              </button>
            </div>

            {activeSubTab === "status" && (
              <div className="space-y-4">
                <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                    <Check className="w-4 h-4" />
                    <span>Admin Mode Active</span>
                  </div>
                  <p className="text-xs text-emerald-200/80 leading-relaxed">
                    You have full administrative privileges to edit session tokens, manage channel registers, and trigger remote API playlist synchronization.
                  </p>
                </div>

                {/* Default Credentials Reference Card */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
                  <span className="text-slate-400 font-semibold block">System Credentials Reference</span>
                  <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-lg font-mono">
                    <span className="text-slate-400">Username:</span>
                    <span className="text-sky-300 font-bold">{loggedInUser || "admin"}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleLogoutAction}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold rounded-xl transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out Admin</span>
                  </button>
                </div>
              </div>
            )}

            {activeSubTab === "changePassword" && (
              <form onSubmit={handleChangeCredentials} className="space-y-3.5 text-xs">
                {changeMsg && (
                  <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${changeMsg.type === "success" ? "bg-emerald-950 border-emerald-800 text-emerald-300" : "bg-rose-950 border-rose-800 text-rose-300"}`}>
                    {changeMsg.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span>{changeMsg.text}</span>
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currPass}
                    onChange={(e) => setCurrPass(e.target.value)}
                    required
                    placeholder="Enter current password..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">New Username</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                    placeholder="e.g. admin"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter new password..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-all shadow-md text-xs"
                >
                  {isSubmitting ? "Updating..." : "Update Admin Credentials"}
                </button>
              </form>
            )}
          </div>
        ) : (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Credentials Card for User */}
            <div className="bg-sky-950/40 border border-sky-800/60 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-sky-300 font-bold flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  Default Admin Credentials
                </span>
                <button
                  type="button"
                  onClick={fillDefaults}
                  className="text-[11px] text-sky-400 hover:text-sky-200 underline font-medium"
                >
                  Quick Auto-Fill
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between">
                  <div className="truncate">
                    <span className="text-slate-400 text-[10px] block">Username:</span>
                    <span className="text-slate-100 font-bold">admin</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard("admin", "username")}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
                    title="Copy Username"
                  >
                    {copiedField === "username" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between">
                  <div className="truncate">
                    <span className="text-slate-400 text-[10px] block">Password:</span>
                    <span className="text-amber-300 font-bold">admin123</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard("admin123", "password")}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
                    title="Copy Password"
                  >
                    {copiedField === "password" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span className="break-words">{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-400" />
                <span>Admin Username</span>
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                required
                placeholder="Username (default: admin)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Admin Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  required
                  placeholder="Password (default: admin123)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs font-mono focus:outline-none focus:border-sky-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Authenticating..." : "Sign In to Admin"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
