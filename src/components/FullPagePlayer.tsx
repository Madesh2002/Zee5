import React, { useState, useEffect, useRef } from "react";
import { Channel, SessionTokens, ExtractedPlaybackData } from "../types";
import { LiveStreamPlayer } from "./LiveStreamPlayer";
import {
  fetchChannelsSafe,
  fetchTokensSafe,
  fetchPlaybackDetailsSafe,
  safeFetchJson
} from "../utils/apiClient";
import {
  Tv,
  Play,
  ArrowLeft,
  Search,
  SlidersHorizontal,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Radio,
  Sparkles,
  Layers,
  LayoutDashboard,
  Volume2
} from "lucide-react";

interface FullPagePlayerProps {
  initialChannelId?: string;
  onBackToDashboard?: () => void;
  isAdmin?: boolean;
}

export const FullPagePlayer: React.FC<FullPagePlayerProps> = ({
  initialChannelId = "0-9-zeemarathi",
  onBackToDashboard,
  isAdmin = false
}) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>(initialChannelId);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [playbackData, setPlaybackData] = useState<ExtractedPlaybackData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [tokens, setTokens] = useState<SessionTokens | null>(null);

  // Load channels and tokens on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [channelsData, tokensData] = await Promise.all([
          fetchChannelsSafe(),
          fetchTokensSafe()
        ]);
        if (channelsData && channelsData.length > 0) {
          setChannels(channelsData);
        }
        if (tokensData && tokensData.sessionDeviceId) {
          setTokens(tokensData);
        }
      } catch (err) {
        console.warn("Failed to preload channels/tokens:", err);
      }
    }
    loadInitialData();
  }, []);

  // Fetch playback details when selectedChannelId changes
  const loadChannelStream = async (targetId: string) => {
    if (!targetId) return;
    setLoading(true);
    setErrorMsg(null);

    // Update browser URL query without reloading the page
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("id", targetId);
      window.history.replaceState({}, "", url.toString());
    } catch {
      // ignore in iframe environments
    }

    try {
      const res = await fetchPlaybackDetailsSafe(targetId, tokens || undefined, channels);
      if (res.ok && res.extracted) {
        setPlaybackData(res.extracted);
        setErrorMsg(null);
      } else {
        setErrorMsg(res.error || `Could not load stream token for channel "${targetId}".`);
        setPlaybackData(null);
      }
    } catch (err: any) {
      setErrorMsg("Playback error: " + (err.message || String(err)));
      setPlaybackData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChannelStream(selectedChannelId);
  }, [selectedChannelId]);

  // Active channel metadata
  const currentChannel = channels.find((c) => c.id === selectedChannelId) || {
    id: selectedChannelId,
    title: playbackData?.title || selectedChannelId,
    name: playbackData?.title || selectedChannelId,
    genre: playbackData?.category || "Entertainment",
    language: playbackData?.language || "Indian",
    logo: playbackData?.image_url || ""
  };

  // Extract categories
  const categories = ["All", ...Array.from(new Set(channels.map((c) => c.genre || c.category || "General").filter(Boolean)))];

  // Filter channels
  const filteredChannels = channels.filter((c) => {
    const title = (c.title || c.name || c.id || "").toLowerCase();
    const lang = (c.language || "").toLowerCase();
    const genre = (c.genre || c.category || "").toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = title.includes(query) || lang.includes(query) || c.id.toLowerCase().includes(query);
    const matchesCat = selectedCategory === "All" || (c.genre || c.category || "General") === selectedCategory;

    return matchesSearch && matchesCat;
  });

  // Next / Previous Channel Navigation
  const currentChannelIndex = channels.findIndex((c) => c.id === selectedChannelId);
  const handlePrevChannel = () => {
    if (channels.length === 0) return;
    const prevIdx = currentChannelIndex <= 0 ? channels.length - 1 : currentChannelIndex - 1;
    setSelectedChannelId(channels[prevIdx].id);
  };
  const handleNextChannel = () => {
    if (channels.length === 0) return;
    const nextIdx = currentChannelIndex >= channels.length - 1 ? 0 : currentChannelIndex + 1;
    setSelectedChannelId(channels[nextIdx].id);
  };

  // Copy shareable player URL
  const handleCopyShareUrl = () => {
    const origin = window.location.origin;
    const shareUrl = `${origin}/player?id=${encodeURIComponent(selectedChannelId)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Bar Header */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all shadow-sm"
              title="Return to Stream Extractor Dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-sky-950">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span>{currentChannel.title || currentChannel.name || selectedChannelId}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </h1>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block font-mono">
                {selectedChannelId} • {currentChannel.language || "Regional"} • {currentChannel.genre || "Live TV"}
              </p>
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {/* Previous / Next TV Channel Buttons */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <button
              onClick={handlePrevChannel}
              className="p-1.5 hover:bg-slate-800 text-slate-300 transition-colors border-r border-slate-800"
              title="Previous Channel"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextChannel}
              className="p-1.5 hover:bg-slate-800 text-slate-300 transition-colors"
              title="Next Channel"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Share Player Link Button */}
          <button
            onClick={handleCopyShareUrl}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium transition-colors"
            title="Copy Full Page Player URL"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{copiedLink ? "Copied Link" : "Share URL"}</span>
          </button>

          {/* Channel Drawer Toggle */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              isSidebarOpen
                ? "bg-sky-600 border-sky-500 text-white shadow-md shadow-sky-950"
                : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-sky-400"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Channels ({channels.length})</span>
          </button>
        </div>
      </header>

      {/* Main Player Viewport & Drawer Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Central Full Page Video Viewport */}
        <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 bg-black relative overflow-y-auto">
          <div className="w-full max-w-5xl my-auto space-y-4">
            {loading ? (
              <div className="aspect-video w-full bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center p-6 space-y-3 shadow-2xl">
                <div className="w-12 h-12 border-3 border-sky-500/30 border-t-sky-400 rounded-full animate-spin"></div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Authenticating Live ZEE5 Feed...</h3>
                  <p className="text-xs text-slate-400 font-mono mt-1">Channel ID: {selectedChannelId}</p>
                </div>
              </div>
            ) : playbackData?.video_token ? (
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950 p-2 sm:p-3">
                <LiveStreamPlayer
                  streamUrl={playbackData.video_token}
                  poster={playbackData.image_url || currentChannel.logo || undefined}
                  title={playbackData.title || currentChannel.title || selectedChannelId}
                  channelId={selectedChannelId}
                  autoPlay={true}
                  onRefreshToken={async () => {
                    const res = await fetchPlaybackDetailsSafe(selectedChannelId, tokens || undefined, channels);
                    return res.ok && res.extracted?.video_token ? res.extracted.video_token : null;
                  }}
                />
              </div>
            ) : (
              <div className="aspect-video w-full bg-slate-950 rounded-2xl border border-rose-900/40 flex flex-col items-center justify-center text-center p-6 space-y-4 shadow-2xl">
                <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Tv className="w-7 h-7" />
                </div>
                <div className="max-w-md">
                  <h3 className="text-base font-bold text-rose-300">Live Stream Unavailable</h3>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    {errorMsg || "Unable to acquire active video token."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => loadChannelStream(selectedChannelId)}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Extraction</span>
                  </button>
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl transition-all"
                  >
                    Choose Another Channel
                  </button>
                </div>
              </div>
            )}

            {/* Stream Quick Info & Badges */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                {currentChannel.logo && (
                  <img
                    src={currentChannel.logo}
                    alt={currentChannel.title}
                    className="w-8 h-8 rounded-lg object-contain bg-slate-950 p-1 border border-slate-800"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                )}
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {currentChannel.title || currentChannel.name || selectedChannelId}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span className="text-sky-400 font-medium">{currentChannel.genre || "General"}</span>
                    <span>•</span>
                    <span>{currentChannel.language || "Regional"}</span>
                    <span>•</span>
                    <span className="font-mono text-emerald-400">HLS / CMAF</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-300 font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Switch Channel</span>
                </button>
                {playbackData?.video_token && (
                  <a
                    href={playbackData.video_token}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors flex items-center gap-1"
                    title="Open Direct M3U8 Stream"
                  >
                    <span>M3U8</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Right Channels Drawer / Sidebar */}
        <aside
          className={`fixed sm:relative inset-y-0 right-0 z-30 w-80 sm:w-88 bg-slate-950/98 backdrop-blur-xl border-l border-slate-800 flex flex-col transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? "translate-x-0" : "translate-x-full sm:hidden"
          }`}
        >
          {/* Drawer Header */}
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-sky-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Live Channels</h2>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
                {filteredChannels.length}
              </span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              &times;
            </button>
          </div>

          {/* Search and Filters */}
          <div className="p-3 border-b border-slate-800 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search channel by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-sky-500"
              />
            </div>

            {/* Category horizontal scroll */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
              {categories.slice(0, 6).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? "bg-sky-600 text-white"
                      : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Channel Scrollable List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-900">
            {filteredChannels.map((chan) => {
              const isSelected = chan.id === selectedChannelId;
              return (
                <button
                  key={chan.id}
                  onClick={() => {
                    setSelectedChannelId(chan.id);
                    if (window.innerWidth < 640) {
                      setIsSidebarOpen(false);
                    }
                  }}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all ${
                    isSelected
                      ? "bg-sky-600/20 border border-sky-500/40 text-white font-bold shadow-sm"
                      : "hover:bg-slate-900/80 text-slate-300 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {chan.logo ? (
                      <img
                        src={chan.logo}
                        alt={chan.title}
                        className="w-7 h-7 rounded-lg object-contain bg-slate-950 p-0.5 border border-slate-800 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-[10px] shrink-0">
                        {chan.title ? chan.title.slice(0, 2).toUpperCase() : "TV"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold truncate leading-tight">
                        {chan.title || chan.name || chan.id}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                        {chan.language || chan.genre || chan.id}
                      </p>
                    </div>
                  </div>

                  {isSelected ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
                  ) : (
                    <Play className="w-3 h-3 text-slate-600 group-hover:text-slate-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
};
