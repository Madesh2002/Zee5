import React, { useState } from "react";
import { ShieldCheck, Lock, Key, Copy, Check, Eye, EyeOff, User, AlertCircle, Sparkles, Tv, Server, Globe } from "lucide-react";
import { performAdminLogin, getLocalAdminCredentials } from "../utils/apiClient";

interface AdminLoginPageProps {
  onLoginSuccess: (username: string, token: string) => void;
  onOpenPlayer?: (channelId?: string) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLoginSuccess, onOpenPlayer }) => {
  const localCreds = getLocalAdminCredentials();
  const [usernameInput, setUsernameInput] = useState(localCreds.username || "admin");
  const [passwordInput, setPasswordInput] = useState(localCreds.password || "admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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
        setErrorMessage(result.error || "Authentication failed. Please check credentials.");
      }
    } catch (err: any) {
      setErrorMessage("Authentication error: " + (err.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDefaults = () => {
    const currentDefaults = getLocalAdminCredentials();
    setUsernameInput(currentDefaults.username || "admin");
    setPasswordInput(currentDefaults.password || "admin123");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between items-center p-4 sm:p-6 relative overflow-hidden selection:bg-sky-500 selection:text-white">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Header Branding */}
      <header className="w-full max-w-md pt-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-sky-600 rounded-xl text-white shadow-lg shadow-sky-500/20 ring-1 ring-sky-400/30">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-slate-100 tracking-tight leading-none flex items-center gap-1.5">
              <span>ZEE5</span>
              <span className="text-sky-400">BUILDER</span>
            </h1>
            <span className="text-[10px] text-slate-400 font-medium">Control Plane & API Gateway</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
          <Server className="w-3.5 h-3.5 text-emerald-400" />
          <span>v2.5 Ready</span>
        </div>
      </header>

      {/* Main Admin Card */}
      <main className="w-full max-w-md my-auto z-10 py-8">
        <div className="bg-slate-900/90 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="space-y-2 text-center">
            <div className="inline-flex p-3 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-2xl mb-1 shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-100 tracking-tight">
              Admin Gateway Login
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              Authenticate with your Builder Admin account to access token management, channel synchronization, and M3U playlist builders.
            </p>
          </div>

          {/* Quick Credential Helper Box */}
          <div className="bg-sky-950/40 border border-sky-800/60 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-sky-300 font-bold flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                Default Admin Credentials
              </span>
              <button
                type="button"
                onClick={fillDefaults}
                className="text-[11px] bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 px-2.5 py-1 rounded-md font-semibold transition-colors"
              >
                Auto-Fill Login
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between">
                <div className="truncate">
                  <span className="text-slate-500 text-[10px] block font-sans">Username</span>
                  <span className="text-slate-200 font-bold">admin</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard("admin", "username")}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
                  title="Copy Username"
                >
                  {copiedField === "username" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between">
                <div className="truncate">
                  <span className="text-slate-500 text-[10px] block font-sans">Password</span>
                  <span className="text-amber-300 font-bold">admin123</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard("admin123", "password")}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
                  title="Copy Password"
                >
                  {copiedField === "password" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span className="break-words">{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-400" />
                <span>Username</span>
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                required
                placeholder="Enter admin username..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs font-mono focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  required
                  placeholder="Enter admin password..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs font-mono focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 pr-10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 mt-2"
            >
              <Lock className="w-4 h-4" />
              <span>{isSubmitting ? "Verifying Credentials..." : "Access Dashboard"}</span>
            </button>

            {onOpenPlayer && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => onOpenPlayer("0-9-zeemarathi")}
                  className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-sky-400 hover:text-sky-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-inner"
                >
                  <Tv className="w-4 h-4" />
                  <span>Launch Live Full Page Player (Free)</span>
                </button>
              </div>
            )}
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md pb-4 text-center text-slate-500 text-xs">
        <p className="flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>ZEE5 Dynamic Token & Playback Extractor Portal</span>
        </p>
      </footer>
    </div>
  );
};
