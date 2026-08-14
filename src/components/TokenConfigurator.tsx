import React, { useState, useEffect } from "react";
import { SessionTokens } from "../types";
import { KeyRound, Shield, Check, RotateCcw, Info, Sparkles, RefreshCw, Globe, CheckCircle2, Network, Eye, EyeOff, Laptop, Clipboard, Sliders, CheckCircle } from "lucide-react";
import { safeFetchJson } from "../utils/apiClient";

interface TokenConfiguratorProps {
  tokens: SessionTokens;
  onSaveTokens: (newTokens: SessionTokens) => Promise<void>;
  onResetTokens: () => void;
  onSyncTokens: (apiUrl?: string) => Promise<boolean>;
}

export const TokenConfigurator: React.FC<TokenConfiguratorProps> = ({
  tokens,
  onSaveTokens,
  onResetTokens,
  onSyncTokens
}) => {
  const [formData, setFormData] = useState<SessionTokens>(tokens);
  const [entryMode, setEntryMode] = useState<"two_key_manual" | "advanced">("two_key_manual");
  const [apiUrl, setApiUrl] = useState<string>("https://api.npoint.io/93c975444d3026f32395");
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDetectingIp, setIsDetectingIp] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(tokens);
  }, [tokens]);

  const handleDetectUserIp = async () => {
    setIsDetectingIp(true);
    try {
      const res = await safeFetchJson<{ ip?: string }>("/api/my-ip");
      if (res.data?.ip) {
        setFormData((prev) => ({ ...prev, userIpAddress: res.data!.ip }));
      } else {
        const ipifyRes = await safeFetchJson<{ ip?: string }>("https://api.ipify.org?format=json");
        if (ipifyRes.data?.ip) {
          setFormData((prev) => ({ ...prev, userIpAddress: ipifyRes.data!.ip }));
        }
      }
    } catch {
      try {
        const res = await safeFetchJson<{ ip?: string }>("https://api.ipify.org?format=json");
        if (res.data?.ip) {
          setFormData((prev) => ({ ...prev, userIpAddress: res.data!.ip }));
        }
      } catch (err) {
        console.error("Failed to detect client IP:", err);
      }
    } finally {
      setIsDetectingIp(false);
    }
  };

  const decodeJwtPayload = (jwtString: string) => {
    try {
      const parts = (jwtString || "").trim().split(".");
      if (parts.length !== 3) return null;
      const decoded = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
      const parsed = JSON.parse(decoded);
      return {
        ...parsed,
        issuedAt: parsed.iat ? new Date(parsed.iat * 1000).toLocaleString() : null,
        expiresAt: parsed.exp ? new Date(parsed.exp * 1000).toLocaleString() : null,
        product_code: parsed.product_code || parsed.aud || "zee5"
      };
    } catch {
      return null;
    }
  };

  const decodedAccess = decodeJwtPayload(formData.xAccessToken);

  const handlePasteDeviceId = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setFormData((prev) => ({ ...prev, sessionDeviceId: text.trim() }));
      }
    } catch (e) {
      console.warn("Clipboard paste failed", e);
    }
  };

  const handlePasteAccessToken = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setFormData((prev) => ({ ...prev, xAccessToken: text.trim() }));
      }
    } catch (e) {
      console.warn("Clipboard paste failed", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    // Ensure default xDdToken is preserved if blank in manual 2-key mode
    const payloadToSave = {
      ...formData,
      sessionDeviceId: formData.sessionDeviceId.trim(),
      xAccessToken: formData.xAccessToken.trim(),
      xDdToken: formData.xDdToken?.trim() || tokens.xDdToken || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXIiOiIxLjAiLCJwbGF0Zm9ybSI6IndlYl9hcHAiLCJtYXhfcXVhbGl0eSI6IjEwODBwIiwiY2FwYWJpbGl0aWVzIjpbImhkciIsIjEwODBwIl19.signature"
    };
    await onSaveTokens(payloadToSave);
    setIsSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSyncRemote = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(false);

    try {
      const ok = await onSyncTokens(apiUrl);
      if (ok) {
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 3000);
      } else {
        setSyncError("Failed to fetch valid tokens from provided remote API.");
      }
    } catch (err: any) {
      setSyncError(err.message || "Network error while syncing tokens.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Remote API Token Sync Box */}
      <div className="bg-gradient-to-r from-sky-950/80 via-slate-900 to-indigo-950/80 border border-sky-800/80 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-sky-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-900/80 border border-sky-700/80 rounded-lg text-sky-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Dynamic Remote API Token Sync</h3>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Auto-Fetch Ready
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Synchronize session tokens dynamically from your remote JSON API endpoint (npoint format).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSyncRemote}
            disabled={isSyncing}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-md transition-all shrink-0 border border-sky-400/30"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Fetching API Tokens..." : "Sync Tokens Now"}</span>
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-200">Remote Token Source Endpoint URL:</label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              required
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.npoint.io/93c975444d3026f32395"
              className="flex-1 bg-slate-950/90 border border-sky-900/80 rounded-lg p-2.5 font-mono text-xs text-sky-300 focus:outline-none focus:border-sky-400"
            />
            <button
              type="button"
              onClick={() => setApiUrl("https://api.npoint.io/93c975444d3026f32395")}
              className="px-3 py-2.5 text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-700 rounded-lg shrink-0"
            >
              Default npoint
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1 gap-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Last Synced:</span>
            <span className="font-mono text-sky-300">
              {tokens.lastTokenSyncTime
                ? new Date(tokens.lastTokenSyncTime).toLocaleString()
                : "Just now on server boot"}
            </span>
          </div>

          {syncSuccess && (
            <span className="text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-950/80 border border-emerald-800 px-2.5 py-0.5 rounded-full text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Tokens Updated from Remote API!
            </span>
          )}

          {syncError && <span className="text-rose-400 font-mono text-[11px]">Error: {syncError}</span>}
        </div>
      </div>

      {/* Manual Token Entry & Inspector Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-slate-100">Active Token Inspector & Manual Override</h3>
              <p className="text-xs text-slate-400">
                Directly enter your custom <b>Session Device ID</b> and <b>x-access-token</b> manually.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Mode Switcher */}
            <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setEntryMode("two_key_manual")}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                  entryMode === "two_key_manual"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Manual (Device ID + x-access-token)</span>
              </button>
              <button
                type="button"
                onClick={() => setEntryMode("advanced")}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                  entryMode === "advanced"
                    ? "bg-sky-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Advanced Inspector</span>
              </button>
            </div>

            <button
              onClick={() => {
                onResetTokens();
                setFormData(tokens);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        {entryMode === "two_key_manual" && (
          <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl text-xs text-amber-200/90 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">Quick Manual Pair Mode Active</p>
              <p className="text-[11px] text-amber-200/70 mt-0.5">
                Only <b>Session Device ID</b> and <b>x-access-token</b> are required. The server automatically uses the high-performance 1080p device capability token and active IP spoofing.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Field 1: Session Device ID */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-200">
                1. Session Device ID (`X-Z5-Guest-Token` / `device_id` / `ppid`)
              </label>
              <button
                type="button"
                onClick={handlePasteDeviceId}
                className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/60 transition-colors"
              >
                <Clipboard className="w-3 h-3" /> Paste from Clipboard
              </button>
            </div>
            <input
              type="text"
              required
              value={formData.sessionDeviceId}
              onChange={(e) => setFormData({ ...formData, sessionDeviceId: e.target.value })}
              placeholder="e.g. 27dd341d-035b-491f-be43-636a7ee2ee91"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-slate-100 focus:outline-none focus:border-amber-500 shadow-inner"
            />
            <p className="text-[11px] text-slate-500">
              Found in ZEE5 network traffic as header <code>X-Z5-Guest-Token</code> or query <code>device_id</code> / <code>ppid</code>.
            </p>
          </div>

          {/* Field 2: x-access-token */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="block text-xs font-bold text-slate-200">
                2. `x-access-token` (JWT Guest / Web Auth Token)
              </label>
              <div className="flex items-center gap-2">
                {decodedAccess && (
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Product: {decodedAccess.product_code || "zee5"} | Issued: {decodedAccess.issuedAt || "Active"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handlePasteAccessToken}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 transition-colors"
                >
                  <Clipboard className="w-3 h-3" /> Paste JWT
                </button>
              </div>
            </div>
            <textarea
              rows={3}
              required
              value={formData.xAccessToken}
              onChange={(e) => setFormData({ ...formData, xAccessToken: e.target.value })}
              placeholder="Paste your JWT x-access-token starting with eyJhbGciOiJIUzI1Ni..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-emerald-400 focus:outline-none focus:border-emerald-500 resize-y shadow-inner"
            />
            <p className="text-[11px] text-slate-500">
              Paste the full JWT authentication string from your browser / app capture.
            </p>
          </div>

          {/* Advanced Fields (Shown in Advanced Mode) */}
          {entryMode === "advanced" && (
            <div className="space-y-4 pt-2 border-t border-slate-800/80">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    3. `x-dd-token` (Device Capabilities Token)
                  </label>
                  <span className="text-[10px] text-amber-300 font-mono font-bold bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full">
                    Max Quality: 1080p FHD (1920x1080)
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={formData.xDdToken}
                  onChange={(e) => setFormData({ ...formData, xDdToken: e.target.value })}
                  placeholder="Device capabilities token"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-amber-300 focus:outline-none focus:border-sky-500 resize-y"
                />
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Network className="w-4 h-4 text-sky-400" />
                    <span>Forwarded User IP Address (`X-Forwarded-For` / `X-Real-IP`)</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleDetectUserIp}
                    disabled={isDetectingIp}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-300 rounded-lg transition-all"
                  >
                    <Laptop className="w-3 h-3" />
                    <span>{isDetectingIp ? "Detecting..." : "Auto-Detect My IP"}</span>
                  </button>
                </div>

                <div className="p-3 bg-sky-950/40 border border-sky-800/50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-sky-200">Dynamic IP Routing / Per-Request Rotation</span>
                        <p className="text-[11px] text-slate-400">Rotates the forwarded client IP on every request to prevent rate limits and IP blocking.</p>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={formData.autoRotateIp !== false}
                      onChange={(e) => setFormData({ ...formData, autoRotateIp: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 cursor-pointer"
                    />
                  </div>
                </div>

                <input
                  type="text"
                  value={formData.userIpAddress || ""}
                  onChange={(e) => setFormData({ ...formData, userIpAddress: e.target.value })}
                  placeholder={formData.autoRotateIp !== false ? "Dynamic IP Rotation Active (or type static IP e.g. 103.211.12.50)" : "e.g. 103.211.12.50"}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-sky-300 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer">
                      {formData.hideRawVideoToken ? (
                        <EyeOff className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-slate-400" />
                      )}
                      <span>Hide Raw `video_token` & Use Host Domain Redirect</span>
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Replaces raw upstream ZEE5 token URLs in responses with host domain stream links (<code>https://&lt;domain&gt;/api/live/:id.m3u8</code>).
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={Boolean(formData.hideRawVideoToken)}
                    onChange={(e) => setFormData({ ...formData, hideRawVideoToken: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
              <span>
                {entryMode === "two_key_manual"
                  ? "Saving applies your custom Device ID and x-access-token instantly across the entire server."
                  : "Tokens are stored in server memory and used automatically for all requests."}
              </span>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold rounded-lg shadow-lg shadow-amber-950/40 transition-all cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Custom Tokens Saved & Active!</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>{isSaving ? "Applying..." : "Save & Apply Custom Tokens"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
