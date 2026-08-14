import React, { useState, useEffect } from "react";
import { Channel, ExtractedPlaybackData, PlaybackFullResponse, SessionTokens } from "./types";
import { JsonViewer } from "./components/JsonViewer";
import { AssetPreviewCard } from "./components/AssetPreviewCard";
import { ChannelManager } from "./components/ChannelManager";
import { TokenConfigurator } from "./components/TokenConfigurator";
import { ApiSnippetModal } from "./components/ApiSnippetModal";
import { PlaylistBuilder } from "./components/PlaylistBuilder";
import { AdminLoginModal } from "./components/AdminLoginModal";
import { AdminLoginPage } from "./components/AdminLoginPage";
import {
  safeFetchJson,
  fetchChannelsSafe,
  fetchTokensSafe,
  fetchPlaybackDetailsSafe,
  syncTokensFromRemoteApi,
  syncChannelsFromRemoteApi,
  getStoredAdminSession,
  clearAdminSession
} from "./utils/apiClient";
import {
  Tv,
  Play,
  Settings,
  Code2,
  ListFilter,
  RefreshCw,
  AlertCircle,
  SlidersHorizontal,
  ListMusic,
  Lock,
  ShieldCheck
} from "lucide-react";

export default function App() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("0-9-zeemarathi");
  const [customChannelInput, setCustomChannelInput] = useState<string>("");
  const [tokens, setTokens] = useState<SessionTokens>({
    sessionDeviceId: "27dd341d-035b-491f-be43-636a7ee2ee91",
    xAccessToken:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwbGF0Zm9ybV9jb2RlIjoiV2ViQCQhdDM4NzEyIiwiaXNzdWVkQXQiOiIyMDI2LTA4LTEzVDA2OjU3OjU0LjIwNFoiLCJwcm9kdWN0X2NvZGUiOiJ6ZWU1QDk3NSIsInR0bCI6ODY0MDAwMDAsImlhdCI6MTc4NjYwNDI3NH0.vAp05DYOp1hFKXZY-9Yem0YKnfy5RjqKdUGPnjTDhB0",
    xDdToken:
      "eyJzY2hlbWFfdmVyc2lvbiI6IjEiLCJvc19uYW1lIjoiV2luZG93cyIsIm9zX3ZlcnNpb24iOiIxMCIsInBsYXRmb3JtX25hbWUiOiJDaHJvbWUiLCJwbGF0Zm9ybV92ZXJzaW9uIjoiMTA0IiwiaGVyZV9jbGFzcyI6IldlYiIsImFwcF92ZXJzaW9uIjoiMi41Mi4zMSIsInBsYXllcl9jYXBhYmlsaXRpZXMiOnsiYXVkaW9fY2hhbm5lbCI6WyJTVEVSRU8iXSwidmlkZW9fY29kZWMiOlsiSDI2NCJdLCJjb250YWluZXIiOlsiTVA0IiwiVFMiXSwicGFja2FnZSI6WyJEQVNIIiwiSExTIl0sInJlc29sdXRpb24iOlsiMjQwcCIsIlNEIiwiSEQiLCJGSEQiXSwiZHluYW1pY19yYW5nZSI6WyJTRFIiXX0sInNlY3VyaXR5X2NhcGFiaWxpdGllcyI6eyJlbmNyeXB0aW9uIjpbIldJREVWSU5FX0FFU19DVFIiXSwid2lkZXZpbmVfc2VjdXJpdHlfbGV2ZWwiOlsiTDMiXSwiaGRjcF92ZXJzaW9uIjpbIkhEQ1BfVjEiLCJIRENQX1YyIiwiSERDUF9WMl8xIiwiSERDUF9WMl8yIl19fQ=="
  });

  const [extractedData, setExtractedData] = useState<ExtractedPlaybackData | null>(null);
  const [fullResponseData, setFullResponseData] = useState<any | null>(null);
  const [rawTextError, setRawTextError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"extractor" | "playlist" | "channels" | "tokens" | "code">("extractor");
  const [formatMode, setFormatMode] = useState<"summary" | "full">("summary");

  // Admin authentication state with persisted session support
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return Boolean(getStoredAdminSession());
  });
  const [adminUser, setAdminUser] = useState<string | null>(() => {
    return getStoredAdminSession()?.username || null;
  });
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  const deduplicateChannels = (list: any[]) => {
    const seenIds = new Set<string>();
    return list.map((c: any, idx: number) => {
      const rawId = (c.id || `channel-${idx}`).trim();
      let uniqueId = rawId;
      let count = 1;
      while (seenIds.has(uniqueId)) {
        uniqueId = `${rawId}-${count}`;
        count++;
      }
      seenIds.add(uniqueId);
      return {
        ...c,
        id: uniqueId,
        title: c.title || c.name || uniqueId
      };
    });
  };

  const loadChannels = async () => {
    const data = await fetchChannelsSafe();
    if (data && data.length > 0) {
      setChannels(deduplicateChannels(data));
    }
  };

  const loadTokens = async () => {
    const data = await fetchTokensSafe();
    if (data && data.sessionDeviceId) {
      setTokens(data);
    }
  };

  useEffect(() => {
    loadChannels();
    loadTokens();
  }, []);

  const extractPlaybackDetails = async (targetId: string) => {
    if (!targetId.trim()) return;
    setLoading(true);
    setRawTextError(null);

    try {
      const res = await fetchPlaybackDetailsSafe(targetId, tokens, channels);

      if (!res.ok || !res.extracted) {
        setRawTextError(res.error || "Failed to fetch stream details.");
        setExtractedData(null);
        setFullResponseData(res.fullResponse || { error: res.error });
      } else {
        setExtractedData(res.extracted);
        setFullResponseData(res.fullResponse);
        if (res.error && !res.isClientFallback) {
          setRawTextError(res.error);
        }
      }
    } catch (err: any) {
      setRawTextError("Playback resolution notice: " + err.message);
      setExtractedData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminLoggedIn) {
      extractPlaybackDetails(selectedChannelId);
    }
  }, [isAdminLoggedIn]);

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
    setCustomChannelInput(channelId);
    extractPlaybackDetails(channelId);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const idToUse = customChannelInput.trim() || selectedChannelId;
    extractPlaybackDetails(idToUse);
  };

  const handleUpdateChannels = async (newChannels: Channel[]) => {
    try {
      const deduped = deduplicateChannels(newChannels);
      setChannels(deduped);
      await safeFetchJson("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: deduped })
      });
    } catch (err) {
      console.error("Error saving channel register:", err);
    }
  };

  const handleSaveTokens = async (newTokens: SessionTokens) => {
    try {
      setTokens(newTokens);
      await safeFetchJson("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTokens)
      });
      extractPlaybackDetails(selectedChannelId);
    } catch (err) {
      console.error("Error updating tokens:", err);
    }
  };

  const handleSyncTokens = async (apiUrl?: string): Promise<boolean> => {
    try {
      const res = await syncTokensFromRemoteApi(apiUrl);
      if (res.success && res.tokens) {
        setTokens(res.tokens);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error syncing tokens:", err);
      return false;
    }
  };

  const handleSyncChannels = async (apiUrl?: string): Promise<{ success: boolean; count?: number; error?: string }> => {
    try {
      const res = await syncChannelsFromRemoteApi(apiUrl);
      if (res.success && res.channels) {
        const normalized = deduplicateChannels(res.channels);
        setChannels(normalized);
        return { success: true, count: normalized.length };
      } else {
        return { success: false, error: res.error || "Failed to sync channel list." };
      }
    } catch (err: any) {
      console.error("Error syncing channels:", err);
      return { success: false, error: err.message };
    }
  };

  const handleResetTokens = async () => {
    const defaultTokens: SessionTokens = {
      sessionDeviceId: "27dd341d-035b-491f-be43-636a7ee2ee91",
      xAccessToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwbGF0Zm9ybV9jb2RlIjoiV2ViQCQhdDM4NzEyIiwiaXNzdWVkQXQiOiIyMDI2LTA4LTEzVDA2OjU3OjU0LjIwNFoiLCJwcm9kdWN0X2NvZGUiOiJ6ZWU1QDk3NSIsInR0bCI6ODY0MDAwMDAsImlhdCI6MTc4NjYwNDI3NH0.vAp05DYOp1hFKXZY-9Yem0YKnfy5RjqKdUGPnjTDhB0",
      xDdToken:
        "eyJzY2hlbWFfdmVyc2lvbiI6IjEiLCJvc19uYW1lIjoiV2luZG93cyIsIm9zX3ZlcnNpb24iOiIxMCIsInBsYXRmb3JtX25hbWUiOiJDaHJvbWUiLCJwbGF0Zm9ybV92ZXJzaW9uIjoiMTA0IiwiaGVyZV9jbGFzcyI6IldlYiIsImFwcF92ZXJzaW9uIjoiMi41Mi4zMSIsInBsYXllcl9jYXBhYmlsaXRpZXMiOnsiYXVkaW9fY2hhbm5lbCI6WyJTVEVSRU8iXSwidmlkZW9fY29kZWMiOlsiSDI2NCJdLCJjb250YWluZXIiOlsiTVA0IiwiVFMiXSwicGFja2FnZSI6WyJEQVNIIiwiSExTIl0sInJlc29sdXRpb24iOlsiMjQwcCIsIlNEIiwiSEQiLCJGSEQiXSwiZHluYW1pY19yYW5nZSI6WyJTRFIiXX0sInNlY3VyaXR5X2NhcGFiaWxpdGllcyI6eyJlbmNyeXB0aW9uIjpbIldJREVWSU5FX0FFU19DVFIiXSwid2lkZXZpbmVfc2VjdXJpdHlfbGV2ZWwiOlsiTDMiXSwiaGRjcF92ZXJzaW9uIjpbIkhEQ1BfVjEiLCJIRENQX1YyIiwiSERDUF9WMl8xIiwiSERDUF9WMl8yIl19fQ=="
    };
    await handleSaveTokens(defaultTokens);
  };

  if (!isAdminLoggedIn) {
    return (
      <AdminLoginPage
        onLoginSuccess={(username) => {
          setIsAdminLoggedIn(true);
          setAdminUser(username);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-sky-950">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">ZEE5 Stream Control</h1>
                <span className="text-[10px] font-mono bg-sky-950 text-sky-400 border border-sky-800 px-2 py-0.5 rounded-full">
                  v15 API
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs & Admin Status */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <nav className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800/80 overflow-x-auto no-scrollbar max-w-full">
              <button
                onClick={() => setActiveTab("extractor")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                  activeTab === "extractor" ? "bg-sky-600 text-white shadow-md shadow-sky-950 font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>Extractor & JSON</span>
              </button>

              <button
                onClick={() => setActiveTab("playlist")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                  activeTab === "playlist" ? "bg-sky-600 text-white shadow-md shadow-sky-950 font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <ListMusic className="w-3.5 h-3.5 text-amber-400" />
                <span>M3U Playlist Builder</span>
              </button>

              <button
                onClick={() => setActiveTab("channels")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                  activeTab === "channels" ? "bg-sky-600 text-white shadow-md shadow-sky-950 font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Channel Register</span>
              </button>

              <button
                onClick={() => setActiveTab("tokens")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                  activeTab === "tokens" ? "bg-sky-600 text-white shadow-md shadow-sky-950 font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Session Tokens</span>
              </button>

              <button
                onClick={() => setActiveTab("code")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                  activeTab === "code" ? "bg-sky-600 text-white shadow-md shadow-sky-950 font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Integration Code & AI</span>
              </button>
            </nav>

            {/* Admin Login Status Button */}
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all shrink-0 ${
                isAdminLoggedIn
                  ? "bg-emerald-950/80 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900/80"
                  : "bg-amber-950/80 border-amber-700/80 text-amber-300 hover:bg-amber-900/80 animate-pulse"
              }`}
            >
              {isAdminLoggedIn ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Admin: {adminUser || "admin"}</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin Login</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {activeTab === "extractor" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-sky-400" />
                  <h2 className="text-base font-bold text-slate-100">Live Channel Stream Extractor</h2>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">JSON Format View:</span>
                  <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setFormatMode("summary")}
                      className={`px-2.5 py-1 rounded text-xs font-medium ${
                        formatMode === "summary" ? "bg-sky-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Filtered Extracted
                    </button>
                    <button
                      onClick={() => setFormatMode("full")}
                      className={`px-2.5 py-1 rounded text-xs font-medium ${
                        formatMode === "full" ? "bg-sky-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Full Raw Response
                    </button>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCustomSubmit} className="flex flex-col sm:flex-row items-stretch gap-3">
                <div className="sm:w-64 shrink-0">
                  <label className="block text-xs text-slate-400 mb-1">Select Registered Channel:</label>
                  <select
                    value={selectedChannelId}
                    onChange={(e) => {
                      setSelectedChannelId(e.target.value);
                      setCustomChannelInput(e.target.value);
                      extractPlaybackDetails(e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    {channels.map((c, idx) => (
                      <option key={`${c.id}-${idx}`} value={c.id}>
                        {c.title} ({c.id}) - [{(c.language || "en").toUpperCase()}]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">Target Channel ID (`id` parameter):</label>
                  <input
                    type="text"
                    placeholder="Enter Channel ID e.g. 0-9-zeemarathi"
                    value={customChannelInput || selectedChannelId}
                    onChange={(e) => setCustomChannelInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-5 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-sky-950"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    <span>{loading ? "Extracting..." : "Extract JSON"}</span>
                  </button>
                </div>
              </form>

              <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                <span className="text-[11px] text-slate-500 shrink-0 font-medium">Quick Select:</span>
                {channels.slice(0, 7).map((c, idx) => (
                  <button
                    key={`${c.id}-${idx}`}
                    onClick={() => handleChannelSelect(c.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono whitespace-nowrap transition-colors border ${
                      (selectedChannelId === c.id || customChannelInput === c.id)
                        ? "bg-sky-600/30 text-sky-300 border-sky-500 font-semibold"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                    }`}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            </div>

            {rawTextError && (
              <div className="bg-rose-950/80 border border-rose-800 rounded-xl p-4 flex items-start gap-3 text-rose-200 text-xs">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-rose-300 text-sm">Extraction Error</h4>
                  <p className="font-mono break-words">{rawTextError}</p>
                </div>
              </div>
            )}

            {extractedData && (
              <AssetPreviewCard
                data={extractedData}
                loading={loading}
                onAddToPlaylist={() => setActiveTab("playlist")}
              />
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-sky-400" />
                  <h3 className="text-base font-bold text-slate-100">
                    {formatMode === "summary" ? "Extracted Channel JSON Output" : "Raw Zee5 Upstream Response JSON"}
                  </h3>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Response Mode:</span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-[11px]">
                    {formatMode === "summary" ? "Filtered Exact Fields" : "Full Upstream Payload"}
                  </span>
                </div>
              </div>

              <JsonViewer
                title={formatMode === "summary" ? `Filtered JSON Output (${extractedData?.id || selectedChannelId})` : "Raw Upstream Zee5 Payload"}
                data={
                  formatMode === "summary"
                    ? extractedData || { error: rawTextError }
                    : fullResponseData || { error: rawTextError }
                }
              />
            </div>
          </div>
        )}

        {activeTab === "playlist" && (
          <PlaylistBuilder
            channels={channels}
            currentExtracted={extractedData}
            onSelectChannelForPlayback={(id) => {
              handleChannelSelect(id);
              setActiveTab("extractor");
            }}
          />
        )}

        {activeTab === "channels" && (
          <ChannelManager
            channels={channels}
            onSelectChannel={(id) => {
              handleChannelSelect(id);
              setActiveTab("extractor");
            }}
            selectedChannelId={selectedChannelId}
            onUpdateChannels={handleUpdateChannels}
            onSyncChannels={handleSyncChannels}
          />
        )}

        {activeTab === "tokens" && (
          <TokenConfigurator
            tokens={tokens}
            onSaveTokens={handleSaveTokens}
            onResetTokens={handleResetTokens}
            onSyncTokens={handleSyncTokens}
          />
        )}

        {activeTab === "code" && <ApiSnippetModal channelId={selectedChannelId} />}
      </main>

      {/* Admin Login & Portal Modal */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        isLoggedIn={isAdminLoggedIn}
        loggedInUser={adminUser}
        onLoginSuccess={(username) => {
          setIsAdminLoggedIn(true);
          setAdminUser(username);
          setIsAdminModalOpen(false);
        }}
        onLogout={() => {
          clearAdminSession();
          setIsAdminLoggedIn(false);
          setAdminUser(null);
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Zee5 Channel Extractor & Stream Data Inspector</span>
          <span className="font-mono text-[11px] text-slate-600">Endpoint: /api/playback?id=CHANNEL_ID</span>
        </div>
      </footer>
    </div>
  );
}
