import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RefreshCw,
  Settings,
  ShieldCheck,
  AlertCircle,
  Radio,
  ExternalLink,
  Layers,
  Sparkles,
  KeyRound
} from "lucide-react";
import { fetchPlaybackDetailsSafe } from "../utils/apiClient";

interface LiveStreamPlayerProps {
  streamUrl: string;
  poster?: string;
  title?: string;
  channelId?: string;
  autoPlay?: boolean;
  onRefreshToken?: () => Promise<string | null>;
}

export const LiveStreamPlayer: React.FC<LiveStreamPlayerProps> = ({
  streamUrl: initialStreamUrl,
  poster,
  title = "Live Stream",
  channelId,
  autoPlay = false,
  onRefreshToken
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);

  const [currentStreamUrl, setCurrentStreamUrl] = useState<string>(initialStreamUrl);
  const [useProxy, setUseProxy] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshingToken, setIsRefreshingToken] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isTokenExpired, setIsTokenExpired] = useState<boolean>(false);
  const [qualityLevels, setQualityLevels] = useState<{ index: number; label: string; height: number; bitrate: number }[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = Auto
  const [audioTracks, setAudioTracks] = useState<{ id: number; name: string; lang: string }[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<number>(0);
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const [streamStats, setStreamStats] = useState<{
    resolution?: string;
    bandwidthKbps?: number;
    bufferLengthSec?: number;
    liveLatencySec?: number;
  }>({});

  // Sync initial prop changes
  useEffect(() => {
    if (initialStreamUrl && initialStreamUrl !== currentStreamUrl) {
      setCurrentStreamUrl(initialStreamUrl);
      setIsTokenExpired(false);
      setErrorMsg(null);
      retryCountRef.current = 0;
    }
  }, [initialStreamUrl]);

  // Compute effective stream URL avoiding duplicate proxy wrapping
  const getEffectiveUrl = (rawUrl: string, proxyEnabled: boolean) => {
    if (!rawUrl) return "";
    
    // If it is already a proxy or live endpoint
    if (rawUrl.includes("/api/stream-proxy") || rawUrl.includes("/api/live/")) {
      return rawUrl;
    }

    if (proxyEnabled) {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      return `${origin}/api/stream-proxy?url=${encodeURIComponent(rawUrl)}`;
    }

    return rawUrl;
  };

  const effectiveStreamUrl = getEffectiveUrl(currentStreamUrl, useProxy);

  // Token auto-refresh handler
  const handleAutoRefreshToken = async (): Promise<boolean> => {
    if (isRefreshingToken) return false;
    setIsRefreshingToken(true);
    setIsTokenExpired(true);
    setErrorMsg("Refreshing live authenticated token from ZEE5...");

    try {
      if (onRefreshToken) {
        const freshUrl = await onRefreshToken();
        if (freshUrl) {
          setCurrentStreamUrl(freshUrl);
          setIsTokenExpired(false);
          setErrorMsg(null);
          setIsRefreshingToken(false);
          retryCountRef.current = 0;
          return true;
        }
      }

      if (channelId) {
        const res = await fetchPlaybackDetailsSafe(channelId);
        if (res.ok && res.extracted?.video_token) {
          setCurrentStreamUrl(res.extracted.video_token);
          setIsTokenExpired(false);
          setErrorMsg(null);
          setIsRefreshingToken(false);
          retryCountRef.current = 0;
          return true;
        }
      }
    } catch (err) {
      console.warn("Token refresh attempt notice:", err);
    }

    setIsRefreshingToken(false);
    setErrorMsg("Stream token expired (HTTP 403). Click 'Refresh Live Token' below to generate a new live session.");
    return false;
  };

  // Initialize and attach HLS stream
  const initPlayer = () => {
    const video = videoRef.current;
    if (!video || !effectiveStreamUrl) return;

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    setIsLoading(true);
    setErrorMsg(null);

    // Destroy existing Hls instance if any
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 8,
        manifestLoadingTimeOut: 15000,
        manifestLoadingMaxRetry: 3,
        levelLoadingTimeOut: 15000,
        levelLoadingMaxRetry: 3,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 4,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        }
      });

      hlsRef.current = hls;

      hls.loadSource(effectiveStreamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsLoading(false);
        setErrorMsg(null);
        setIsTokenExpired(false);
        retryCountRef.current = 0;

        // Parse quality levels
        if (data.levels && data.levels.length > 0) {
          const levels = data.levels.map((lvl, idx) => ({
            index: idx,
            label: lvl.height ? `${lvl.height}p` : `Level ${idx + 1}`,
            height: lvl.height || 0,
            bitrate: lvl.bitrate || 0,
          }));
          setQualityLevels(levels);
        }

        // Parse audio tracks
        if (hls.audioTracks && hls.audioTracks.length > 0) {
          const tracks = hls.audioTracks.map((t) => ({
            id: t.id,
            name: t.name || t.lang || `Track ${t.id}`,
            lang: t.lang || "und",
          }));
          setAudioTracks(tracks);
          setCurrentAudioTrack(hls.audioTrack);
        }

        if (autoPlay) {
          video.play().catch(() => {
            // Autoplay restrictions require muted start
            video.muted = true;
            setIsMuted(true);
            video.play().catch(() => {});
          });
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const lvl = hls.levels[data.level];
        if (lvl) {
          setStreamStats((prev) => ({
            ...prev,
            resolution: lvl.height ? `${lvl.width || "HD"}x${lvl.height}p` : undefined,
            bandwidthKbps: Math.round(lvl.bitrate / 1000),
          }));
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;

        console.warn("HLS Fatal Error encountered:", data.type, data.details, data.response);

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          const statusCode = data.response?.code || 0;
          
          // Check for token expiration (HTTP 403 Forbidden / 401 Unauthorized)
          if (statusCode === 403 || statusCode === 401 || data.details === "manifestLoadError") {
            if (channelId || onRefreshToken) {
              handleAutoRefreshToken();
              return;
            }
            setIsTokenExpired(true);
            setErrorMsg("Stream token expired or upstream session blocked (HTTP 403).");
            return;
          }

          // Handle transient network drops with backoff
          if (retryCountRef.current < 3) {
            retryCountRef.current += 1;
            const delay = retryCountRef.current * 1200;
            setErrorMsg(`Reconnecting live stream (attempt ${retryCountRef.current}/3)...`);
            
            retryTimeoutRef.current = setTimeout(() => {
              if (hlsRef.current) {
                hlsRef.current.startLoad();
              }
            }, delay);
          } else {
            setErrorMsg("Live stream network connection timed out. Click Reconnect below.");
          }
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          setErrorMsg(`Playback error: ${data.details}. Click Reload to retry.`);
          hls.destroy();
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native Apple Safari HLS
      video.src = effectiveStreamUrl;
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        setErrorMsg(null);
        if (autoPlay) {
          video.play().catch(() => {});
        }
      });
      video.addEventListener("error", () => {
        if (!useProxy && currentStreamUrl.startsWith("http")) {
          setUseProxy(true);
        } else {
          setErrorMsg("Playback error on live stream. Try refreshing token or re-syncing.");
        }
        setIsLoading(false);
      });
    } else {
      setErrorMsg("Your browser does not support HLS video playback (MediaSource Extensions missing).");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initPlayer();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [effectiveStreamUrl]);

  // Video event handlers
  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch((err) => {
        console.warn("Play error:", err);
      });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleMuteToggle = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;
    video.volume = newVol;
    setVolume(newVol);
    if (newVol === 0) {
      video.muted = true;
      setIsMuted(true);
    } else if (video.muted) {
      video.muted = false;
      setIsMuted(false);
    }
  };

  const handleFullscreenToggle = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleQualityChange = (levelIdx: number) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = levelIdx;
    setCurrentLevel(levelIdx);
    setShowSettingsMenu(false);
  };

  const handleAudioTrackChange = (trackId: number) => {
    if (!hlsRef.current) return;
    hlsRef.current.audioTrack = trackId;
    setCurrentAudioTrack(trackId);
    setShowSettingsMenu(false);
  };

  const handleReload = () => {
    retryCountRef.current = 0;
    initPlayer();
  };

  return (
    <div className="space-y-3">
      {/* Player Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            LIVE STREAM
          </span>

          {streamStats.resolution && (
            <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800 font-mono text-[10px] font-bold">
              {streamStats.resolution}
            </span>
          )}

          {streamStats.bandwidthKbps && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 font-mono text-[10px]">
              {streamStats.bandwidthKbps} kbps
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Token Button */}
          {(channelId || onRefreshToken) && (
            <button
              onClick={handleAutoRefreshToken}
              disabled={isRefreshingToken}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-950/80 hover:bg-sky-900 border border-sky-700/70 text-sky-300 transition-colors disabled:opacity-50"
              title="Generate fresh live stream authentication token from ZEE5"
            >
              <KeyRound className={`w-3.5 h-3.5 ${isRefreshingToken ? "animate-spin text-sky-400" : "text-sky-300"}`} />
              <span>{isRefreshingToken ? "Refreshing..." : "Refresh Token"}</span>
            </button>
          )}

          {/* Global Proxy Toggle */}
          <button
            onClick={() => setUseProxy(!useProxy)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              useProxy
                ? "bg-emerald-950/80 border-emerald-600/80 text-emerald-300 shadow-sm"
                : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
            title={useProxy ? "Routing via Indian IP Bypass & CORS Proxy" : "Direct Upstream Stream"}
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${useProxy ? "text-emerald-400" : "text-slate-500"}`} />
            <span>{useProxy ? "🇮🇳 Global Proxy (Active)" : "Direct Mode"}</span>
          </button>

          {/* Direct Link button */}
          <a
            href={effectiveStreamUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sky-400 rounded-lg text-xs font-medium transition-colors"
            title="Open M3U8 in external tab / player"
          >
            <span>M3U8</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {/* Reload Stream Button */}
          <button
            onClick={handleReload}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg transition-colors"
            title="Reload / Re-sync Stream"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Video Viewport Container */}
      <div
        ref={containerRef}
        className="relative group aspect-video w-full max-w-4xl mx-auto bg-black rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center select-none"
      >
        <video
          ref={videoRef}
          poster={poster}
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => setIsLoading(false)}
          onClick={handlePlayPause}
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* Loading Spinner Overlay */}
        {isLoading && !errorMsg && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4 pointer-events-none z-10">
            <div className="w-10 h-10 border-3 border-sky-500/30 border-t-sky-400 rounded-full animate-spin mb-3"></div>
            <p className="text-xs font-semibold text-slate-200">Buffering Live Master Stream...</p>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{title}</p>
          </div>
        )}

        {/* Error Notification Overlay */}
        {errorMsg && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 z-20 space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="max-w-md">
              <h4 className="text-sm font-bold text-rose-300">
                {isTokenExpired ? "Live Stream Token Notice" : "Live Stream Status"}
              </h4>
              <p className="text-xs text-slate-300 mt-1 font-mono break-words">{errorMsg}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {(channelId || onRefreshToken) && (
                <button
                  onClick={handleAutoRefreshToken}
                  disabled={isRefreshingToken}
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  <KeyRound className={`w-3.5 h-3.5 ${isRefreshingToken ? "animate-spin" : ""}`} />
                  <span>{isRefreshingToken ? "Refreshing Token..." : "Refresh Live Token & Replay"}</span>
                </button>
              )}
              <button
                onClick={() => {
                  setUseProxy(true);
                  handleReload();
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Retry via Global Proxy</span>
              </button>
              <button
                onClick={handleReload}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                Reload Stream
              </button>
            </div>
          </div>
        )}

        {/* Big Center Play Button when paused */}
        {!isPlaying && !isLoading && !errorMsg && (
          <button
            onClick={handlePlayPause}
            className="absolute z-10 w-16 h-16 rounded-full bg-sky-600/90 hover:bg-sky-500 text-white flex items-center justify-center shadow-2xl transform transition hover:scale-110 active:scale-95"
            title="Play Stream"
          >
            <Play className="w-7 h-7 ml-1" />
          </button>
        )}

        {/* Bottom Control Bar */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 pt-8 flex items-center justify-between gap-3 text-white transition-opacity duration-300 opacity-0 group-hover:opacity-100 focus-within:opacity-100 z-10">
          {/* Left Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayPause}
              className="p-1.5 hover:text-sky-400 transition-colors"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2 group/vol">
              <button
                onClick={handleMuteToggle}
                className="p-1 hover:text-sky-400 transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 sm:w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>

            {/* Live Indicator */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="tracking-wide text-[11px]">LIVE</span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Settings & Quality Menu */}
            <div className="relative">
              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className={`p-1.5 rounded-lg hover:bg-slate-800/80 transition-colors ${
                  showSettingsMenu ? "text-sky-400 bg-slate-800" : "text-slate-300"
                }`}
                title="Playback Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              {showSettingsMenu && (
                <div className="absolute right-0 bottom-full mb-2 w-56 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-3 text-xs space-y-3 z-30">
                  <div className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-sky-400" />
                    <span>Resolution & Quality</span>
                  </div>

                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    <button
                      onClick={() => handleQualityChange(-1)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                        currentLevel === -1 ? "bg-sky-600 text-white font-bold" : "hover:bg-slate-800 text-slate-300"
                      }`}
                    >
                      <span>Auto Adaptive</span>
                      {currentLevel === -1 && <span className="text-[10px]">Active</span>}
                    </button>

                    {qualityLevels.map((lvl) => (
                      <button
                        key={lvl.index}
                        onClick={() => handleQualityChange(lvl.index)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                          currentLevel === lvl.index ? "bg-sky-600 text-white font-bold" : "hover:bg-slate-800 text-slate-300"
                        }`}
                      >
                        <span>{lvl.label}</span>
                        <span className="text-[10px] opacity-75 font-mono">
                          {Math.round(lvl.bitrate / 1000)} kbps
                        </span>
                      </button>
                    ))}
                  </div>

                  {audioTracks.length > 1 && (
                    <>
                      <div className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 pt-1 flex items-center gap-1.5">
                        <span>Audio Track</span>
                      </div>
                      <div className="space-y-1">
                        {audioTracks.map((trk) => (
                          <button
                            key={trk.id}
                            onClick={() => handleAudioTrackChange(trk.id)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                              currentAudioTrack === trk.id ? "bg-purple-600 text-white font-bold" : "hover:bg-slate-800 text-slate-300"
                            }`}
                          >
                            <span>{trk.name}</span>
                            <span className="text-[10px] font-mono uppercase">{trk.lang}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={handleFullscreenToggle}
              className="p-1.5 hover:text-sky-400 transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
