import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Enable CORS for API routes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-access-token, x-dd-token, X-Z5-Guest-Token");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Lazy loader middleware for serverless runtime (e.g. Vercel)
app.use(async (req, res, next) => {
  try {
    if (!lastTokenSyncTime) {
      await fetchTokensFromRemote(DEFAULT_NPOINT_API).catch(() => {});
    }
    if (cachedChannelData.data.length === 0) {
      await fetchChannelsFromRemote(DEFAULT_NPOINT_CHANNELS_API).catch(() => {});
    }
  } catch {}
  next();
});

// In-memory token & IP defaults (can be updated dynamically via UI)
let currentTokens = {
  sessionDeviceId: "27dd341d-035b-491f-be43-636a7ee2ee91",
  xAccessToken:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwbGF0Zm9ybV9jb2RlIjoiV2ViQCQhdDM4NzEyIiwiaXNzdWVkQXQiOiIyMDI2LTA4LTEzVDA2OjU3OjU0LjIwNFoiLCJwcm9kdWN0X2NvZGUiOiJ6ZWU1QDk3NSIsInR0bCI6ODY0MDAwMDAsImlhdCI6MTc4NjYwNDI3NH0.vAp05DYOp1hFKXZY-9Yem0YKnfy5RjqKdUGPnjTDhB0",
  xDdToken:
    "eyJzY2hlbWFfdmVyc2lvbiI6IjEiLCJvc19uYW1lIjoiV2luZG93cyIsIm9zX3ZlcnNpb24iOiIxMCIsInBsYXRmb3JtX25hbWUiOiJDaHJvbWUiLCJwbGF0Zm9ybV92ZXJzaW9uIjoiMTA0IiwiaGVyZV9jbGFzcyI6IldlYiIsImFwcF92ZXJzaW9uIjoiMi41Mi4zMSIsInBsYXllcl9jYXBhYmlsaXRpZXMiOnsiYXVkaW9fY2hhbm5lbCI6WyJTVEVSRU8iXSwidmlkZW9fY29kZWMiOlsiSDI2NCJdLCJjb250YWluZXIiOlsiTVA0IiwiVFMiXSwicGFja2FnZSI6WyJEQVNIIiwiSExTIl0sInJlc29sdXRpb24iOlsiMjQwcCIsIlNEIiwiSEQiLCJGSEQiXSwiZHluYW1pY19yYW5nZSI6WyJTRFIiXX0sInNlY3VyaXR5X2NhcGFiaWxpdGllcyI6eyJlbmNyeXB0aW9uIjpbIldJREVWSU5FX0FFU19DVFIiXSwid2lkZXZpbmVfc2VjdXJpdHlfbGV2ZWwiOlsiTDMiXSwiaGRjcF92ZXJzaW9uIjpbIkhEQ1BfVjEiLCJIRENQX1YyIiwiSERDUF9WMl8xIiwiSERDUF9WMl8yIl19fQ==",
  userIpAddress: "",
  autoRotateIp: true,
  hideRawVideoToken: false
};

// Helper to generate a random Indian/Public IPv4 address dynamically per request
function generateRandomPublicIp(): string {
  const indianPrefixes = [
    [103, 211],
    [49, 36],
    [152, 57],
    [106, 213],
    [157, 48],
    [223, 228],
    [115, 240],
    [182, 72],
    [103, 22],
    [203, 192]
  ];
  const randPrefix = indianPrefixes[Math.floor(Math.random() * indianPrefixes.length)];
  const octet3 = Math.floor(Math.random() * 254) + 1;
  const octet4 = Math.floor(Math.random() * 254) + 1;
  return `${randPrefix[0]}.${randPrefix[1]}.${octet3}.${octet4}`;
}

// Get dynamic IP address based on auto-rotation configuration
function getRotatedIp(overrideIp?: string): string {
  if (overrideIp && overrideIp.trim() !== "" && overrideIp.trim() !== "random") {
    return overrideIp.trim();
  }
  if (currentTokens.autoRotateIp || currentTokens.userIpAddress === "random" || !currentTokens.userIpAddress) {
    return generateRandomPublicIp();
  }
  return currentTokens.userIpAddress.trim();
}

const DEFAULT_NPOINT_API = "https://api.npoint.io/93c975444d3026f32395";
const DEFAULT_NPOINT_CHANNELS_API = "https://api.npoint.io/89cb8fd1d5c1cb6cf289";

let lastTokenSyncTime: string | null = null;
let tokenSyncSource: string = DEFAULT_NPOINT_API;

let lastChannelSyncTime: string | null = null;
let channelSyncSource: string = DEFAULT_NPOINT_CHANNELS_API;

// Helper to fetch tokens from dynamic npoint endpoint
async function fetchTokensFromRemote(url = DEFAULT_NPOINT_API) {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as any;
    const xDdToken = data.xDdToken || data.x_dd_token || data["x-dd-token"];
    const xAccessToken = data.xAccessToken || data.x_access_token || data["x-access-token"];
    const sessionDeviceId = data.sessionDeviceId || data.session_device_id || data.deviceId || data["device_id"];

    if (xDdToken) currentTokens.xDdToken = xDdToken.trim();
    if (xAccessToken) currentTokens.xAccessToken = xAccessToken.trim();
    if (sessionDeviceId) currentTokens.sessionDeviceId = sessionDeviceId.trim();

    lastTokenSyncTime = new Date().toISOString();
    tokenSyncSource = url;
    return { success: true, tokens: currentTokens, lastTokenSyncTime, tokenSyncSource };
  } catch (err: any) {
    return { success: false, error: err.message, tokens: currentTokens };
  }
}

// In-memory channel state
let cachedChannelData: { title?: string; developers?: string; data: any[] } = {
  title: "ZEE5 | CHANNELS API",
  developers: "Madesh",
  data: []
};

// Helper to fetch channels from dynamic npoint endpoint directly
async function fetchChannelsFromRemote(url = DEFAULT_NPOINT_CHANNELS_API) {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as any;
    let channelList: any[] = [];

    if (Array.isArray(json)) {
      channelList = json;
    } else if (json && Array.isArray(json.data)) {
      channelList = json.data;
    } else {
      throw new Error("Invalid response format. Expected JSON array or object containing 'data' array.");
    }

    cachedChannelData = {
      title: json.title || "ZEE5 | CHANNELS API",
      developers: json.developers || "Madesh",
      data: channelList.map((c: any) => ({
        ...c,
        title: c.title || c.name || c.id
      }))
    };

    lastChannelSyncTime = new Date().toISOString();
    channelSyncSource = url;
    return {
      success: true,
      channels: cachedChannelData.data,
      count: cachedChannelData.data.length,
      lastChannelSyncTime,
      channelSyncSource,
      title: cachedChannelData.title,
      developers: cachedChannelData.developers
    };
  } catch (err: any) {
    return { success: false, error: err.message, channels: cachedChannelData.data };
  }
}

function loadChannelData() {
  return cachedChannelData;
}

// 1. GET /api/channels & /channels
app.get(["/api/channels", "/channels"], async (req, res) => {
  if (cachedChannelData.data.length === 0) {
    await fetchChannelsFromRemote(DEFAULT_NPOINT_CHANNELS_API);
  }
  const channelData = loadChannelData();
  res.json({
    ...channelData,
    lastChannelSyncTime,
    channelSyncSource
  });
});

// 2. POST /api/channels & /channels
app.post(["/api/channels", "/channels"], (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !Array.isArray(payload.data)) {
      return res.status(400).json({
        error: "Invalid JSON format. Object must contain a 'data' array of channels."
      });
    }
    cachedChannelData = {
      title: payload.title || "ZEE5 | CHANNELS API",
      developers: payload.developers || "Madesh",
      data: payload.data
    };
    return res.json({
      success: true,
      message: `Successfully updated ${payload.data.length} channels in memory`,
      count: payload.data.length
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to update channels: " + err.message });
  }
});

// 2b. POST /api/channels/sync & /channels/sync
app.post(["/api/channels/sync", "/channels/sync"], async (req, res) => {
  const targetUrl = (req.body?.apiUrl || DEFAULT_NPOINT_CHANNELS_API).trim();
  const result = await fetchChannelsFromRemote(targetUrl);
  if (result.success) {
    return res.json(result);
  } else {
    return res.status(502).json(result);
  }
});

// In-memory admin credentials
let adminCredentials = {
  username: "admin",
  password: "admin123"
};

// Admin authentication endpoints
app.get(["/api/admin/info", "/admin/info"], (req, res) => {
  res.json({
    username: adminCredentials.username,
    defaultUsername: "admin",
    defaultPassword: "admin123",
    hint: "Use default username 'admin' and password 'admin123' to log in."
  });
});

app.post(["/api/admin/login", "/admin/login"], (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, error: "Username and password are required." });
  }

  if (username.trim() === adminCredentials.username && password === adminCredentials.password) {
    return res.json({
      success: true,
      message: "Admin authentication successful",
      username: adminCredentials.username,
      adminToken: "builder-admin-token-" + Date.now()
    });
  }

  return res.status(401).json({
    success: false,
    error: "Invalid username or password. Default credentials are admin / admin123."
  });
});

app.post(["/api/admin/change-credentials", "/admin/change-credentials"], (req, res) => {
  const { currentPassword, newUsername, newPassword } = req.body || {};
  if (currentPassword !== adminCredentials.password) {
    return res.status(401).json({ success: false, error: "Incorrect current password." });
  }
  if (!newUsername || !newPassword) {
    return res.status(400).json({ success: false, error: "New username and password must not be empty." });
  }

  adminCredentials.username = newUsername.trim();
  adminCredentials.password = newPassword.trim();

  return res.json({
    success: true,
    message: "Admin credentials updated successfully.",
    username: adminCredentials.username
  });
});

app.get(["/api/my-ip", "/my-ip"], (req, res) => {
  const ip = ((req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "").split(",")[0].trim();
  res.json({ ip: ip || "127.0.0.1" });
});

app.get(["/api/tokens", "/tokens"], (req, res) => {
  res.json({
    ...currentTokens,
    lastTokenSyncTime,
    tokenSyncSource
  });
});

app.post(["/api/tokens", "/tokens"], (req, res) => {
  const { sessionDeviceId, xAccessToken, xDdToken, userIpAddress, autoRotateIp, hideRawVideoToken } = req.body || {};
  if (sessionDeviceId !== undefined) currentTokens.sessionDeviceId = sessionDeviceId.trim();
  if (xAccessToken !== undefined) currentTokens.xAccessToken = xAccessToken.trim();
  if (xDdToken !== undefined) currentTokens.xDdToken = xDdToken.trim();
  if (userIpAddress !== undefined) currentTokens.userIpAddress = userIpAddress.trim();
  if (autoRotateIp !== undefined) currentTokens.autoRotateIp = Boolean(autoRotateIp);
  if (hideRawVideoToken !== undefined) currentTokens.hideRawVideoToken = Boolean(hideRawVideoToken);
  res.json({
    success: true,
    tokens: currentTokens,
    lastTokenSyncTime,
    tokenSyncSource
  });
});

app.post(["/api/tokens/sync", "/tokens/sync"], async (req, res) => {
  const targetUrl = (req.body?.apiUrl || DEFAULT_NPOINT_API).trim();
  const result = await fetchTokensFromRemote(targetUrl);
  if (result.success) {
    return res.json(result);
  } else {
    return res.status(502).json(result);
  }
});

// Playback details extraction
async function handlePlaybackExtraction(req: express.Request, res: express.Response) {
  const rawChannelId = (((req.query.id as string) || req.body?.id || "") as string).trim();

  if (!rawChannelId) {
    return res.status(400).json({
      error: "Missing 'id' parameter. Usage: /api/playback?id=CHANNEL_ID or POST JSON with { \"id\": \"CHANNEL_ID\" }"
    });
  }

  const cleanedChannelId = rawChannelId.replace(/-\d+$/, "");
  const jsonData = loadChannelData();
  const channelsList = Array.isArray(jsonData?.data) ? jsonData.data : [];

  const channelObj = channelsList.find((c: any) =>
    c.id === rawChannelId ||
    c.id === cleanedChannelId ||
    c.slug === rawChannelId ||
    c.slug === cleanedChannelId
  );

  const targetChannelId = channelObj ? channelObj.id : cleanedChannelId;
  const targetLanguage = channelObj?.language || "mr";
  const targetCountry = channelObj?.country || "IN";

  const sessionDeviceId = ((req.body?.deviceId || req.query.deviceId || currentTokens.sessionDeviceId) as string).trim();
  const xAccessToken = ((req.body?.xAccessToken || req.query.xAccessToken || currentTokens.xAccessToken) as string).trim();
  const xDdToken = ((req.body?.xDdToken || req.query.xDdToken || currentTokens.xDdToken) as string).trim();

  const rawProvidedIp = ((req.body?.userIpAddress || req.query.userIpAddress || "") as string).trim();
  const activeIp = getRotatedIp(rawProvidedIp || currentTokens.userIpAddress);

  const sessionPpid = sessionDeviceId;
  const sessionUid = `Z5X_${sessionDeviceId}`;

  const fetchSinglePlayback = async (chId: string) => {
    const queryParams = new URLSearchParams({
      channel_id: chId,
      device_id: sessionDeviceId,
      platform_name: "desktop_web",
      translation: "en",
      user_language: "en,hi,mr",
      country: targetCountry,
      state: "KA",
      app_version: "6.5.12",
      user_type: "guest",
      check_parental_control: "false",
      uid: sessionUid,
      ppid: sessionPpid,
      version: "15"
    });

    const requestUrl = `https://spapi.zee5.com/singlePlayback/getDetails/secure?${queryParams.toString()}`;
    const headers: Record<string, string> = {
      accept: "application/json",
      "accept-language": "en-US,en;q=0.9",
      "content-type": "application/json",
      origin: "https://www.zee5.com",
      referer: "https://www.zee5.com/",
      "sec-ch-ua": '"Not=A?Brand";v="99", "Google Chrome";v="151", "Chromium";v="151"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
      "x-access-token": xAccessToken,
      "X-Z5-Guest-Token": sessionDeviceId,
      "x-dd-token": xDdToken
    };

    if (activeIp) {
      headers["X-Forwarded-For"] = activeIp;
      headers["X-Real-IP"] = activeIp;
      headers["CF-Connecting-IP"] = activeIp;
    }

    const startTime = Date.now();
    const upstreamRes = await fetch(requestUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        "X-Z5-Guest-Token": sessionDeviceId,
        "x-access-token": xAccessToken,
        "x-dd-token": xDdToken
      })
    });

    const responseText = await upstreamRes.text();
    const durationMs = Date.now() - startTime;
    let apiData: any = null;
    try {
      apiData = JSON.parse(responseText);
    } catch {
      apiData = null;
    }

    return { upstreamRes, apiData, responseText, durationMs, requestUrl };
  };

  try {
    let result = await fetchSinglePlayback(targetChannelId);

    // If initial attempt failed or returned no video token, attempt dynamic remote token refresh and retry
    if (!result.apiData?.keyOsDetails?.video_token || result.upstreamRes.status === 401 || result.upstreamRes.status === 403) {
      const syncRes = await fetchTokensFromRemote(DEFAULT_NPOINT_API);
      if (syncRes.success) {
        result = await fetchSinglePlayback(targetChannelId);
      }
    }

    if (!result.apiData?.keyOsDetails?.video_token && rawChannelId !== targetChannelId) {
      const secondaryResult = await fetchSinglePlayback(rawChannelId);
      if (secondaryResult.apiData?.keyOsDetails?.video_token) {
        result = secondaryResult;
      }
    }

    const { upstreamRes, apiData, responseText, durationMs, requestUrl } = result;

    if (apiData && (apiData.assetDetails || apiData.keyOsDetails)) {
      const asset = apiData.assetDetails || {};
      const keyOs = apiData.keyOsDetails || {};

      const host = req.headers.host || "localhost:3000";
      const protocol = req.headers["x-forwarded-proto"] || "http";
      const hostDomainUrl = `${protocol}://${host}/api/live/${targetChannelId}.m3u8`;

      const shouldHideToken = req.query.hideToken === "true" || req.body?.hideToken === true || currentTokens.hideRawVideoToken;
      const rawVideoToken = keyOs.video_token || null;
      const displayVideoToken = shouldHideToken ? hostDomainUrl : (rawVideoToken || hostDomainUrl);

      const extractedTitle = asset.title || asset.original_title || asset.name || channelObj?.title || channelObj?.name || targetChannelId;
      const constructedImage =
        asset.image_url ||
        (asset.list_image ? `https://akamaividz.zee5.com/resources/${targetChannelId}/list/270x152/${asset.list_image}` : null) ||
        (asset.cover_image ? `https://akamaividz.zee5.com/resources/${targetChannelId}/list/270x152/${asset.cover_image}` : null) ||
        channelObj?.logo ||
        `https://akamaividz.zee5.com/resources/${targetChannelId}/list/270x152/1920x1080list.jpg`;

      const filteredResponse = {
        id: asset.id || targetChannelId,
        title: extractedTitle,
        image_url: constructedImage,
        video_token: displayVideoToken,
        raw_video_token: rawVideoToken,
        user_ip_used: activeIp
      };

      if (
        req.query.redirect === "true" ||
        req.query.stream === "true" ||
        req.query.mode === "stream" ||
        req.query.mode === "redirect" ||
        req.path.endsWith(".m3u8")
      ) {
        if (rawVideoToken) {
          return res.redirect(302, rawVideoToken);
        } else {
          return res.status(404).send("#EXTM3U\n# Error: video_token missing for channel");
        }
      }

      if (req.query.format === "full" || req.body?.format === "full") {
        return res.json({
          status: "success",
          extracted: filteredResponse,
          rawResponse: apiData,
          requestMeta: {
            requestUrl,
            durationMs,
            targetChannelId,
            language: targetLanguage,
            country: targetCountry
          }
        });
      }

      return res.json(filteredResponse);
    } else {
      const host = req.headers.host || "localhost:3000";
      const protocol = req.headers["x-forwarded-proto"] || "http";
      const hostDomainUrl = `${protocol}://${host}/api/live/${targetChannelId}.m3u8`;
      const fallbackTitle = channelObj?.title || channelObj?.name || targetChannelId;
      const fallbackImage = channelObj?.logo || `https://akamaividz.zee5.com/resources/${targetChannelId}/list/270x152/1920x1080list.jpg`;
      const fallbackUrl = (channelObj?.url && !channelObj.url.includes("aasthaott.akamaized.net")) ? channelObj.url : hostDomainUrl;

      const fallbackExtracted = {
        id: targetChannelId,
        title: fallbackTitle,
        image_url: fallbackImage,
        video_token: fallbackUrl,
        raw_video_token: fallbackUrl,
        user_ip_used: activeIp,
        isFallback: true
      };

      if (req.query.format === "full" || req.body?.format === "full") {
        return res.json({
          status: "partial_fallback",
          extracted: fallbackExtracted,
          rawResponse: apiData || { message: "Upstream token refresh unavailable, fallback link generated." },
          requestMeta: {
            requestUrl,
            durationMs,
            targetChannelId,
            language: targetLanguage,
            country: targetCountry,
            upstreamStatus: upstreamRes?.status || 502
          }
        });
      }

      return res.json(fallbackExtracted);
    }
  } catch (err: any) {
    const host = req.headers.host || "localhost:3000";
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const hostDomainUrl = `${protocol}://${host}/api/live/${targetChannelId}.m3u8`;
    const fallbackTitle = channelObj?.title || channelObj?.name || targetChannelId;
    const fallbackImage = channelObj?.logo || `https://akamaividz.zee5.com/resources/${targetChannelId}/list/270x152/1920x1080list.jpg`;
    const fallbackUrl = (channelObj?.url && !channelObj.url.includes("aasthaott.akamaized.net")) ? channelObj.url : hostDomainUrl;

    const fallbackExtracted = {
      id: targetChannelId,
      title: fallbackTitle,
      image_url: fallbackImage,
      video_token: fallbackUrl,
      raw_video_token: fallbackUrl,
      user_ip_used: activeIp,
      isFallback: true,
      error: `Upstream connection note: ${err.message}`
    };

    if (req.query.format === "full" || req.body?.format === "full") {
      return res.json({
        status: "offline_fallback",
        extracted: fallbackExtracted,
        rawResponse: { error: err.message, note: "Loaded via channel register fallback." },
        requestMeta: {
          targetChannelId,
          language: targetLanguage,
          country: targetCountry
        }
      });
    }

    return res.json(fallbackExtracted);
  }
}

async function performStreamPing(rawChannelId: string, customUrl?: string) {
  const startTime = Date.now();
  const cleanId = (rawChannelId || "").trim().replace(/-\d+$/, "");
  const checkedAt = new Date().toISOString();

  try {
    let targetStreamUrl = customUrl ? customUrl.trim() : "";

    if (!targetStreamUrl || targetStreamUrl.includes("aasthaott.akamaized.net") || targetStreamUrl.startsWith("/api/live")) {
      const jsonData = loadChannelData();
      const channelsList = Array.isArray(jsonData?.data) ? jsonData.data : [];
      const channelObj = channelsList.find((c: any) =>
        c.id === rawChannelId ||
        c.id === cleanId ||
        c.slug === rawChannelId ||
        c.slug === cleanId
      );

      const targetCountry = channelObj?.country || "IN";
      const targetLanguage = channelObj?.language || "mr";
      const sessionDeviceId = currentTokens.sessionDeviceId;
      const xAccessToken = currentTokens.xAccessToken;
      const xDdToken = currentTokens.xDdToken;
      const activeIp = getRotatedIp(currentTokens.userIpAddress);

      const queryParams = new URLSearchParams({
        channel_id: cleanId,
        device_id: sessionDeviceId,
        platform_name: "desktop_web",
        translation: "en",
        user_language: `en,hi,${targetLanguage}`,
        country: targetCountry,
        state: "KA",
        app_version: "6.5.12",
        user_type: "guest",
        check_parental_control: "false",
        uid: `Z5X_${sessionDeviceId}`,
        ppid: sessionDeviceId,
        version: "15"
      });

      const spApiUrl = `https://spapi.zee5.com/singlePlayback/getDetails/secure?${queryParams.toString()}`;
      const spHeaders: Record<string, string> = {
        accept: "application/json",
        "content-type": "application/json",
        origin: "https://www.zee5.com",
        referer: "https://www.zee5.com/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
        "x-access-token": xAccessToken,
        "X-Z5-Guest-Token": sessionDeviceId,
        "x-dd-token": xDdToken
      };

      if (activeIp) {
        spHeaders["X-Forwarded-For"] = activeIp;
        spHeaders["X-Real-IP"] = activeIp;
        spHeaders["CF-Connecting-IP"] = activeIp;
      }

      const spRes = await fetch(spApiUrl, {
        method: "POST",
        headers: spHeaders,
        body: JSON.stringify({
          "X-Z5-Guest-Token": sessionDeviceId,
          "x-access-token": xAccessToken,
          "x-dd-token": xDdToken
        }),
        signal: AbortSignal.timeout(6000)
      });

      const spJson: any = await spRes.json().catch(() => null);
      if (spJson?.keyOsDetails?.video_token) {
        targetStreamUrl = spJson.keyOsDetails.video_token;
      } else if (channelObj?.url && !channelObj.url.includes("aasthaott.akamaized.net")) {
        targetStreamUrl = channelObj.url;
      } else {
        const errorMsg = spJson?.message || spJson?.error || `Failed to extract live stream token (HTTP ${spRes.status})`;
        return {
          id: rawChannelId,
          active: false,
          status: spRes.status,
          statusText: spRes.statusText || "Token Resolution Failed",
          latencyMs: Date.now() - startTime,
          streamUrl: null,
          error: errorMsg,
          checkedAt
        };
      }
    }

    const pingStart = Date.now();
    const pingRes = await fetch(targetStreamUrl, {
      method: "GET",
      headers: {
        Range: "bytes=0-512",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
        Origin: "https://www.zee5.com",
        Referer: "https://www.zee5.com/"
      },
      signal: AbortSignal.timeout(5000)
    });

    const pingLatency = Date.now() - pingStart;
    const isSuccess = pingRes.status >= 200 && pingRes.status < 400;

    return {
      id: rawChannelId,
      active: isSuccess,
      status: pingRes.status,
      statusText: pingRes.statusText || (isSuccess ? "200 OK Active" : `HTTP ${pingRes.status}`),
      latencyMs: pingLatency,
      streamUrl: targetStreamUrl,
      error: isSuccess ? undefined : `Stream server returned HTTP ${pingRes.status} ${pingRes.statusText}`,
      checkedAt
    };
  } catch (err: any) {
    return {
      id: rawChannelId,
      active: false,
      status: 0,
      statusText: "Connection Failed",
      latencyMs: Date.now() - startTime,
      streamUrl: customUrl || null,
      error: err.name === "TimeoutError" ? "Stream Ping Timed Out (5s)" : err.message,
      checkedAt
    };
  }
}

app.get("/api/channels/ping", async (req: express.Request, res: express.Response) => {
  const channelId = (((req.query.id as string) || "") as string).trim();
  const customUrl = (((req.query.url as string) || "") as string).trim();
  if (!channelId && !customUrl) {
    return res.status(400).json({ error: "Missing 'id' or 'url' query parameter to ping." });
  }
  const result = await performStreamPing(channelId, customUrl);
  return res.json(result);
});

app.post("/api/channels/ping", async (req: express.Request, res: express.Response) => {
  const channelId = (req.body?.id || req.query.id || "").trim();
  const customUrl = (req.body?.url || req.query.url || "").trim();
  if (!channelId && !customUrl) {
    return res.status(400).json({ error: "Missing 'id' or 'url' in body to ping." });
  }
  const result = await performStreamPing(channelId, customUrl);
  return res.json(result);
});

app.post("/api/channels/ping-batch", async (req: express.Request, res: express.Response) => {
  const items: any[] = Array.isArray(req.body?.channels)
    ? req.body.channels
    : Array.isArray(req.body?.ids)
    ? req.body.ids.map((id: string) => ({ id }))
    : [];

  if (items.length === 0) {
    return res.status(400).json({ error: "Provide an array of 'channels' or 'ids' to batch ping." });
  }

  const batchStart = Date.now();
  const results: Record<string, any> = {};

  const chunkSize = 6;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkPromises = chunk.map(async (item) => {
      const id = typeof item === "string" ? item : item.id;
      const url = typeof item === "object" ? item.url : undefined;
      if (!id) return;
      const res = await performStreamPing(id, url);
      results[id] = res;
    });
    await Promise.allSettled(chunkPromises);
  }

  const values = Object.values(results);
  const activeCount = values.filter((v: any) => v.active).length;
  const inactiveCount = values.length - activeCount;

  return res.json({
    success: true,
    summary: {
      total: values.length,
      active: activeCount,
      inactive: inactiveCount,
      durationMs: Date.now() - batchStart
    },
    results
  });
});

app.get(["/api/ping", "/ping"], async (req: express.Request, res: express.Response) => {
  const channelId = (((req.query.id as string) || "0-9-zeemarathi") as string).trim();
  const customUrl = (((req.query.url as string) || "") as string).trim();
  const result = await performStreamPing(channelId, customUrl);
  return res.json(result);
});

app.get(["/api/playback", "/playback"], handlePlaybackExtraction);
app.post(["/api/playback", "/playback"], handlePlaybackExtraction);

async function handlePlaylistM3u(req: express.Request, res: express.Response) {
  try {
    const channelData = loadChannelData();
    let channels = Array.isArray(channelData.data) ? channelData.data : [];

    const filterLang = ((req.query.language as string) || "").toLowerCase();
    const filterGenre = ((req.query.genre as string) || "").toLowerCase();
    const limit = parseInt((req.query.limit as string) || "0", 10);
    const shouldBatchFetch = req.query.batch !== "false";

    if (filterLang) {
      channels = channels.filter((c: any) => (c.language || "").toLowerCase() === filterLang);
    }
    if (filterGenre) {
      channels = channels.filter((c: any) => (c.genre || c.language || "").toLowerCase().includes(filterGenre));
    }
    if (limit > 0) {
      channels = channels.slice(0, limit);
    }

    const userAgent = (req.query.user_agent as string) || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    const playlistName = (req.query.name as string) || "Zee5 Live IPTV Playlist";
    const mode = (((req.query.mode as string) || (req.query.token as string) || "") as string).toLowerCase();

    let m3uOutput = `#EXTM3U name="${playlistName}" x-tvg-url=""\r\n\r\n`;

    const host = req.headers.host || "localhost:3000";
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const baseUrl = `${protocol}://${host}`;

    if (mode === "redirect" || mode === "proxy") {
      channels.forEach((c: any) => {
        const title = c.title || c.name || c.id;
        const logo = c.logo || "";
        const genre = c.genre || (c.language ? c.language.toUpperCase() : "General");
        const redirectUrl = `${baseUrl}/api/live/${c.id}.m3u8`;

        m3uOutput += `#EXTINF:-1 tvg-id="${c.id}" tvg-name="${title}" tvg-logo="${logo}" group-title="${genre}",${title}\r\n`;
        m3uOutput += `#EXTVLCOPT:http-user-agent=${userAgent}\r\n`;
        m3uOutput += `#EXTVLCOPT:http-referrer=https://www.zee5.com/\r\n`;
        m3uOutput += `${redirectUrl}\r\n\r\n`;
      });
    } else if (shouldBatchFetch) {
      const resolveToken = async (channelObj: any) => {
        const rawId = (channelObj.id || channelObj).toString().trim();
        const channelId = rawId.replace(/-\d+$/, "");
        const targetCountry = channelObj.country || "IN";
        const sessionDeviceId = currentTokens.sessionDeviceId;
        const xAccessToken = currentTokens.xAccessToken;
        const xDdToken = currentTokens.xDdToken;

        const queryParams = new URLSearchParams({
          channel_id: channelId,
          device_id: sessionDeviceId,
          platform_name: "desktop_web",
          translation: "en",
          user_language: "en,hi,mr",
          country: targetCountry,
          state: "KA",
          app_version: "6.5.12",
          user_type: "guest",
          check_parental_control: "false",
          uid: `Z5X_${sessionDeviceId}`,
          ppid: sessionDeviceId,
          version: "15"
        });

        const requestUrl = `https://spapi.zee5.com/singlePlayback/getDetails/secure?${queryParams.toString()}`;
        const headers: Record<string, string> = {
          accept: "application/json",
          "content-type": "application/json",
          origin: "https://www.zee5.com",
          referer: "https://www.zee5.com/",
          "user-agent": userAgent,
          "x-access-token": xAccessToken,
          "X-Z5-Guest-Token": sessionDeviceId,
          "x-dd-token": xDdToken
        };

        const channelIp = getRotatedIp();
        if (channelIp) {
          headers["X-Forwarded-For"] = channelIp;
          headers["X-Real-IP"] = channelIp;
          headers["CF-Connecting-IP"] = channelIp;
        }

        try {
          const upstreamRes = await fetch(requestUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
              "X-Z5-Guest-Token": sessionDeviceId,
              "x-access-token": xAccessToken,
              "x-dd-token": xDdToken
            })
          });
          const apiData = (await upstreamRes.json()) as any;
          const asset = apiData?.assetDetails || {};
          const keyOs = apiData?.keyOsDetails || {};

          const rawVideoToken = keyOs.video_token || null;
          const hostDomainUrl = `${baseUrl}/api/live/${channelId}.m3u8`;
          const shouldHideToken = req.query.hideToken === "true" || req.body?.hideToken === true || currentTokens.hideRawVideoToken;
          const displayVideoToken = shouldHideToken ? hostDomainUrl : (rawVideoToken || hostDomainUrl);

          const title = channelObj.name || channelObj.title || asset.title || asset.original_title || asset.name || channelId;
          const logo =
            channelObj.logo ||
            asset.image_url ||
            (asset.list_image ? `https://akamaividz.zee5.com/resources/${channelId}/list/270x152/${asset.list_image}` : null) ||
            (asset.cover_image ? `https://akamaividz.zee5.com/resources/${channelId}/list/270x152/${asset.cover_image}` : null) ||
            `https://akamaividz.zee5.com/resources/${channelId}/list/270x152/1920x1080list.jpg`;

          const genre =
            channelObj.genre || asset.genres?.[0]?.value || asset.languages?.[0] || (channelObj.language ? channelObj.language.toUpperCase() : "General");

          return {
            id: rawId,
            title,
            logo,
            video_token: displayVideoToken,
            genre
          };
        } catch {
          return {
            id: rawId,
            title: channelObj.name || channelObj.title || rawId,
            logo: channelObj.logo || `https://akamaividz.zee5.com/resources/${channelId}/list/270x152/1920x1080list.jpg`,
            video_token: `${baseUrl}/api/live/${channelId}.m3u8`,
            genre: channelObj.genre || "General"
          };
        }
      };

      const chunkSize = 5;
      const resolvedList: any[] = [];
      for (let i = 0; i < channels.length; i += chunkSize) {
        const chunk = channels.slice(i, i + chunkSize);
        const resList = await Promise.all(chunk.map((c: any) => resolveToken(c)));
        resolvedList.push(...resList);
      }

      resolvedList.forEach((item) => {
        if (!item.video_token) return;
        m3uOutput += `#EXTINF:-1 tvg-id="${item.id}" tvg-name="${item.title}" tvg-logo="${item.logo}" group-title="${item.genre}",${item.title}\r\n`;
        m3uOutput += `#EXTVLCOPT:http-user-agent=${userAgent}\r\n`;
        m3uOutput += `#EXTVLCOPT:http-referrer=https://www.zee5.com/\r\n`;
        m3uOutput += `${item.video_token}\r\n\r\n`;
      });
    } else {
      channels.forEach((c: any) => {
        const title = c.title || c.name || c.id;
        const logo = c.logo || "";
        const cleanId = c.id.replace(/-\d+$/, "");
        const isDummyUrl = !c.url || c.url.includes("aasthaott.akamaized.net");
        const url = isDummyUrl ? `${baseUrl}/api/live/${cleanId}.m3u8` : c.url;
        const genre = c.genre || (c.language ? c.language.toUpperCase() : "General");

        m3uOutput += `#EXTINF:-1 tvg-id="${c.id}" tvg-name="${title}" tvg-logo="${logo}" group-title="${genre}",${title}\r\n`;
        m3uOutput += `#EXTVLCOPT:http-user-agent=${userAgent}\r\n`;
        m3uOutput += `#EXTVLCOPT:http-referrer=https://www.zee5.com/\r\n`;
        m3uOutput += `${url}\r\n\r\n`;
      });
    }

    res.setHeader("Content-Type", "application/x-mpegurl; charset=utf-8");
    res.setHeader("Content-Disposition", 'inline; filename="playlist.m3u"');
    return res.send(m3uOutput.trim());
  } catch (err: any) {
    return res.status(500).send(`#EXTM3U\n# Error generating playlist: ${err.message}`);
  }
}

app.get(["/api/playlist.m3u", "/playlist.m3u", "/api/playlist", "/playlist"], handlePlaylistM3u);

app.get(["/api/live/:id.m3u8", "/live/:id.m3u8"], (req: express.Request, res: express.Response) => {
  req.query.id = req.params.id;
  req.query.redirect = "true";
  return handlePlaybackExtraction(req, res);
});

app.get(["/api/live/:id", "/live/:id"], (req: express.Request, res: express.Response) => {
  req.query.id = req.params.id;
  req.query.redirect = "true";
  return handlePlaybackExtraction(req, res);
});

// AI Assistant Chat endpoint
app.post(["/api/assistant/chat", "/assistant/chat"], async (req: express.Request, res: express.Response) => {
  try {
    const { message, history } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message content string is required." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: "GEMINI_API_KEY environment variable is missing on server. Please configure it in AI Studio settings secrets."
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are the ZEE5 Playback & IPTV Developer AI Assistant.
Your primary role is to help developers create, debug, and optimize integration scripts (PHP, cURL, Node.js/Express, Python, Golang, M3U Playlists, Nginx proxy rules) for ZEE5 live channels, video tokens, and asset playback APIs.

Key technical facts to assist users:
1. ZEE5 Playback API Endpoint: POST https://spapi.zee5.com/singlePlayback/getDetails/secure
2. Query Parameters: channel_id, device_id, platform_name=desktop_web, translation=en, user_language, country=IN, state=KA, app_version=6.5.12, user_type=guest, ppid, version=15.
3. Headers: accept, content-type, origin=https://www.zee5.com, referer=https://www.zee5.com/, x-access-token, X-Z5-Guest-Token, x-dd-token, X-Forwarded-For (user_ip).
4. Video Token Key: keyOsDetails.video_token (contains the active signed .m3u8 stream URL).
5. Output code cleanly formatted in markdown code blocks with clear technical instructions. Be direct, helpful, and developer-focused.`;

    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const item of history) {
        if (item.role && item.text) {
          contents.push({
            role: item.role === "user" ? "user" : "model",
            parts: [{ text: item.text }]
          });
        }
      }
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.3
      }
    });

    return res.json({
      reply: response.text || "No response generated by AI."
    });
  } catch (err: any) {
    console.error("AI Assistant Chat Error:", err);
    return res.status(500).json({
      error: `AI Assistant Error: ${err.message}`
    });
  }
});

// Global Express Error Handler to prevent any FUNCTION_INVOCATION_FAILED crashes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Express Global Error:", err);
  if (!res.headersSent) {
    res.status(500).json({
      error: "Internal Server Error: " + (err.message || String(err)),
      path: req.path
    });
  }
});

async function startServer() {
  await fetchTokensFromRemote(DEFAULT_NPOINT_API).catch(() => {});
  await fetchChannelsFromRemote(DEFAULT_NPOINT_CHANNELS_API).catch(() => {});

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

// Start standalone server if executed directly
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  startServer();
}

export default app;
export { app };
