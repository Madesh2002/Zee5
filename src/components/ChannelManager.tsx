import React, { useState } from "react";
import { Channel, ChannelPingResult } from "../types";
import {
  FileCode,
  Plus,
  Save,
  Upload,
  RotateCcw,
  Search,
  Tv,
  Check,
  AlertCircle,
  Code2,
  List,
  Sparkles,
  Trash2,
  RefreshCw,
  Globe,
  Activity,
  CheckCircle2,
  XCircle,
  Info,
  X
} from "lucide-react";
import { safeFetchJson, pingChannelStreamSafe } from "../utils/apiClient";

interface ChannelManagerProps {
  channels: Channel[];
  onSelectChannel: (channelId: string) => void;
  selectedChannelId?: string;
  onUpdateChannels: (newChannels: Channel[]) => Promise<void>;
  onSyncChannels?: (apiUrl?: string) => Promise<{ success: boolean; count?: number; error?: string }>;
  loading?: boolean;
}

export const ChannelManager: React.FC<ChannelManagerProps> = ({
  channels,
  onSelectChannel,
  selectedChannelId,
  onUpdateChannels,
  onSyncChannels,
  loading
}) => {
  const [activeTab, setActiveTab] = useState<"grid" | "json">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [filterPingStatus, setFilterPingStatus] = useState<"all" | "active" | "offline" | "unchecked">("all");
  const [jsonText, setJsonText] = useState<string>(() => JSON.stringify({ data: channels }, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Ping verification state
  const [pingResults, setPingResults] = useState<Record<string, ChannelPingResult>>({});
  const [pingingMap, setPingingMap] = useState<Record<string, boolean>>({});
  const [isBatchPinging, setIsBatchPinging] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; active: number; inactive: number } | null>(null);
  const [diagnosticModalChannel, setDiagnosticModalChannel] = useState<{ channel: Channel; ping?: ChannelPingResult } | null>(null);

  // Remote channel sync state
  const [remoteApiUrl, setRemoteApiUrl] = useState("https://api.npoint.io/89cb8fd1d5c1cb6cf289");
  const [isSyncingRemote, setIsSyncingRemote] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New channel inline form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChannel, setNewChannel] = useState<Partial<Channel>>({
    id: "",
    title: "",
    language: "mr",
    country: "IN",
    genre: "Entertainment"
  });

  React.useEffect(() => {
    setJsonText(JSON.stringify({ data: channels }, null, 2));
  }, [channels]);

  const handleJsonChange = (val: string) => {
    setJsonText(val);
    try {
      const parsed = JSON.parse(val);
      if (!parsed || !Array.isArray(parsed.data)) {
        setJsonError("JSON must contain a root object with a 'data' array.");
      } else {
        setJsonError(null);
      }
    } catch (err: any) {
      setJsonError("Invalid JSON syntax: " + err.message);
    }
  };

  const handleSaveJson = async () => {
    try {
      setIsSaving(true);
      const parsed = JSON.parse(jsonText);
      if (!parsed || !Array.isArray(parsed.data)) {
        throw new Error("JSON structure must be { \"data\": [ ... ] }");
      }
      await onUpdateChannels(parsed.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      setJsonError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        setJsonText(text);
        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.data)) {
          await onUpdateChannels(parsed.data);
          setActiveTab("grid");
        } else {
          setJsonError("Uploaded file does not match expected structure: { \"data\": [ ... ] }");
          setActiveTab("json");
        }
      } catch (err: any) {
        setJsonError("Failed to parse uploaded JSON file: " + err.message);
        setActiveTab("json");
      }
    };
    reader.readAsText(file);
  };

  const handleAddChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannel.id || !newChannel.title) return;

    const updatedList = [
      ...channels,
      {
        id: newChannel.id.trim(),
        title: newChannel.title.trim(),
        language: newChannel.language || "mr",
        country: newChannel.country || "IN",
        genre: newChannel.genre || "Entertainment",
        logo: newChannel.logo?.trim() || undefined
      }
    ];

    await onUpdateChannels(updatedList);
    setNewChannel({ id: "", title: "", language: "mr", country: "IN", genre: "Entertainment" });
    setShowAddForm(false);
  };

  const handleDeleteChannel = async (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Remove channel '${idToDelete}' from register?`)) return;
    const updatedList = channels.filter((c) => c.id !== idToDelete);
    await onUpdateChannels(updatedList);
  };

  const handleRemoteSync = async () => {
    if (!onSyncChannels) return;
    setIsSyncingRemote(true);
    setSyncMessage(null);
    try {
      const res = await onSyncChannels(remoteApiUrl.trim());
      if (res.success) {
        setSyncMessage({
          type: "success",
          text: `Successfully synced ${res.count ?? channels.length} channels from Remote API!`
        });
      } else {
        setSyncMessage({
          type: "error",
          text: res.error || "Failed to sync channels from remote API."
        });
      }
    } catch (err: any) {
      setSyncMessage({ type: "error", text: err.message });
    } finally {
      setIsSyncingRemote(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  // Ping a single channel stream
  const handlePingSingle = async (channel: Channel, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const chId = channel.id;
    setPingingMap((prev) => ({ ...prev, [chId]: true }));

    try {
      const pingResult = await pingChannelStreamSafe(channel, null, channels);
      setPingResults((prev) => ({ ...prev, [chId]: pingResult }));
    } catch (err: any) {
      setPingResults((prev) => ({
        ...prev,
        [chId]: {
          id: chId,
          active: false,
          status: 0,
          statusText: "Request Failed",
          latencyMs: 0,
          error: err.message,
          checkedAt: new Date().toISOString()
        }
      }));
    } finally {
      setPingingMap((prev) => ({ ...prev, [chId]: false }));
    }
  };

  // Ping all visible or filtered channels in batch
  const handlePingAll = async (targetList: Channel[]) => {
    if (targetList.length === 0 || isBatchPinging) return;
    setIsBatchPinging(true);
    setBatchProgress({
      current: 0,
      total: targetList.length,
      active: 0,
      inactive: 0
    });

    const chunkSize = 5;
    let completedCount = 0;
    let activeTotal = 0;
    let inactiveTotal = 0;

    for (let i = 0; i < targetList.length; i += chunkSize) {
      const chunk = targetList.slice(i, i + chunkSize);

      setPingingMap((prev) => {
        const next = { ...prev };
        chunk.forEach((c) => {
          next[c.id] = true;
        });
        return next;
      });

      const promises = chunk.map(async (c) => {
        try {
          const res = await pingChannelStreamSafe(c, null, channels);
          return { id: c.id, result: res };
        } catch (err: any) {
          return {
            id: c.id,
            result: {
              id: c.id,
              active: false,
              status: 0,
              statusText: "Failed",
              latencyMs: 0,
              error: err.message,
              checkedAt: new Date().toISOString()
            } as ChannelPingResult
          };
        }
      });

      const chunkResults = await Promise.allSettled(promises);


      setPingResults((prev) => {
        const next = { ...prev };
        chunkResults.forEach((cr) => {
          if (cr.status === "fulfilled" && cr.value) {
            next[cr.value.id] = cr.value.result;
            if (cr.value.result.active) {
              activeTotal++;
            } else {
              inactiveTotal++;
            }
          }
        });
        return next;
      });

      setPingingMap((prev) => {
        const next = { ...prev };
        chunk.forEach((c) => {
          delete next[c.id];
        });
        return next;
      });

      completedCount += chunk.length;
      setBatchProgress({
        current: Math.min(completedCount, targetList.length),
        total: targetList.length,
        active: activeTotal,
        inactive: inactiveTotal
      });
    }

    setIsBatchPinging(false);
  };

  const filteredChannels = channels.filter((channel) => {
    const matchesSearch =
      channel.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      channel.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (channel.genre && channel.genre.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesLang = selectedLanguage === "all" || channel.language === selectedLanguage;

    const ping = pingResults[channel.id];
    let matchesPing = true;
    if (filterPingStatus === "active") {
      matchesPing = ping?.active === true;
    } else if (filterPingStatus === "offline") {
      matchesPing = ping?.active === false;
    } else if (filterPingStatus === "unchecked") {
      matchesPing = ping === undefined;
    }

    return matchesSearch && matchesLang && matchesPing;
  });

  const languages = Array.from(new Set(channels.map((c) => c.language)));
  const totalChannelsCount = channels.length;
  const pingResultsList = Object.values(pingResults);
  const activePingCount = channels.filter((c) => pingResults[c.id]?.active === true).length;
  const offlinePingCount = channels.filter((c) => pingResults[c.id]?.active === false).length;
  const uncheckedPingCount = totalChannelsCount - activePingCount - offlinePingCount;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
      {/* Remote API Sync Banner */}
      <div className="bg-slate-950 border border-sky-900/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-200">Remote Channel API Sync</h4>
            <p className="text-slate-400 text-[11px]">
              Fetch channel list in <code className="text-sky-300 font-mono">{`{ "data": [ ... ] }`}</code> format directly from remote API
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={remoteApiUrl}
            onChange={(e) => setRemoteApiUrl(e.target.value)}
            placeholder="https://api.npoint.io/89cb8fd1d5c1cb6cf289"
            className="flex-1 sm:w-72 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500"
          />
          <button
            type="button"
            onClick={() => setRemoteApiUrl("https://api.npoint.io/89cb8fd1d5c1cb6cf289")}
            className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-700 rounded-lg shrink-0 transition-colors"
          >
            Default npoint
          </button>
          <button
            onClick={handleRemoteSync}
            disabled={isSyncingRemote || !remoteApiUrl.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded-lg shadow transition-all shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingRemote ? "animate-spin" : ""}`} />
            <span>{isSyncingRemote ? "Syncing..." : "Sync API"}</span>
          </button>
        </div>
      </div>

      {syncMessage && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
            syncMessage.type === "success"
              ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
              : "bg-rose-950/60 border-rose-800 text-rose-300"
          }`}
        >
          {syncMessage.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{syncMessage.text}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-sky-400" />
            <h3 className="text-lg font-bold text-slate-100">Channel Register</h3>
            <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-full border border-slate-700">
              {channels.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Lookup register for mapping channel IDs, live stream verification, and playback parameters.
          </p>
        </div>

        {/* Tab & Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handlePingAll(filteredChannels)}
            disabled={isBatchPinging || channels.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-all border border-emerald-500/30"
            title="Ping all filtered channels to verify active stream status"
          >
            <Activity className={`w-3.5 h-3.5 ${isBatchPinging ? "animate-spin text-emerald-200" : "text-emerald-300"}`} />
            <span>{isBatchPinging ? `Pinging (${batchProgress?.current || 0}/${batchProgress?.total || 0})...` : "Ping All Streams"}</span>
          </button>

          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === "grid" ? "bg-sky-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Grid View</span>
            </button>
            <button
              onClick={() => setActiveTab("json")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === "json" ? "bg-sky-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Edit Raw JSON</span>
            </button>
          </div>

          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700/60 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>Upload JSON</span>
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Channel</span>
          </button>
        </div>
      </div>

      {/* Batch Ping Progress Bar */}
      {isBatchPinging && batchProgress && (
        <div className="bg-slate-950 border border-emerald-800/40 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <Activity className="w-4 h-4 animate-pulse" />
              Pinging Stream Links ({batchProgress.current} of {batchProgress.total} checked)...
            </span>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-emerald-400 font-bold">{batchProgress.active} Active</span>
              <span className="text-rose-400 font-bold">{batchProgress.inactive} Offline</span>
            </div>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300"
              style={{ width: `${(batchProgress.current / Math.max(batchProgress.total, 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Ping Status Filter Bar */}
      {activeTab === "grid" && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              Stream Health Status:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFilterPingStatus("all")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  filterPingStatus === "all"
                    ? "bg-slate-800 text-white font-semibold border border-slate-700"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All ({totalChannelsCount})
              </button>
              <button
                onClick={() => setFilterPingStatus("active")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  filterPingStatus === "active"
                    ? "bg-emerald-950 border border-emerald-700 text-emerald-300 font-semibold"
                    : "text-emerald-400/80 hover:text-emerald-300"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                Active ({activePingCount})
              </button>
              <button
                onClick={() => setFilterPingStatus("offline")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  filterPingStatus === "offline"
                    ? "bg-rose-950 border border-rose-700 text-rose-300 font-semibold"
                    : "text-rose-400/80 hover:text-rose-300"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                Offline ({offlinePingCount})
              </button>
              <button
                onClick={() => setFilterPingStatus("unchecked")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  filterPingStatus === "unchecked"
                    ? "bg-slate-800 border border-slate-700 text-slate-300 font-semibold"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />
                Unchecked ({uncheckedPingCount})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPingResults({})}
              disabled={pingResultsList.length === 0}
              className="text-[11px] text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Statuses
            </button>
          </div>
        </div>
      )}

      {/* Add Channel Modal / Collapsible Form */}
      {showAddForm && (
        <form onSubmit={handleAddChannelSubmit} className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Add New Channel Entry
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Channel ID (e.g. 0-9-zeemarathi)</label>
              <input
                type="text"
                required
                placeholder="0-9-channelname"
                value={newChannel.id}
                onChange={(e) => setNewChannel({ ...newChannel, id: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Channel Title</label>
              <input
                type="text"
                required
                placeholder="Zee TV HD"
                value={newChannel.title}
                onChange={(e) => setNewChannel({ ...newChannel, title: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Language Code</label>
              <select
                value={newChannel.language}
                onChange={(e) => setNewChannel({ ...newChannel, language: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="mr">Marathi (mr)</option>
                <option value="hi">Hindi (hi)</option>
                <option value="en">English (en)</option>
                <option value="bn">Bengali (bn)</option>
                <option value="kn">Kannada (kn)</option>
                <option value="ta">Tamil (ta)</option>
                <option value="ml">Malayalam (ml)</option>
                <option value="te">Telugu (te)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Country Code</label>
              <input
                type="text"
                value={newChannel.country}
                onChange={(e) => setNewChannel({ ...newChannel, country: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Genre / Category</label>
              <input
                type="text"
                placeholder="Entertainment / News / Movies"
                value={newChannel.genre}
                onChange={(e) => setNewChannel({ ...newChannel, genre: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Logo URL (Optional)</label>
              <input
                type="url"
                placeholder="https://..."
                value={newChannel.logo || ""}
                onChange={(e) => setNewChannel({ ...newChannel, logo: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-sky-500 text-xs"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 text-slate-400 hover:text-slate-200 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium text-xs"
            >
              Save Channel
            </button>
          </div>
        </form>
      )}

      {/* Grid Tab Content */}
      {activeTab === "grid" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search channel name, ID, or genre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 shrink-0">
              <button
                onClick={() => setSelectedLanguage("all")}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  selectedLanguage === "all"
                    ? "bg-sky-600 text-white border-sky-500 font-semibold"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
              >
                All ({channels.length})
              </button>
              {languages.map((lang, idx) => (
                <button
                  key={`${lang}-${idx}`}
                  onClick={() => setSelectedLanguage(lang)}
                  className={`px-2.5 py-1 text-xs rounded-full border uppercase font-mono transition-colors ${
                    selectedLanguage === lang
                      ? "bg-sky-600 text-white border-sky-500 font-semibold"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredChannels.map((channel, idx) => {
              const isSelected = selectedChannelId === channel.id;
              const channelTitle = channel.title || channel.name || channel.id;
              const ping = pingResults[channel.id];
              const isPinging = Boolean(pingingMap[channel.id]);

              return (
                <div
                  key={`${channel.id}-${idx}`}
                  onClick={() => onSelectChannel(channel.id)}
                  className={`group relative flex flex-col justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-sky-950/40 border-sky-500 shadow-lg shadow-sky-950/50 ring-1 ring-sky-500"
                      : "bg-slate-950/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-950"
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {channel.logo ? (
                          <img
                            src={channel.logo}
                            alt={channelTitle}
                            className="w-8 h-8 rounded object-cover bg-slate-900 shrink-0 border border-slate-800"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-slate-800 text-sky-400 flex items-center justify-center shrink-0 border border-slate-700">
                            <Tv className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-100 group-hover:text-sky-300 transition-colors line-clamp-1">
                            {channelTitle}
                          </h4>
                          <span className="text-[11px] font-mono text-slate-400 block line-clamp-1">{channel.id}</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteChannel(channel.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                        title="Delete Channel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                        {channel.language}
                      </span>
                      <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                        {channel.country}
                      </span>
                      {channel.genre && (
                        <span className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">
                          {channel.genre}
                        </span>
                      )}
                    </div>

                    <div className="pt-1">
                      {isPinging ? (
                        <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-800/80 text-amber-300 text-[11px]">
                          <span className="flex items-center gap-1.5 font-medium">
                            <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                            Pinging stream...
                          </span>
                          <span className="text-[10px] font-mono text-amber-400/80">Checking</span>
                        </div>
                      ) : ping ? (
                        <div
                          className={`flex items-center justify-between px-2.5 py-1 rounded-lg border text-[11px] transition-colors ${
                            ping.active
                              ? "bg-emerald-950/70 border-emerald-800/80 text-emerald-300 hover:bg-emerald-950"
                              : "bg-rose-950/70 border-rose-800/80 text-rose-300 hover:bg-rose-950"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate pr-1">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                ping.active ? "bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-pulse" : "bg-rose-400 shadow-sm shadow-rose-400/80"
                              }`}
                            />
                            <span className="font-semibold truncate">
                              {ping.active ? "Active" : "Offline"}
                            </span>
                            <span className="text-[10px] font-mono opacity-80 shrink-0">
                              {ping.latencyMs ? `(${ping.latencyMs}ms)` : ""}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDiagnosticModalChannel({ channel, ping });
                              }}
                              className="p-0.5 text-slate-400 hover:text-slate-200 transition-colors"
                              title="View Diagnostic Details"
                            >
                              <Info className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handlePingSingle(channel, e)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                                ping.active
                                  ? "bg-emerald-900/80 border-emerald-700/80 hover:bg-emerald-800 text-emerald-200"
                                  : "bg-rose-900/80 border-rose-700/80 hover:bg-rose-800 text-rose-200"
                              }`}
                              title="Re-test Stream Link"
                            >
                              Re-ping
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handlePingSingle(channel, e)}
                          className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-sky-300 text-[11px] font-medium transition-all group-hover:border-slate-700 shadow-inner"
                        >
                          <Activity className="w-3 h-3 text-slate-500 group-hover:text-sky-400 transition-colors" />
                          <span>Ping Stream</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                    <span className={`font-mono text-[11px] ${isSelected ? "text-sky-400 font-semibold" : "text-slate-500"}`}>
                      {isSelected ? "Active Selected" : "Click to Extract"}
                    </span>
                    <span className="text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold">
                      Extract →
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredChannels.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 space-y-2">
                <Tv className="w-8 h-8 mx-auto text-slate-600" />
                <p>No channels match your search or filter criteria.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Raw JSON Editor Tab */}
      {activeTab === "json" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-sky-400" />
              Direct Channel JSON Code Editor
            </span>
            <span>Valid Structure: <code>{"{ \"data\": [ { \"id\": \"...\", \"title\": \"...\" } ] }"}</code></span>
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => handleJsonChange(e.target.value)}
            className="w-full h-80 bg-slate-950 text-emerald-400 font-mono text-xs p-4 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500 resize-y leading-relaxed"
            placeholder="Paste channel JSON contents here..."
          />

          {jsonError && (
            <div className="flex items-center gap-2 p-3 bg-rose-950/60 border border-rose-800/80 rounded-lg text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{jsonError}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => {
                setJsonText(JSON.stringify({ data: channels }, null, 2));
                setJsonError(null);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Editor
            </button>

            <button
              onClick={handleSaveJson}
              disabled={!!jsonError || isSaving}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg font-medium text-xs transition-colors shadow-md"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Saved Channel List!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? "Saving..." : "Save Channel List to Server"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Diagnostic Details Modal */}
      {diagnosticModalChannel && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-lg w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div
                  className={`p-1.5 rounded-lg border ${
                    diagnosticModalChannel.ping?.active
                      ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                      : "bg-rose-950 text-rose-400 border-rose-800"
                  }`}
                >
                  {diagnosticModalChannel.ping?.active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">
                    {diagnosticModalChannel.channel.title || diagnosticModalChannel.channel.id}
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">{diagnosticModalChannel.channel.id}</span>
                </div>
              </div>

              <button
                onClick={() => setDiagnosticModalChannel(null)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Connection Status</span>
                  <span
                    className={`font-bold font-mono text-xs flex items-center gap-1.5 mt-0.5 ${
                      diagnosticModalChannel.ping?.active ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        diagnosticModalChannel.ping?.active ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                      }`}
                    />
                    {diagnosticModalChannel.ping?.active ? "Active Stream" : "Offline / Unreachable"}
                  </span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">HTTP Status Code</span>
                  <span className="font-bold font-mono text-slate-200 text-xs block mt-0.5">
                    {diagnosticModalChannel.ping?.status
                      ? `${diagnosticModalChannel.ping.status} ${diagnosticModalChannel.ping.statusText || ""}`
                      : "No HTTP Response"}
                  </span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Round-Trip Latency</span>
                  <span className="font-bold font-mono text-sky-400 text-xs block mt-0.5">
                    {diagnosticModalChannel.ping?.latencyMs ? `${diagnosticModalChannel.ping.latencyMs} ms` : "N/A"}
                  </span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Last Checked</span>
                  <span className="font-mono text-slate-300 text-[11px] block mt-0.5 truncate">
                    {diagnosticModalChannel.ping?.checkedAt
                      ? new Date(diagnosticModalChannel.ping.checkedAt).toLocaleTimeString()
                      : "Just now"}
                  </span>
                </div>
              </div>

              {diagnosticModalChannel.ping?.streamUrl && (
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Tested Stream URL</span>
                  <code className="text-[10px] text-emerald-400 font-mono break-all block bg-slate-900 p-1.5 rounded border border-slate-800 max-h-20 overflow-y-auto">
                    {diagnosticModalChannel.ping.streamUrl}
                  </code>
                </div>
              )}

              {diagnosticModalChannel.ping?.error && (
                <div className="bg-rose-950/60 p-2.5 rounded-lg border border-rose-800/80 space-y-1 text-rose-300">
                  <span className="text-[10px] font-semibold uppercase text-rose-400 block">Diagnostic Failure Message</span>
                  <p className="text-[11px]">{diagnosticModalChannel.ping.error}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  handlePingSingle(diagnosticModalChannel.channel);
                  setDiagnosticModalChannel(null);
                }}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium text-xs transition-colors flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5" />
                Re-test Stream Link
              </button>
              <button
                type="button"
                onClick={() => setDiagnosticModalChannel(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
