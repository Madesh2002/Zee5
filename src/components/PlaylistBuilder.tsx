import React, { useState, useEffect, useMemo } from "react";
import { Channel, PlaylistItem, ExtractedPlaybackData } from "../types";
import {
  ListMusic,
  Play,
  Plus,
  Trash2,
  Copy,
  Download,
  RefreshCw,
  Check,
  Globe,
  Sliders,
  Sparkles,
  Search,
  CheckSquare,
  Square,
  FileText,
  Radio,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { safeFetchJson, fetchPlaybackDetailsSafe } from "../utils/apiClient";

interface PlaylistBuilderProps {
  channels: Channel[];
  currentExtracted?: ExtractedPlaybackData | null;
  onSelectChannelForPlayback?: (channelId: string) => void;
}

export const PlaylistBuilder: React.FC<PlaylistBuilderProps> = ({
  channels,
  currentExtracted,
  onSelectChannelForPlayback
}) => {
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("ALL");

  // Options for M3U output
  const [streamUrlType, setStreamUrlType] = useState<"full_video_token" | "server_redirect">("full_video_token");
  const [includeTvgLogo, setIncludeTvgLogo] = useState(true);
  const [includeTvgId, setIncludeTvgId] = useState(true);
  const [includeGroupTitle, setIncludeGroupTitle] = useState(true);
  const [includeVlcUserAgent, setIncludeVlcUserAgent] = useState(true);
  const [includeVlcReferrer, setIncludeVlcReferrer] = useState(true);
  const [playlistTitle, setPlaylistTitle] = useState("Zee5 Live IPTV Playlist");
  const [userAgentStr, setUserAgentStr] = useState("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

  // Batch extraction state
  const [isBatchFetching, setIsBatchFetching] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchConcurrency, setBatchConcurrency] = useState(3);

  // Manual Add Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newVideoToken, setNewVideoToken] = useState("");
  const [newId, setNewId] = useState("");
  const [newGenre, setNewGenre] = useState("General");
  const [newLanguage, setNewLanguage] = useState("en");

  // UI state
  const [copiedM3u, setCopiedM3u] = useState(false);
  const [copiedApiUrl, setCopiedApiUrl] = useState(false);
  const [copiedItemToken, setCopiedItemToken] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0 && channels.length > 0) {
      const initialItems: PlaylistItem[] = channels.map((c) => ({
        id: c.id,
        title: c.title || c.name || c.id,
        image_url: c.logo || "",
        video_token: c.url || "",
        language: c.language || "en",
        genre: c.genre || c.language?.toUpperCase() || "General",
        selected: true,
        status: c.url ? "success" : "idle"
      }));
      setItems(initialItems);
    }
  }, [channels]);

  const genres = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.genre) set.add(item.genre);
      if (item.language) set.add(item.language.toUpperCase());
    });
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.video_token && item.video_token.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesGenre =
        selectedGenre === "ALL" ||
        item.genre === selectedGenre ||
        item.language?.toUpperCase() === selectedGenre;
      return matchesSearch && matchesGenre;
    });
  }, [items, searchTerm, selectedGenre]);

  const handleAddCurrentExtracted = () => {
    if (!currentExtracted) return;
    const newItem: PlaylistItem = {
      id: currentExtracted.id || `custom-${Date.now()}`,
      title: currentExtracted.title || "Extracted Channel",
      image_url: currentExtracted.image_url || "",
      video_token: currentExtracted.video_token || "",
      selected: true,
      status: currentExtracted.video_token ? "success" : "error"
    };

    setItems((prev) => {
      const existsIndex = prev.findIndex((i) => i.id === newItem.id);
      if (existsIndex >= 0) {
        const updated = [...prev];
        updated[existsIndex] = newItem;
        return updated;
      }
      return [newItem, ...prev];
    });
  };

  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newVideoToken.trim()) return;

    const itemId = newId.trim() || `stream-${Date.now()}`;
    const newItem: PlaylistItem = {
      id: itemId,
      title: newTitle.trim(),
      image_url: newImageUrl.trim(),
      video_token: newVideoToken.trim(),
      genre: newGenre.trim() || "General",
      language: newLanguage.trim() || "en",
      selected: true,
      status: "success"
    };

    setItems((prev) => [newItem, ...prev]);

    setNewTitle("");
    setNewImageUrl("");
    setNewVideoToken("");
    setNewId("");
    setShowAddForm(false);
  };

  const handleImportRegister = () => {
    const registerItems: PlaylistItem[] = channels.map((c) => ({
      id: c.id,
      title: c.title || c.name || c.id,
      image_url: c.logo || "",
      video_token: c.url || "",
      language: c.language || "en",
      genre: c.genre || c.language?.toUpperCase() || "General",
      selected: true,
      status: c.url ? "success" : "idle"
    }));

    setItems(registerItems);
  };

  const handleBatchFetchTokens = async (onlySelected = false) => {
    const targets = items.filter((i) => (onlySelected ? i.selected : true));
    if (targets.length === 0) return;

    setIsBatchFetching(true);
    setBatchProgress({ current: 0, total: targets.length });

    const fetchSingleToken = async (item: PlaylistItem): Promise<PlaylistItem> => {
      try {
        const res = await fetchPlaybackDetailsSafe(item.id, null, channels);
        if (res.ok && res.extracted?.video_token) {
          return {
            ...item,
            title: res.extracted.title || item.title,
            image_url: res.extracted.image_url || item.image_url,
            video_token: res.extracted.video_token,
            status: "success",
            errorMsg: undefined
          };
        } else {
          return {
            ...item,
            status: "error",
            errorMsg: res.error || "No video_token returned"
          };
        }
      } catch (err: any) {
        return {
          ...item,
          status: "error",
          errorMsg: err.message || "Token extraction failed"
        };
      }
    };

    const updatedItems = [...items];
    let completedCount = 0;

    for (let i = 0; i < targets.length; i += batchConcurrency) {
      const chunk = targets.slice(i, i + batchConcurrency);
      const results = await Promise.all(
        chunk.map((targetItem) => {
          setItems((prev) =>
            prev.map((it) => (it.id === targetItem.id ? { ...it, status: "fetching" } : it))
          );
          return fetchSingleToken(targetItem);
        })
      );

      results.forEach((resItem) => {
        const idx = updatedItems.findIndex((it) => it.id === resItem.id);
        if (idx >= 0) {
          updatedItems[idx] = resItem;
        }
      });

      completedCount += chunk.length;
      setBatchProgress({ current: completedCount, total: targets.length });
      setItems([...updatedItems]);
    }

    setIsBatchFetching(false);
  };

  const toggleSelectAll = (select: boolean) => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: select })));
  };

  const toggleItemSelect = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const m3uTextOutput = useMemo(() => {
    const selectedItems = items.filter((i) => i.selected);
    let output = `#EXTM3U x-tvg-url="" name="${playlistTitle}"\n\n`;

    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

    selectedItems.forEach((item) => {
      let streamUrl = "";
      if (streamUrlType === "server_redirect") {
        streamUrl = `${origin}/api/live/${item.id}.m3u8`;
      } else {
        streamUrl = item.video_token || `${origin}/api/live/${item.id}.m3u8`;
      }

      if (!streamUrl) return;

      let extinf = `#EXTINF:-1`;
      if (includeTvgId && item.id) extinf += ` tvg-id="${item.id}" tvg-name="${item.title}"`;
      if (includeTvgLogo && item.image_url) extinf += ` tvg-logo="${item.image_url}"`;
      if (includeGroupTitle && (item.genre || item.language)) {
        extinf += ` group-title="${item.genre || item.language?.toUpperCase()}"`;
      }
      extinf += `,${item.title}`;

      output += `${extinf}\n`;
      if (includeVlcUserAgent && userAgentStr) {
        output += `#EXTVLCOPT:http-user-agent=${userAgentStr}\n`;
      }
      if (includeVlcReferrer) {
        output += `#EXTVLCOPT:http-referrer=https://www.zee5.com/\n`;
      }
      output += `${streamUrl}\n\n`;
    });

    return output.trim();
  }, [
    items,
    streamUrlType,
    includeTvgLogo,
    includeTvgId,
    includeGroupTitle,
    includeVlcUserAgent,
    includeVlcReferrer,
    playlistTitle,
    userAgentStr
  ]);

  const handleCopyM3U = () => {
    navigator.clipboard.writeText(m3uTextOutput);
    setCopiedM3u(true);
    setTimeout(() => setCopiedM3u(false), 2500);
  };

  const handleDownloadM3U = () => {
    const blob = new Blob([m3uTextOutput], { type: "application/x-mpegurl;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${playlistTitle.toLowerCase().replace(/\s+/g, "_")}.m3u`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const serverApiUrl = `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/playlist.m3u`;

  const handleCopyServerUrl = () => {
    navigator.clipboard.writeText(serverApiUrl);
    setCopiedApiUrl(true);
    setTimeout(() => setCopiedApiUrl(false), 2500);
  };

  const validTokensCount = items.filter((i) => i.video_token).length;
  const selectedCount = items.filter((i) => i.selected).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400 shrink-0">
              <ListMusic className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">M3U IPTV Playlist Builder</h2>
                <span className="text-[11px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Live Stream Collector
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Extract, organize, and compile live channel entries into standard <code>#EXTM3U</code> playlists for IPTV players like VLC, TiviMate, OTT Navigator, or Kodi using live authenticated <code>video_token</code>s.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {currentExtracted && currentExtracted.video_token && (
              <button
                onClick={handleAddCurrentExtracted}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Extracted Stream</span>
              </button>
            )}

            <button
              onClick={() => handleBatchFetchTokens(false)}
              disabled={isBatchFetching}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-md transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isBatchFetching ? "animate-spin" : ""}`} />
              <span>{isBatchFetching ? "Fetching Tokens..." : "Batch Fetch All Live Tokens"}</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
            <span className="text-slate-400">Total Items:</span>
            <span className="font-mono font-bold text-slate-200 text-sm">{items.length}</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
            <span className="text-slate-400">Valid Video Tokens:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">{validTokensCount}</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
            <span className="text-slate-400">Selected for Playlist:</span>
            <span className="font-mono font-bold text-sky-400 text-sm">{selectedCount}</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
            <span className="text-slate-400">Live API Server Feed:</span>
            <button
              onClick={handleCopyServerUrl}
              className="font-mono text-xs text-sky-400 hover:underline flex items-center gap-1"
            >
              {copiedApiUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>/api/playlist.m3u</span>
            </button>
          </div>
        </div>

        {/* Batch Extraction Progress Bar */}
        {isBatchFetching && (
          <div className="bg-slate-950 border border-sky-900/80 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-sky-300 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                Resolving live video tokens for channels...
              </span>
              <span className="text-slate-300 font-bold">
                {batchProgress.current} / {batchProgress.total} (
                {Math.round((batchProgress.current / (batchProgress.total || 1)) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${Math.round((batchProgress.current / (batchProgress.total || 1)) * 100)}%`
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Item List & M3U Code Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Items Table & Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search channels, title, or video_token..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500 shrink-0"
              >
                <option value="ALL">All Categories ({items.length})</option>
                {genres.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleSelectAll(true)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700/60 transition-colors flex items-center gap-1"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
                  <span>Select All</span>
                </button>
                <button
                  onClick={() => toggleSelectAll(false)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700/60 transition-colors flex items-center gap-1"
                >
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>Clear Selection</span>
                </button>
                <button
                  onClick={handleImportRegister}
                  className="px-2.5 py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/80 rounded transition-colors"
                >
                  Reset Register
                </button>
              </div>

              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1 px-3 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 rounded font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Stream Manually</span>
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddManualItem} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Add Custom Stream Entry
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Channel Title *</label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Zee Cinema HD"
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Channel ID / Slug</label>
                    <input
                      type="text"
                      value={newId}
                      onChange={(e) => setNewId(e.target.value)}
                      placeholder="e.g. 0-9-zeecinema"
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Image URL / Logo (`tvg-logo`)</label>
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://akamaividz.zee5.com/..."
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Video Token / Stream URL (`.m3u8`) *</label>
                  <textarea
                    rows={2}
                    required
                    value={newVideoToken}
                    onChange={(e) => setNewVideoToken(e.target.value)}
                    placeholder="https://z5ak-cmaflive.zee5.com/cmaf/live/.../index.m3u8?hdnts=..."
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 resize-y"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Category (`group-title`)</label>
                    <input
                      type="text"
                      value={newGenre}
                      onChange={(e) => setNewGenre(e.target.value)}
                      placeholder="Entertainment"
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-end justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-2 text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow transition-colors"
                    >
                      Save Stream Entry
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredItems.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800/80">
                  No channels match your query. Click "Add Stream Manually" or "Reset Register".
                </div>
              ) : (
                filteredItems.map((item) => {
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        item.selected
                          ? "bg-slate-950 border-slate-800 shadow-md"
                          : "bg-slate-950/40 border-slate-800/50 opacity-60"
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => toggleItemSelect(item.id)}
                          className="mt-1 sm:mt-0 accent-sky-500 w-4 h-4 rounded cursor-pointer shrink-0"
                        />

                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-10 h-10 rounded-lg object-cover bg-slate-900 shrink-0 border border-slate-800"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 shrink-0">
                            <Radio className="w-5 h-5" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-200 truncate">{item.title}</h4>
                            {item.genre && (
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded">
                                {item.genre}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                            <span className="text-slate-500">{item.id}</span>
                            {item.status === "fetching" && (
                              <span className="text-sky-400 flex items-center gap-1">
                                <RefreshCw className="w-3 h-3 animate-spin" /> Fetching Token...
                              </span>
                            )}
                            {item.status === "success" && (
                              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                                <CheckCircle2 className="w-3 h-3" /> Token Active
                              </span>
                            )}
                            {item.status === "error" && (
                              <span className="text-rose-400 flex items-center gap-1 font-semibold truncate">
                                <XCircle className="w-3 h-3" /> {item.errorMsg || "No token"}
                              </span>
                            )}
                          </div>

                          {item.video_token && (
                            <p className="text-[10px] font-mono text-emerald-400/80 truncate max-w-md">
                              {item.video_token}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          onClick={async () => {
                            setItems((prev) =>
                              prev.map((it) => (it.id === item.id ? { ...it, status: "fetching" } : it))
                            );
                            try {
                              const res = await fetchPlaybackDetailsSafe(item.id, null, channels);
                              if (res.ok && res.extracted?.video_token) {
                                setItems((prev) =>
                                  prev.map((it) =>
                                    it.id === item.id
                                      ? {
                                          ...it,
                                          title: res.extracted!.title || item.title,
                                          image_url: res.extracted!.image_url || item.image_url,
                                          video_token: res.extracted!.video_token,
                                          status: "success",
                                          errorMsg: undefined
                                        }
                                      : it
                                  )
                                );
                              } else {
                                setItems((prev) =>
                                  prev.map((it) =>
                                    it.id === item.id
                                      ? { ...it, status: "error", errorMsg: res.error || "No token returned" }
                                      : it
                                  )
                                );
                              }
                            } catch (err: any) {
                              setItems((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, status: "error", errorMsg: err.message } : it))
                              );
                            }
                          }}
                          title="Refresh single channel video token"
                          className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>

                        {onSelectChannelForPlayback && (
                          <button
                            onClick={() => onSelectChannelForPlayback(item.id)}
                            title="Play stream in Extractor view"
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {item.video_token && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(item.video_token);
                              setCopiedItemToken(item.id);
                              setTimeout(() => setCopiedItemToken(null), 2000);
                            }}
                            title="Copy single stream token URL"
                            className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded transition-colors"
                          >
                            {copiedItemToken === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => removeItem(item.id)}
                          title="Remove item from playlist"
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Playlist Config & M3U Output */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Sliders className="w-4 h-4 text-sky-400" />
                <span>M3U Formatting Options</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Stream Link Format in M3U</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setStreamUrlType("full_video_token")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-center transition-all ${
                      streamUrlType === "full_video_token"
                        ? "bg-emerald-600 text-white font-bold shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Full video_token
                  </button>
                  <button
                    type="button"
                    onClick={() => setStreamUrlType("server_redirect")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-center transition-all ${
                      streamUrlType === "server_redirect"
                        ? "bg-sky-600 text-white font-bold shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Server Stream Redirect
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {streamUrlType === "full_video_token"
                    ? "Embeds full signed ZEE5 .m3u8 video token URLs directly into the M3U playlist."
                    : "Embeds dynamic /api/live/:id.m3u8 links that redirect automatically when played."}
                </p>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Playlist Name (`#EXTM3U name="..."`)</label>
                <input
                  type="text"
                  value={playlistTitle}
                  onChange={(e) => setPlaylistTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeTvgLogo}
                    onChange={(e) => setIncludeTvgLogo(e.target.checked)}
                    className="accent-sky-500 w-3.5 h-3.5 rounded"
                  />
                  <span>`tvg-logo`</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeTvgId}
                    onChange={(e) => setIncludeTvgId(e.target.checked)}
                    className="accent-sky-500 w-3.5 h-3.5 rounded"
                  />
                  <span>`tvg-id`</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeGroupTitle}
                    onChange={(e) => setIncludeGroupTitle(e.target.checked)}
                    className="accent-sky-500 w-3.5 h-3.5 rounded"
                  />
                  <span>`group-title`</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeVlcUserAgent}
                    onChange={(e) => setIncludeVlcUserAgent(e.target.checked)}
                    className="accent-sky-500 w-3.5 h-3.5 rounded"
                  />
                  <span>VLC User-Agent</span>
                </label>
              </div>
            </div>
          </div>

          {/* M3U Output Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-200">Generated `#EXTM3U` Output</h3>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopyM3U}
                  className="flex items-center gap-1 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded shadow transition-colors"
                >
                  {copiedM3u ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedM3u ? "Copied!" : "Copy M3U"}</span>
                </button>

                <button
                  onClick={handleDownloadM3U}
                  className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded shadow transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .m3u</span>
                </button>
              </div>
            </div>

            <textarea
              readOnly
              rows={14}
              value={m3uTextOutput}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] leading-relaxed text-emerald-400/90 focus:outline-none select-all resize-none"
            />

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Direct IPTV Server Feed (TiviMate & OTT Navigator Ready):
                </span>
                <button
                  onClick={handleCopyServerUrl}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-mono flex items-center gap-1"
                >
                  {copiedApiUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedApiUrl ? "Copied Feed URL!" : "Copy Feed URL"}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-300 font-mono break-all select-all bg-slate-900 border border-slate-800/80 p-2.5 rounded-lg">
                {serverApiUrl}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400">
                  <span className="font-semibold text-slate-200">OTT Navigator / TiviMate:</span> Connects directly without login.
                </div>
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400">
                  <span className="font-semibold text-slate-200">Web Browser Access:</span> Protected by Admin Gatekeeper page.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
