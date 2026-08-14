export interface Channel {
  id: string;
  title: string;
  name?: string;
  slug?: string;
  chno?: string;
  url?: string;
  language: string;
  country: string;
  genre?: string;
  logo?: string;
}

export interface ChannelRegister {
  data: Channel[];
}

export interface ExtractedPlaybackData {
  id: string | null;
  title: string;
  image_url: string | null;
  video_token: string | null;
  raw_video_token?: string | null;
  asset_key?: string | null;
  auth_token?: string | null;
  user_ip_used?: string;
}

export interface PlaybackFullResponse {
  status?: string;
  extracted?: ExtractedPlaybackData;
  rawResponse?: any;
  requestMeta?: {
    requestUrl: string;
    durationMs: number;
    targetChannelId: string;
    language: string;
    country: string;
  };
  error?: string;
}

export interface PlaylistItem {
  id: string;
  title: string;
  image_url: string;
  video_token: string;
  language?: string;
  genre?: string;
  selected?: boolean;
  status?: "idle" | "fetching" | "success" | "error";
  errorMsg?: string;
}

export interface SessionTokens {
  sessionDeviceId: string;
  xAccessToken: string;
  xDdToken: string;
  userIpAddress?: string;
  autoRotateIp?: boolean;
  hideRawVideoToken?: boolean;
  lastTokenSyncTime?: string;
  tokenSyncSource?: string;
}

export interface ChannelPingResult {
  id: string;
  active: boolean;
  status?: number;
  statusText?: string;
  latencyMs?: number;
  streamUrl?: string;
  error?: string;
  checkedAt: string;
}
