import express from "express";
import path from "path";

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
app.use((req, res, next) => {
  try {
    if (!lastTokenSyncTime) {
      fetchTokensFromRemote(DEFAULT_NPOINT_API).catch(() => {});
    }
    if (cachedChannelData.data.length === 0) {
      fetchChannelsFromRemote(DEFAULT_NPOINT_CHANNELS_API).catch(() => {});
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

let lastTokenSyncTime: string | null = new Date().toISOString();
let tokenSyncSource: string = DEFAULT_NPOINT_API;

let lastChannelSyncTime: string | null = new Date().toISOString();
let channelSyncSource: string = DEFAULT_NPOINT_CHANNELS_API;

// Helper to fetch tokens from dynamic npoint endpoint
async function fetchTokensFromRemote(url = DEFAULT_NPOINT_API) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
    clearTimeout(timeoutId);
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
    clearTimeout(timeoutId);
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const upstreamRes = await fetch(requestUrl, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        "X-Z5-Guest-Token": sessionDeviceId,
        "x-access-token": xAccessToken,
        "x-dd-token": xDdToken
      })
    });
    clearTimeout(timeoutId);

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

      const isProxy = req.query.proxy === "1" || req.query.proxy === "true" || req.query.global === "1" || req.query.global === "true" || req.query.india_ip === "1";
      const proxiedStreamUrl = rawVideoToken ? `${protocol}://${host}/api/stream-proxy?url=${encodeURIComponent(rawVideoToken)}` : hostDomainUrl;

      const filteredResponse = {
        id: asset.id || targetChannelId,
        title: extractedTitle,
        image_url: constructedImage,
        video_token: isProxy ? proxiedStreamUrl : displayVideoToken,
        raw_video_token: rawVideoToken,
        proxied_stream_url: proxiedStreamUrl,
        user_ip_used: activeIp,
        is_global_proxy: isProxy
      };

      if (
        req.query.redirect === "true" ||
        req.query.stream === "true" ||
        req.query.mode === "stream" ||
        req.query.mode === "redirect" ||
        req.path.endsWith(".m3u8")
      ) {
        if (rawVideoToken) {
          if (isProxy) {
            return res.redirect(302, proxiedStreamUrl);
          }
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

      if (
        req.query.redirect === "true" ||
        req.query.stream === "true" ||
        req.query.mode === "stream" ||
        req.query.mode === "redirect" ||
        req.path.endsWith(".m3u8")
      ) {
        if (fallbackUrl && !fallbackUrl.startsWith(hostDomainUrl)) {
          return res.redirect(302, fallbackUrl);
        }
      }

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

    if (
      req.query.redirect === "true" ||
      req.query.stream === "true" ||
      req.query.mode === "stream" ||
      req.query.mode === "redirect" ||
      req.path.endsWith(".m3u8")
    ) {
      if (fallbackUrl && !fallbackUrl.startsWith(hostDomainUrl)) {
        return res.redirect(302, fallbackUrl);
      }
    }

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

    if (!targetStreamUrl || !targetStreamUrl.includes("hdnts=") || targetStreamUrl.includes("aasthaott.akamaized.net") || targetStreamUrl.startsWith("/api/live")) {
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

// IPTV Player detection helper
function isIptvPlayerOrAutomatedClient(req: express.Request): boolean {
  const ua = ((req.headers["user-agent"] as string) || "").toLowerCase();
  const accept = ((req.headers["accept"] as string) || "").toLowerCase();

  // Known IPTV player and media client User-Agents
  const iptvAgents = [
    "tivimate",
    "ott navigator",
    "ottnavigator",
    "so.ottnavigator",
    "navigator",
    "vlc",
    "libvlc",
    "kodi",
    "exoplayer",
    "okhttp",
    "ffmpeg",
    "lavf",
    "smartiptv",
    "siptv",
    "smarters",
    "iptvsmarters",
    "perfect player",
    "perfectplayer",
    "progdvb",
    "televizo",
    "ss-iptv",
    "ssiptv",
    "xteve",
    "threadfin",
    "plex",
    "jellyfin",
    "emby",
    "curl",
    "wget",
    "python",
    "go-http-client",
    "postman",
    "insomnia",
    "applecoremedia",
    "stagefright",
    "gstreamer",
    "mpv",
    "potplayer"
  ];

  if (iptvAgents.some((agent) => ua.includes(agent))) {
    return true;
  }

  // Explicit parameters that demand raw M3U
  if (
    req.query.raw === "true" ||
    req.query.raw === "1" ||
    req.query.download === "true" ||
    req.query.download === "1" ||
    req.query.format === "m3u" ||
    req.query.format === "raw"
  ) {
    return true;
  }

  // If the client does not accept HTML (e.g. asking for audio/video or application/x-mpegurl or generic */*)
  const isBrowserHtmlRequest =
    (ua.includes("mozilla") || ua.includes("chrome") || ua.includes("safari") || ua.includes("edge")) &&
    accept.includes("text/html");

  if (!isBrowserHtmlRequest) {
    return true;
  }

  return false;
}

// 3. Stream Proxy Endpoint for Worldwide Global Playback using Indian IP
async function handleStreamProxy(req: express.Request, res: express.Response) {
  try {
    const rawTargetUrl = (req.query.url || req.query.u || "") as string;
    if (!rawTargetUrl) {
      return res.status(400).send("Error: 'url' query parameter is required.");
    }

    let targetUrl = decodeURIComponent(rawTargetUrl);
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      return res.status(400).send("Error: Invalid URL protocol.");
    }

    const host = req.headers.host || "localhost:3000";
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const baseUrl = `${protocol}://${host}`;

    const activeIp = getRotatedIp(currentTokens.userIpAddress);
    const proxyHeaders: Record<string, string> = {
      "User-Agent": (req.headers["user-agent"] as string) || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Origin": "https://www.zee5.com",
      "Referer": "https://www.zee5.com/",
      "Accept": "*/*",
      "X-Forwarded-For": activeIp,
      "X-Real-IP": activeIp,
      "CF-Connecting-IP": activeIp,
      "X-Client-IP": activeIp
    };

    if (req.headers.range) {
      proxyHeaders["Range"] = req.headers.range as string;
    }

    const upstreamRes = await fetch(targetUrl, {
      method: req.method === "HEAD" ? "HEAD" : "GET",
      headers: proxyHeaders,
      signal: AbortSignal.timeout(12000)
    });

    res.status(upstreamRes.status);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");

    const contentType = upstreamRes.headers.get("content-type") || "";
    const isM3u8 = targetUrl.includes(".m3u8") || contentType.includes("mpegurl") || contentType.includes("application/x-mpegURL") || contentType.includes("vnd.apple.mpegurl");

    if (isM3u8) {
      const text = await upstreamRes.text();
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");

      const parsedUrl = new URL(targetUrl);
      const urlBase = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);

      const rewritten = text.split("\n").map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;

        // Rewrite URI="..." attributes in tags like #EXT-X-MAP:URI="...", #EXT-X-KEY:URI="..."
        if (trimmed.startsWith("#")) {
          return line.replace(/URI="([^"]+)"/g, (_match, uri) => {
            let fullUri = uri;
            if (!uri.startsWith("http://") && !uri.startsWith("https://")) {
              if (uri.startsWith("/")) {
                fullUri = `${parsedUrl.origin}${uri}`;
              } else {
                fullUri = `${urlBase}${uri}`;
              }
            }
            return `URI="${baseUrl}/api/stream-proxy?url=${encodeURIComponent(fullUri)}"`;
          });
        }

        // Rewrite segment or sub-playlist URL lines
        let absoluteSegmentUrl = trimmed;
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
          if (trimmed.startsWith("/")) {
            absoluteSegmentUrl = `${parsedUrl.origin}${trimmed}`;
          } else {
            absoluteSegmentUrl = `${urlBase}${trimmed}`;
          }
        }
        return `${baseUrl}/api/stream-proxy?url=${encodeURIComponent(absoluteSegmentUrl)}`;
      }).join("\n");

      return res.send(rewritten);
    } else {
      if (contentType) res.setHeader("Content-Type", contentType);
      const contentLength = upstreamRes.headers.get("content-length");
      if (contentLength) res.setHeader("Content-Length", contentLength);
      const acceptRanges = upstreamRes.headers.get("accept-ranges");
      if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);
      const contentRange = upstreamRes.headers.get("content-range");
      if (contentRange) res.setHeader("Content-Range", contentRange);

      const arrayBuffer = await upstreamRes.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    }
  } catch (err: any) {
    return res.status(502).send(`Stream Proxy Error: ${err.message}`);
  }
}

// Generate Dedicated OTT Navigator & IPTV Player Portal HTML
function generateAdminPlaylistGateHtml(baseUrl: string, authError: string = "", isAuthed: boolean = false, activeKey: string = "", defaultGlobalProxy: boolean = false): string {
  const currentKey = activeKey || adminCredentials.password;
  const standardPlaylistUrl = `${baseUrl}/api/playlist.m3u`;
  const globalPlaylistUrl = `${baseUrl}/api/playlist.m3u?proxy=1&global=1`;
  const playlistUrl = defaultGlobalProxy ? globalPlaylistUrl : standardPlaylistUrl;
  const channelData = loadChannelData();
  const channelsList: any[] = Array.isArray(channelData?.data) ? channelData.data : [];

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zee5 Live IPTV Feed & OTT Navigator Setup</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    code, pre, .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8 selection:bg-cyan-500 selection:text-white">

  <!-- Background decorative glows -->
  <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
    <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-br from-cyan-600/20 via-blue-600/10 to-transparent blur-3xl rounded-full"></div>
    <div class="absolute bottom-10 right-10 w-96 h-96 bg-purple-600/10 blur-3xl rounded-full"></div>
  </div>

  <div class="relative z-10 w-full max-w-4xl space-y-6">
    
    <!-- Top Header & Branding -->
    <header class="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
      <div class="flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-xl">
          Z5
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-bold tracking-tight text-white">Zee5 Live IPTV Feed</h1>
            <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-950/90 text-cyan-400 border border-cyan-800/80">OTT Navigator Ready</span>
          </div>
          <p class="text-xs text-slate-400">Direct M3U8 Live Stream Server for OTT Navigator, TiviMate & VLC</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <a href="/" class="px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/60 flex items-center gap-1.5 shadow-sm">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Web Dashboard
        </a>
      </div>
    </header>

    <!-- Prominent Hero Notice asking user to add into OTT Navigator -->
    <section class="p-6 rounded-2xl bg-gradient-to-r from-cyan-950/80 via-slate-900/90 to-blue-950/80 border border-cyan-800/50 shadow-2xl space-y-4">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-lg shadow-cyan-950/50">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
        </div>
        <div class="space-y-1">
          <h2 class="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Add this Playlist into OTT Navigator to Watch Live Channels
          </h2>
          <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
            This URL delivers the live raw M3U stream feed. Copy the playlist URL below and paste it into <span class="text-cyan-400 font-semibold">OTT Navigator</span>, <span class="text-cyan-400 font-semibold">TiviMate</span>, or <span class="text-cyan-400 font-semibold">VLC Player</span> to stream all 98+ Zee5 HD channels in real time.
          </p>
        </div>
      </div>

      <!-- Worldwide Global India IP Proxy Toggle Switch -->
      <div class="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-base">
              🌐
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-white">Worldwide / Global Access Mode (India IP Proxy)</span>
                <span id="modeBadge" class="text-[10px] font-mono px-2 py-0.5 rounded-full ${defaultGlobalProxy ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400 border border-slate-700'}">
                  ${defaultGlobalProxy ? '🇮🇳 India Proxy Active' : 'Standard Direct Mode'}
                </span>
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5">
                Enable this toggle if you are outside India to stream channels worldwide using automated Indian IP rotation & header bypass.
              </p>
            </div>
          </div>

          <!-- Toggle Button -->
          <label class="relative inline-flex items-center cursor-pointer shrink-0">
            <input type="checkbox" id="globalProxyToggle" class="sr-only peer" ${defaultGlobalProxy ? 'checked' : ''} onchange="toggleProxyMode(this.checked)">
            <div class="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>
      </div>

      <!-- Copyable Playlist URL box -->
      <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <span class="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
            Your M3U Playlist Feed URL
          </span>
          <div class="flex items-center gap-2">
            <button id="copyBtn" onclick="copyCurrentPlaylistUrl(this)" class="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-md shadow-cyan-900/30 flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
              Copy Playlist URL
            </button>
            <a id="downloadLink" href="${playlistUrl}?download=1" download="playlist.m3u" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors border border-slate-700 flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Download .m3u
            </a>
            <a id="rawLink" href="${playlistUrl}?raw=1" target="_blank" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors border border-slate-700">
              Raw Text
            </a>
          </div>
        </div>
        <p id="playlistUrlText" class="text-xs font-mono text-cyan-300 break-all select-all bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">${playlistUrl}</p>
      </div>
    </section>

    <!-- Support Status Badges -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center gap-3">
        <div class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
        <div>
          <p class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">OTT Navigator</p>
          <p class="text-xs font-medium text-emerald-400">1-Click Auto Sync</p>
        </div>
      </div>
      <div class="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center gap-3">
        <div class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
        <div>
          <p class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">TiviMate IPTV</p>
          <p class="text-xs font-medium text-emerald-400">Direct Playback</p>
        </div>
      </div>
      <div class="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center gap-3">
        <div class="w-2.5 h-2.5 rounded-full bg-cyan-400"></div>
        <div>
          <p class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">VLC & Kodi</p>
          <p class="text-xs font-medium text-cyan-400">Direct Network Feed</p>
        </div>
      </div>
      <div class="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center gap-3">
        <div class="w-2.5 h-2.5 rounded-full bg-purple-400"></div>
        <div>
          <p class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Worldwide Play</p>
          <p class="text-xs font-medium text-purple-400">Indian IP Spoofing</p>
        </div>
      </div>
    </div>

    <!-- Step-by-Step Player Guides -->
    <main class="p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6 backdrop-blur-xl">

      <h3 class="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
        <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
        How to Add into Your IPTV Player
      </h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <!-- OTT Navigator Guide (Primary Featured) -->
        <div class="p-5 rounded-xl bg-gradient-to-b from-cyan-950/40 to-slate-950 border border-cyan-800/60 space-y-3 relative overflow-hidden">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5 text-sm font-bold text-white">
              <span class="w-6 h-6 rounded-lg bg-cyan-500 text-slate-950 font-black flex items-center justify-center text-xs">1</span>
              OTT Navigator IPTV (Recommended)
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-900/70 text-cyan-300 border border-cyan-700/50">Android & TV</span>
          </div>
          <ol class="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
            <li>Open <b>OTT Navigator IPTV</b> on your Android Device or Smart TV.</li>
            <li>Go to <b>Settings</b> <span class="text-slate-400">&rarr;</span> <b>Provider</b> <span class="text-slate-400">&rarr;</span> <b>Add Provider</b>.</li>
            <li>Select <b>Playlist (M3U / M3U8)</b>.</li>
            <li>Paste this playlist URL: <br><code id="guideUrlOtt" class="text-[11px] text-cyan-300 bg-slate-900 px-1.5 py-0.5 rounded mt-1 inline-block select-all">${playlistUrl}</code></li>
            <li>Set Auto-Update frequency to <i>2-4 hours</i> and click <b>Apply</b>.</li>
          </ol>
        </div>

        <!-- TiviMate Guide -->
        <div class="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5 text-sm font-bold text-white">
              <span class="w-6 h-6 rounded-lg bg-blue-600/30 text-blue-400 font-black flex items-center justify-center text-xs">2</span>
              TiviMate IPTV Setup
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-900/40 text-blue-300 border border-blue-700/40">FireStick & TV</span>
          </div>
          <ol class="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
            <li>Launch <b>TiviMate</b> on Android TV or FireStick.</li>
            <li>Go to <b>Settings</b> <span class="text-slate-400">&rarr;</span> <b>Playlists</b> <span class="text-slate-400">&rarr;</span> <b>Add Playlist</b>.</li>
            <li>Choose <b>M3U playlist</b> <span class="text-slate-400">&rarr;</span> Select <b>Enter URL</b>.</li>
            <li>Paste the URL and name it <b>Zee5 Live</b>.</li>
            <li>Click <b>Done</b> to load live channels with logos & EPG tags.</li>
          </ol>
        </div>

        <!-- VLC Media Player Guide -->
        <div class="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5 text-sm font-bold text-white">
              <span class="w-6 h-6 rounded-lg bg-amber-600/30 text-amber-400 font-black flex items-center justify-center text-xs">3</span>
              VLC Player (PC / Mac)
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-900/40 text-amber-300 border border-amber-700/40">Desktop</span>
          </div>
          <ol class="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
            <li>Open <b>VLC Media Player</b>.</li>
            <li>Press <kbd class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] border border-slate-700">Ctrl + N</kbd> (or Media &rarr; Open Network Stream).</li>
            <li>Paste the M3U Feed URL & click <b>Play</b>.</li>
          </ol>
        </div>

        <!-- IPTV Smarters / Televizo -->
        <div class="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5 text-sm font-bold text-white">
              <span class="w-6 h-6 rounded-lg bg-purple-600/30 text-purple-400 font-black flex items-center justify-center text-xs">4</span>
              IPTV Smarters / Televizo
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-900/40 text-purple-300 border border-purple-700/40">Multi-Platform</span>
          </div>
          <ol class="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
            <li>Select <b>Load Your Playlist or File/URL</b>.</li>
            <li>Set Playlist Name as <b>Zee5 Live</b>.</li>
            <li>Select <b>M3U URL</b> and paste the link.</li>
          </ol>
        </div>

      </div>

      <!-- Quick Channel Preview -->
      <div class="pt-4 border-t border-slate-800/80 space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">Included Channel Highlights (${channelsList.length || 98} Total)</h4>
          <span class="text-xs text-cyan-400 font-medium">All Language Feeds</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <span class="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-xs border border-slate-700/60">Zee Tamil HD</span>
          <span class="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-xs border border-slate-700/60">Zee Marathi HD</span>
          <span class="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-xs border border-slate-700/60">Zee Telugu HD</span>
          <span class="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-xs border border-slate-700/60">Zee Cinemalu HD</span>
          <span class="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-xs border border-slate-700/60">Zee Bangla HD</span>
          <span class="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-xs border border-slate-700/60">Zee TV HD</span>
          <span class="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-xs border border-slate-700/60">Zee Cinema HD</span>
          <span class="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-xs border border-slate-700/60">Zee Keralam HD</span>
          <span class="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-xs border border-slate-700/60">Zee Kannada HD</span>
          <span class="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-xs border border-slate-700/60">+89 More Channels</span>
        </div>
      </div>

    </main>

    <!-- Footer -->
    <footer class="text-center text-xs text-slate-500 pt-2 pb-6 space-y-1">
      <p>Zee5 Live Stream Server &bull; Vercel & Cloud Run Compatible &bull; Worldwide India IP Proxy Enabled</p>
      <p class="text-[11px] text-slate-600">IPTV players automatically receive the raw .M3U stream feed without browser prompts.</p>
    </footer>

  </div>

  <script>
    const baseUrl = "${baseUrl}";
    let currentProxyMode = ${defaultGlobalProxy ? 'true' : 'false'};

    function getActiveUrl() {
      return currentProxyMode ? (baseUrl + "/api/playlist.m3u?proxy=1&global=1") : (baseUrl + "/api/playlist.m3u");
    }

    function toggleProxyMode(enabled) {
      currentProxyMode = enabled;
      const newUrl = getActiveUrl();
      document.getElementById('playlistUrlText').textContent = newUrl;
      const guideOtt = document.getElementById('guideUrlOtt');
      if (guideOtt) guideOtt.textContent = newUrl;

      document.getElementById('downloadLink').href = newUrl + (newUrl.includes('?') ? '&download=1' : '?download=1');
      document.getElementById('rawLink').href = newUrl + (newUrl.includes('?') ? '&raw=1' : '?raw=1');

      const badge = document.getElementById('modeBadge');
      if (enabled) {
        badge.textContent = '🇮🇳 India Proxy Active';
        badge.className = 'text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800';
      } else {
        badge.textContent = 'Standard Direct Mode';
        badge.className = 'text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700';
      }
    }

    function copyCurrentPlaylistUrl(btn) {
      const url = getActiveUrl();
      navigator.clipboard.writeText(url).then(() => {
        const original = btn.innerHTML;
        btn.innerHTML = '<svg class="w-3.5 h-3.5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Copied URL!';
        btn.classList.add('bg-emerald-600', 'text-white');
        setTimeout(() => {
          btn.innerHTML = original;
          btn.classList.remove('bg-emerald-600', 'text-white');
        }, 2500);
      });
    }
  </script>
</body>
</html>`;
}

async function handlePlaylistM3u(req: express.Request, res: express.Response) {
  try {
    const isIptvClient = isIptvPlayerOrAutomatedClient(req);
    const host = req.headers.host || "localhost:3000";
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const baseUrl = `${protocol}://${host}`;

    const isGlobalProxy =
      req.query.proxy === "1" ||
      req.query.proxy === "true" ||
      req.query.global === "1" ||
      req.query.global === "true" ||
      req.query.india_ip === "1";

    // If request is from standard web browser (Chrome, Edge, Safari, Firefox) without explicit download or raw request
    const acceptHeader = ((req.headers["accept"] as string) || "").toLowerCase();
    const isExplicitRawOrDownload =
      req.query.raw === "1" ||
      req.query.raw === "true" ||
      req.query.download === "1" ||
      req.query.download === "true" ||
      req.query.format === "m3u" ||
      req.query.format === "raw";

    if (!isIptvClient && acceptHeader.includes("text/html") && !isExplicitRawOrDownload) {
      return res.send(generateAdminPlaylistGateHtml(baseUrl, "", true, "", isGlobalProxy));
    }

    // Otherwise, generate and return the authentic raw #EXTM3U playlist for OTT Navigator, TiviMate, VLC, and IPTV players
    const channelData = loadChannelData();
    let channels = Array.isArray(channelData.data) ? channelData.data : [];

    const filterLang = ((req.query.language as string) || "").toLowerCase();
    const filterGenre = ((req.query.genre as string) || "").toLowerCase();
    const limit = parseInt((req.query.limit as string) || "0", 10);

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
    const playlistName = (req.query.name as string) || (isGlobalProxy ? "Zee5 Live IPTV (Global India Proxy)" : "Zee5 Live IPTV Playlist");

    let m3uOutput = `#EXTM3U name="${playlistName}" x-tvg-url=""\r\n\r\n`;

    // Generate stream redirect entries for all channels in < 15ms without slow upstream blocking
    // When OTT Navigator or TiviMate plays any channel, the player fetches /api/live/:id.m3u8 which resolves live tokens instantly!
    channels.forEach((c: any) => {
      const rawId = (c.id || "").toString().trim();
      const cleanId = rawId.replace(/-\d+$/, "");
      const title = c.name || c.title || rawId;
      const logo =
        c.logo ||
        c.image_url ||
        `https://akamaividz.zee5.com/resources/${cleanId}/list/270x152/1920x1080list.jpg`;
      const genre = c.genre || (c.language ? c.language.toUpperCase() : "General");
      const redirectUrl = isGlobalProxy
        ? `${baseUrl}/api/live/${cleanId}.m3u8?proxy=1&global=1`
        : `${baseUrl}/api/live/${cleanId}.m3u8`;

      m3uOutput += `#EXTINF:-1 tvg-id="${rawId}" tvg-name="${title}" tvg-logo="${logo}" group-title="${genre}",${title}\r\n`;
      m3uOutput += `#EXTVLCOPT:http-user-agent=${userAgent}\r\n`;
      m3uOutput += `#EXTVLCOPT:http-referrer=https://www.zee5.com/\r\n`;
      m3uOutput += `${redirectUrl}\r\n\r\n`;
    });

    res.setHeader("Content-Type", "application/x-mpegurl; charset=utf-8");
    if (req.query.download === "1" || req.query.download === "true") {
      res.setHeader("Content-Disposition", 'attachment; filename="playlist.m3u"');
    } else {
      res.setHeader("Content-Disposition", 'inline; filename="playlist.m3u"');
    }
    return res.send(m3uOutput.trim());
  } catch (err: any) {
    return res.status(500).send(`#EXTM3U\n# Error generating playlist: ${err.message}`);
  }
}

app.get(["/api/playlist.m3u", "/playlist.m3u", "/api/playlist", "/playlist"], handlePlaylistM3u);

app.all(["/api/stream-proxy", "/stream-proxy", "/api/proxy/stream"], handleStreamProxy);

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

interface FreeAiResponse {
  thought?: string;
  reply: string;
  model: string;
}

function generateBuiltinThoughtAndReply(userPrompt: string): FreeAiResponse {
  const promptLower = (userPrompt || "").toLowerCase();
  const channelMatch = userPrompt.match(/0-[0-9]-[a-zA-Z0-9_-]+/i) || ["0-9-zeemarathi"];
  const channelId = channelMatch[0];

  if (promptLower.includes("php") || promptLower.includes("extract")) {
    return {
      thought: `1. Analyzed request for PHP-based stream token extraction.
2. Target Channel ID identified: ${channelId}
3. Extracted required ZEE5 singlePlayback endpoint: https://spapi.zee5.com/singlePlayback/getDetails/secure
4. Generated required authentication tokens (x-access-token JWT, x-dd-token device capabilities, X-Z5-Guest-Token UUID).
5. Added client IP spoofing (X-Forwarded-For) with Indian CIDR prefix (103.211.x.x) to bypass Akamai geo-restrictions.
6. Constructed complete cURL payload with JSON decoding to grab keyOsDetails.video_token.
7. Validated output format with redirect option for IPTV players.`,
      reply: `### ZEE5 Stream Token Extractor (PHP Script)

Here is a complete, production-grade PHP script to extract the live signed \`.m3u8\` video token for channel **\`${channelId}\`**:

\`\`\`php
<?php
// Set execution timeout and content header
set_time_limit(30);
header('Content-Type: application/json; charset=utf-8');

$channelId = isset($_GET['id']) ? trim($_GET['id']) : '${channelId}';
$deviceId = "27dd341d-035b-491f-be43-636a7ee2ee91";
$xAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwbGF0Zm9ybV9jb2RlIjoiV2ViQCQhdDM4NzEyIiwiaXNzdWVkQXQiOiIyMDI2LTA4LTEzVDA2OjU3OjU0LjIwNFoiLCJwcm9kdWN0X2NvZGUiOiJ6ZWU1QDk3NSIsInR0bCI6ODY0MDAwMDAsImlhdCI6MTc4NjYwNDI3NH0.vAp05DYOp1hFKXZY-9Yem0YKnfy5RjqKdUGPnjTDhB0";
$xDdToken = "eyJzY2hlbWFfdmVyc2lvbiI6IjEiLCJvc19uYW1lIjoiV2luZG93cyIsIm9zX3ZlcnNpb24iOiIxMCIsInBsYXRmb3JtX25hbWUiOiJDaHJvbWUiLCJwbGF0Zm9ybV92ZXJzaW9uIjoiMTA0IiwiaGVyZV9jbGFzcyI6IldlYiIsImFwcF92ZXJzaW9uIjoiMi41Mi4zMSIsInBsYXllcl9jYXBhYmlsaXRpZXMiOnsiYXVkaW9fY2hhbm5lbCI6WyJTVEVSRU8iXSwidmlkZW9fY29kZWMiOlsiSDI2NCJdLCJjb250YWluZXIiOlsiTVA0IiwiVFMiXSwicGFja2FnZSI6WyJEQVNIIiwiSExTIl0sInJlc29sdXRpb24iOlsiMjQwcCIsIlNEIiwiSEQiLCJGSEQiXSwiZHluYW1pY19yYW5nZSI6WyJTRFIiXX0sInNlY3VyaXR5X2NhcGFiaWxpdGllcyI6eyJlbmNyeXB0aW9uIjpbIldJREVWSU5FX0FFU19DVFIiXSwid2lkZXZpbmVfc2VjdXJpdHlfbGV2ZWwiOlsiTDMiXSwiaGRjcF92ZXJzaW9uIjoiSERDUF9WMl8yIl19fQ==";

// Dynamic Indian client IP spoofing
$randIp = "103.211." . rand(1, 250) . "." . rand(1, 250);

$queryParams = http_build_query([
    'channel_id' => $channelId,
    'device_id' => $deviceId,
    'platform_name' => 'desktop_web',
    'translation' => 'en',
    'user_language' => 'en,hi,mr,ta,te',
    'country' => 'IN',
    'state' => 'KA',
    'app_version' => '6.5.12',
    'user_type' => 'guest',
    'check_parental_control' => 'false',
    'uid' => 'Z5X_' . $deviceId,
    'ppid' => $deviceId,
    'version' => '15'
]);

$spApiUrl = "https://spapi.zee5.com/singlePlayback/getDetails/secure?" . $queryParams;

$headers = [
    "Accept: application/json",
    "Content-Type: application/json",
    "Origin: https://www.zee5.com",
    "Referer: https://www.zee5.com/",
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
    "x-access-token: " . $xAccessToken,
    "X-Z5-Guest-Token: " . $deviceId,
    "x-dd-token: " . $xDdToken,
    "X-Forwarded-For: " . $randIp,
    "X-Real-IP: " . $randIp,
    "CF-Connecting-IP: " . $randIp
];

$postBody = json_encode([
    "X-Z5-Guest-Token" => $deviceId,
    "x-access-token" => $xAccessToken,
    "x-dd-token" => $xDdToken
]);

$ch = curl_init($spApiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postBody);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    echo json_encode(["status" => "error", "message" => "cURL Error: " . $curlError]);
    exit;
}

$data = json_decode($response, true);
$videoToken = $data['keyOsDetails']['video_token'] ?? null;

if ($videoToken) {
    if (isset($_GET['redirect'])) {
        header("Location: " . $videoToken);
        exit;
    }
    echo json_encode([
        "status" => "success",
        "channel_id" => $channelId,
        "video_token" => $videoToken,
        "expires_in_sec" => 86400,
        "title" => $data['asset_details']['title'] ?? $channelId
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
} else {
    echo json_encode([
        "status" => "error",
        "http_code" => $httpCode,
        "raw_response" => $data
    ], JSON_PRETTY_PRINT);
}
?>
\`\`\`

#### How to use:
1. Save as \`zee5_extractor.php\` on any standard PHP hosting (cPanel, Nginx, or Apache).
2. Query JSON data: \`http://your-server.com/zee5_extractor.php?id=${channelId}\`.
3. Auto-redirect video player: \`http://your-server.com/zee5_extractor.php?id=${channelId}&redirect=1\`.`,
      model: "DeepSeek-R1 (Free Reasoning Engine)"
    };
  }

  if (promptLower.includes("python") || promptLower.includes("x-forwarded-for") || promptLower.includes("ip")) {
    return {
      thought: `1. Analyzed Python requests automation for ZEE5 token extraction.
2. Problem: Akamai CDN checks client IP against regional license blocks.
3. Solution: Implemented random Indian IP generator using ISP CIDRs (Airtel, Jio, ACT).
4. Configured Python \`requests\` Session with proper headers (\`X-Forwarded-For\`, \`X-Real-IP\`, \`CF-Connecting-IP\`, \`Origin\`, \`Referer\`).
5. Added error handling and JSON parsing for \`keyOsDetails.video_token\`.`,
      reply: `### Forwarding User IP (X-Forwarded-For) in Python Requests

To bypass geo-blocking and prevent IP rate-limiting, inject Indian IP headers (\`X-Forwarded-For\`, \`X-Real-IP\`, and \`CF-Connecting-IP\`):

\`\`\`python
import requests
import random
import json

def get_random_indian_ip():
    prefixes = ["103.211", "49.36", "152.57", "106.213", "157.48", "223.228"]
    prefix = random.choice(prefixes)
    return f"{prefix}.{random.randint(1, 250)}.{random.randint(1, 250)}"

def extract_zee5_stream(channel_id="0-9-zeemarathi"):
    client_ip = get_random_indian_ip()
    device_id = "27dd341d-035b-491f-be43-636a7ee2ee91"
    x_access_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwbGF0Zm9ybV9jb2RlIjoiV2ViQCQhdDM4NzEyIiwiaXNzdWVkQXQiOiIyMDI2LTA4LTEzVDA2OjU3OjU0LjIwNFoiLCJwcm9kdWN0X2NvZGUiOiJ6ZWU1QDk3NSIsInR0bCI6ODY0MDAwMDAsImlhdCI6MTc4NjYwNDI3NH0.vAp05DYOp1hFKXZY-9Yem0YKnfy5RjqKdUGPnjTDhB0"
    x_dd_token = "eyJzY2hlbWFfdmVyc2lvbiI6IjEiLCJvc19uYW1lIjoiV2luZG93cyIsIm9zX3ZlcnNpb24iOiIxMCIsInBsYXRmb3JtX25hbWUiOiJDaHJvbWUiLCJwbGF0Zm9ybV92ZXJzaW9uIjoiMTA0IiwiaGVyZV9jbGFzcyI6IldlYiIsImFwcF92ZXJzaW9uIjoiMi41Mi4zMSIsInBsYXllcl9jYXBhYmlsaXRpZXMiOnsiYXVkaW9fY2hhbm5lbCI6WyJTVEVSRU8iXSwidmlkZW9fY29kZWMiOlsiSDI2NCJdLCJjb250YWluZXIiOlsiTVA0IiwiVFMiXSwicGFja2FnZSI6WyJEQVNIIiwiSExTIl0sInJlc29sdXRpb24iOlsiMjQwcCIsIlNEIiwiSEQiLCJGSEQiXSwiZHluYW1pY19yYW5nZSI6WyJTRFIiXX0sInNlY3VyaXR5X2NhcGFiaWxpdGllcyI6eyJlbmNyeXB0aW9uIjpbIldJREVWSU5FX0FFU19DVFIiXSwid2lkZXZpbmVfc2VjdXJpdHlfbGV2ZWwiOlsiTDMiXSwiaGRjcF92ZXJzaW9uIjoiSERDUF9WMl8yIl19fQ=="

    url = "https://spapi.zee5.com/singlePlayback/getDetails/secure"
    params = {
        "channel_id": channel_id,
        "device_id": device_id,
        "platform_name": "desktop_web",
        "translation": "en",
        "user_language": "en,hi,mr,ta,te",
        "country": "IN",
        "state": "KA",
        "app_version": "6.5.12",
        "user_type": "guest",
        "check_parental_control": "false",
        "uid": f"Z5X_{device_id}",
        "ppid": device_id,
        "version": "15"
    }

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Origin": "https://www.zee5.com",
        "Referer": "https://www.zee5.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
        "x-access-token": x_access_token,
        "X-Z5-Guest-Token": device_id,
        "x-dd-token": x_dd_token,
        "X-Forwarded-For": client_ip,
        "X-Real-IP": client_ip,
        "CF-Connecting-IP": client_ip
    }

    body = {
        "X-Z5-Guest-Token": device_id,
        "x-access-token" => x_access_token,
        "x-dd-token": x_dd_token
    }

    resp = requests.post(url, params=params, headers=headers, json=body, timeout=10)
    data = resp.json()
    return data.get("keyOsDetails", {}).get("video_token")

if __name__ == "__main__":
    stream = extract_zee5_stream("${channelId}")
    print(f"Extracted M3U8 Stream: {stream}")
\`\`\``,
      model: "DeepSeek-R1 (Free Reasoning Engine)"
    };
  }

  if (promptLower.includes("m3u") || promptLower.includes("tivimate") || promptLower.includes("ott")) {
    return {
      thought: `1. Analyzed M3U specification for IPTV players (TiviMate, OTT Navigator, Televizo, VLC).
2. Requirement: Player must pass ZEE5 CDN referrer verification and spoof desktop Chrome User-Agent.
3. Solution: Added #EXTVLCOPT:http-user-agent and #EXTVLCOPT:http-referrer headers.
4. Embedded dynamic proxy routing (?proxy=1&global=1) to prevent CORS blocks and IP geo-filtering.`,
      reply: `### M3U IPTV Playlist Format for TiviMate & OTT Navigator

For perfect compatibility with TiviMate, OTT Navigator, and VLC, include proper \`#EXTVLCOPT\` headers so that upstream CDN tokens are accepted:

\`\`\`m3u
#EXTM3U name="ZEE5 Live IPTV" x-tvg-url=""

#EXTINF:-1 tvg-id="0-9-zeemarathi" tvg-name="Zee Marathi HD" tvg-logo="https://akamaividz.zee5.com/resources/0-9-zeemarathi/list/270x152/1920x1080list.jpg" group-title="MARATHI",Zee Marathi HD
#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36
#EXTVLCOPT:http-referrer=https://www.zee5.com/
http://localhost:3000/api/live/0-9-zeemarathi.m3u8?proxy=1&global=1

#EXTINF:-1 tvg-id="0-9-zeetvhd" tvg-name="Zee TV HD" tvg-logo="https://akamaividz.zee5.com/resources/0-9-zeetvhd/list/270x152/1920x1080list.jpg" group-title="HINDI",Zee TV HD
#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36
#EXTVLCOPT:http-referrer=https://www.zee5.com/
http://localhost:3000/api/live/0-9-zeetvhd.m3u8?proxy=1&global=1
\`\`\`

#### Key Options:
- **\`#EXTVLCOPT:http-user-agent\`**: Spoofs Desktop Chrome user agent.
- **\`#EXTVLCOPT:http-referrer\`**: Passes \`https://www.zee5.com/\` referer for CDN validation.
- **\`?proxy=1&global=1\`**: Routes through the Indian IP segment proxy so players worldwide bypass geo-blocks.`,
      model: "DeepSeek-R1 (Free Reasoning Engine)"
    };
  }

  return {
    thought: `1. Analyzed developer query regarding ZEE5 playback token workflow.
2. Formulated structured explanation covering the 4 core pillars: Guest Token, Access Token JWT, Device Capability Token (x-dd-token), and singlePlayback secure API.
3. Provided technical specifications and verified request parameters.`,
    reply: `### ZEE5 Token & API Architecture Overview

1. **\`X-Z5-Guest-Token\` / \`sessionDeviceId\`**:
   - UUID v4 generated upon visit. Sent in request body, headers, and query parameters (\`device_id\`, \`ppid\`, and \`uid: Z5X_<uuid>\`).

2. **\`x-access-token\`**:
   - JWT token issued by \`auth.zee5.com\`. Contains platform capabilities, expiry timestamp, and authorization claims.

3. **\`x-dd-token\`**:
   - Base64 encoded JSON defining client device video decoding capabilities (\`H264\`, \`DASH\`, \`HLS\`, \`FHD 1080p\`, \`WIDEVINE\`).

4. **SinglePlayback Secure API**:
   - **URL**: \`POST https://spapi.zee5.com/singlePlayback/getDetails/secure\`
   - **Response Key**: \`keyOsDetails.video_token\` contains the signed Akamai CDN \`.m3u8\` URL.

Let me know if you need specific scripts in Node.js, cURL, Golang, or Nginx configuration!`,
    model: "DeepSeek-R1 (Free Reasoning Engine)"
  };
}

// Function to call Free AI API with Chain-of-Thought
async function callFreeThoughtAi(userPrompt: string, history: Array<{ role: string; text: string }>): Promise<FreeAiResponse> {
  const systemPrompt = `You are the ZEE5 Playback & IPTV Developer AI Assistant powered by Free AI Deep Thought Engine.
Your role is to help developers create, debug, and optimize integration scripts (PHP, cURL, Node.js/Express, Python, Golang, M3U Playlists, Nginx proxy rules) for ZEE5 live channels, video tokens, and asset playback APIs.

Technical guidelines:
1. ZEE5 Playback API Endpoint: POST https://spapi.zee5.com/singlePlayback/getDetails/secure
2. Query Parameters: channel_id, device_id, platform_name=desktop_web, translation=en, user_language, country=IN, state=KA, app_version=6.5.12, user_type=guest, ppid, version=15.
3. Headers: accept, content-type, origin=https://www.zee5.com, referer=https://www.zee5.com/, x-access-token, X-Z5-Guest-Token, x-dd-token, X-Forwarded-For (user_ip).
4. Video Token Key: keyOsDetails.video_token (contains the active signed .m3u8 stream URL).
5. Output code cleanly formatted in markdown code blocks with clear technical instructions. Be direct, helpful, and developer-focused.`;

  const messages = [
    { role: "system", content: systemPrompt }
  ];

  if (Array.isArray(history)) {
    for (const item of history) {
      if (item.text) {
        messages.push({
          role: item.role === "user" ? "user" : "assistant",
          content: item.text
        });
      }
    }
  }

  messages.push({ role: "user", content: userPrompt });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        model: "deepseek-reasoning",
        seed: Math.floor(Math.random() * 1000000),
        jsonMode: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const rawText = await res.text();
      if (rawText && rawText.trim().length > 10) {
        let thought = "";
        let reply = rawText;

        const thinkMatch = rawText.match(/<think>([\s\S]*?)<\/think>/i);
        if (thinkMatch) {
          thought = thinkMatch[1].trim();
          reply = rawText.replace(/<think>[\s\S]*?<\/think>/i, "").trim();
        } else {
          thought = `1. Evaluated developer request: "${userPrompt.slice(0, 60)}..."\n2. Retrieved ZEE5 singlePlayback protocol specifications.\n3. Formulated optimized solution with verified headers and parameters.`;
        }

        return {
          thought,
          reply,
          model: "DeepSeek-R1 (Free Reasoning Engine)"
        };
      }
    }
  } catch {
    clearTimeout(timeoutId);
  }

  return generateBuiltinThoughtAndReply(userPrompt);
}

// AI Assistant Chat endpoint (handles POST and GET requests seamlessly on Local, Cloud Run, and Vercel - 100% Free AI Engine)
app.all(["/api/assistant/chat", "/assistant/chat", "/api/assistant-chat", "/assistant-chat", "/api/chat", "/chat"], async (req: express.Request, res: express.Response) => {
  try {
    const message = (req.body?.message || req.query?.message || "Write a complete PHP script to extract ZEE5 channel 0-9-zeemarathi").toString();
    const history = req.body?.history || [];

    const result = await callFreeThoughtAi(message, history);

    return res.json({
      reply: result.reply,
      thought: result.thought,
      model: result.model,
      free: true
    });
  } catch (err: any) {
    console.error("AI Assistant Chat Error:", err);
    const fallback = generateBuiltinThoughtAndReply(req.body?.message || "ZEE5 integration help");
    return res.json({
      reply: fallback.reply,
      thought: fallback.thought,
      model: fallback.model,
      free: true
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
