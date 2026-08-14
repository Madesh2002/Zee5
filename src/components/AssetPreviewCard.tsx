import React, { useState } from "react";
import { ExtractedPlaybackData } from "../types";
import { Play, Key, ShieldCheck, Tv, Copy, Check, ExternalLink, Image as ImageIcon, ListMusic, Maximize2, Radio, Volume2 } from "lucide-react";

interface AssetPreviewCardProps {
  data: ExtractedPlaybackData;
  loading?: boolean;
  onAddToPlaylist?: () => void;
}

export const AssetPreviewCard: React.FC<AssetPreviewCardProps> = ({ data, loading, onAddToPlaylist }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showMediaPlayer, setShowMediaPlayer] = useState<boolean>(true);

  const copyToClipboard = (text: string | null, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="bg-slate-900/90 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-4 sm:p-6 animate-pulse space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-20 sm:w-28 h-14 sm:h-20 bg-slate-800 rounded-xl shrink-0"></div>
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-slate-800 rounded w-1/2"></div>
            <div className="h-4 bg-slate-800/60 rounded w-1/3"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="h-16 bg-slate-800/40 rounded-xl"></div>
          <div className="h-16 bg-slate-800/40 rounded-xl"></div>
          <div className="h-16 bg-slate-800/40 rounded-xl"></div>
          <div className="h-16 bg-slate-800/40 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const isStreamUrlAvailable = Boolean(data.video_token && (data.video_token.includes(".m3u8") || data.video_token.startsWith("http")));

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-4 sm:p-6 shadow-2xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
          {data.image_url ? (
            <img
              src={data.image_url}
              alt={data.title}
              className="w-20 sm:w-28 h-14 sm:h-20 object-cover rounded-xl border border-slate-700/80 bg-slate-950 shrink-0 shadow-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://via.placeholder.com/270x152?text=Zee5+Channel";
              }}
            />
          ) : (
            <div className="w-20 sm:w-28 h-14 sm:h-20 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-slate-500 shrink-0 shadow-inner">
              <Tv className="w-7 h-7 sm:w-9 sm:h-9" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                Extracted Active Stream
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/80 font-bold">
                1080p FHD Master
              </span>
              {data.user_ip_used && (
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-mono px-2 py-0.5 rounded-full bg-sky-950/80 text-sky-300 border border-sky-800/80">
                  IP: {data.user_ip_used}
                </span>
              )}
              <span className="text-[10px] sm:text-xs text-slate-400 font-mono truncate">ID: {data.id}</span>
            </div>
            <h2 className="text-base sm:text-xl font-extrabold text-slate-100 tracking-tight mt-1 truncate">{data.title}</h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {onAddToPlaylist && (
            <button
              onClick={onAddToPlaylist}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-950 transition-all active:scale-95"
            >
              <ListMusic className="w-4 h-4" />
              <span>Add to M3U</span>
            </button>
          )}

          {data.image_url && (
            <a
              href={data.image_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Logo Asset</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
          )}
        </div>
      </div>

      {/* Media View Stream Box */}
      <div className="bg-slate-950 border border-slate-800/90 rounded-2xl p-4 space-y-3 shadow-inner">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Live Stream Media View
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {isStreamUrlAvailable && (
              <a
                href={data.video_token!}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-medium"
              >
                <span>Open Direct M3U8</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              onClick={() => setShowMediaPlayer(!showMediaPlayer)}
              className="text-slate-400 hover:text-slate-200 text-xs font-medium underline"
            >
              {showMediaPlayer ? "Collapse Player" : "Expand Player"}
            </button>
          </div>
        </div>

        {showMediaPlayer && (
          <div className="relative aspect-video w-full max-w-3xl mx-auto bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col items-center justify-center text-center p-4">
            {isStreamUrlAvailable ? (
              <video
                controls
                autoPlay={false}
                src={data.video_token!}
                poster={data.image_url || undefined}
                className="w-full h-full object-contain rounded-lg bg-black"
                onError={() => {}}
              >
                <source src={data.video_token!} type="application/x-mpegURL" />
                Your browser does not support inline HLS video playback.
              </video>
            ) : (
              <div className="space-y-3 max-w-md my-auto">
                <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto shadow-inner">
                  <Play className="w-6 h-6 ml-0.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">{data.title} Stream Ready</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Token extracted successfully. Video Token / Playback URL is primed for player consumption.
                  </p>
                </div>
                {data.video_token && (
                  <button
                    onClick={() => copyToClipboard(data.video_token, "video_token")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                  >
                    {copiedField === "video_token" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === "video_token" ? "Copied Stream URL!" : "Copy Stream URL"}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Extracted Key Tokens & Values Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Channel ID */}
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3.5 space-y-1 group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5 text-sky-400" />
              Channel ID (`id`)
            </span>
            <button
              onClick={() => copyToClipboard(data.id, "id")}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              title="Copy"
            >
              {copiedField === "id" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="font-mono text-sm font-bold text-slate-100 truncate">{data.id || "N/A"}</p>
        </div>

        {/* Video Token */}
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3.5 space-y-1 group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              Video Token Stream URL
            </span>
            <button
              onClick={() => copyToClipboard(data.video_token, "video_token")}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              title="Copy"
            >
              {copiedField === "video_token" ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <p className="font-mono text-xs text-slate-300 break-all line-clamp-2">
            {data.video_token || <span className="text-slate-600 italic">None provided</span>}
          </p>
          {data.raw_video_token && data.raw_video_token !== data.video_token && (
            <div className="pt-1 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500">
              <span>Host Domain Stream Redirect Enabled</span>
              <button
                onClick={() => copyToClipboard(data.raw_video_token || null, "raw_token")}
                className="hover:text-sky-400 font-mono"
              >
                {copiedField === "raw_token" ? "Copied Raw Token!" : "Copy Raw Token"}
              </button>
            </div>
          )}
        </div>

        {/* Asset Key */}
        {data.asset_key && (
          <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3.5 space-y-1 group hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                Asset / DAI Key (`asset_key`)
              </span>
              <button
                onClick={() => copyToClipboard(data.asset_key, "asset_key")}
                className="text-slate-500 hover:text-slate-300 transition-colors"
                title="Copy"
              >
                {copiedField === "asset_key" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="font-mono text-xs text-slate-300 break-all line-clamp-2">
              {data.asset_key}
            </p>
          </div>
        )}

        {/* Auth Token */}
        {data.auth_token && (
          <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3.5 space-y-1 group hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                Auth Token (`auth_token`)
              </span>
              <button
                onClick={() => copyToClipboard(data.auth_token, "auth_token")}
                className="text-slate-500 hover:text-slate-300 transition-colors"
                title="Copy"
              >
                {copiedField === "auth_token" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="font-mono text-xs text-slate-300 break-all line-clamp-2">
              {data.auth_token}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
