import { GoogleGenAI } from "@google/genai";

function generateFallbackResponse(userPrompt: string): string {
  const promptLower = (userPrompt || "").toLowerCase();

  // Match channel ID from prompt if any
  const channelMatch = userPrompt.match(/0-[0-9]-[a-zA-Z0-9_-]+/i) || ["0-9-zeemarathi"];
  const channelId = channelMatch[0];

  if (promptLower.includes("php") || promptLower.includes("extract")) {
    return `### ZEE5 Stream Token Extractor (PHP Script)

Here is a production-ready PHP script to extract the active signed \`.m3u8\` video token for channel **\`${channelId}\`**:

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
1. Save as \`zee5_extractor.php\` on any PHP server (Apache, Nginx, or cPanel).
2. Fetch via \`http://your-server.com/zee5_extractor.php?id=${channelId}\`.
3. To redirect IPTV players directly: \`http://your-server.com/zee5_extractor.php?id=${channelId}&redirect=1\`.`;
  }

  if (promptLower.includes("python") || promptLower.includes("x-forwarded-for")) {
    return `### Forwarding User IP (X-Forwarded-For) in Python Requests

To bypass geo-blocking and prevent IP rate-limiting, inject Indian IP headers (\`X-Forwarded-For\`, \`X-Real-IP\`, and \`CF-Connecting-IP\`) into your Python requests session:

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
        "x-access-token": x_access_token,
        "x-dd-token": x_dd_token
    }

    resp = requests.post(url, params=params, headers=headers, json=body, timeout=10)
    data = resp.json()
    video_token = data.get("keyOsDetails", {}).get("video_token")
    return video_token

if __name__ == "__main__":
    stream = extract_zee5_stream("${channelId}")
    print(f"Extracted M3U8 Stream: {stream}")
\`\`\``;
  }

  if (promptLower.includes("m3u") || promptLower.includes("tivimate") || promptLower.includes("ott")) {
    return `### M3U IPTV Playlist Format for TiviMate & OTT Navigator

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
- **\`#EXTVLCOPT:http-user-agent\`**: Spoofs standard Desktop Chrome user agent.
- **\`#EXTVLCOPT:http-referrer\`**: Sets \`https://www.zee5.com/\` referer to pass Akamai CDN hotlink protection.
- **\`?proxy=1&global=1\`**: Routes through the Indian IP segment proxy so international players stream smoothly without geo-blocks.`;
  }

  return `### ZEE5 Token & API Architecture Overview

1. **\`X-Z5-Guest-Token\` / \`sessionDeviceId\`**:
   - UUID v4 generated upon user visit. Sent in request body, headers, and query parameters (\`device_id\`, \`ppid\`, and \`uid: Z5X_<uuid>\`).

2. **\`x-access-token\`**:
   - JWT token issued by \`auth.zee5.com\`. Contains platform capabilities, expiry timestamp, and authorization claims.

3. **\`x-dd-token\`**:
   - Base64 encoded JSON defining client device video decoding capabilities (\`H264\`, \`DASH\`, \`HLS\`, \`FHD 1080p\`, \`WIDEVINE\`).

4. **SinglePlayback Secure API**:
   - **URL**: \`POST https://spapi.zee5.com/singlePlayback/getDetails/secure\`
   - **Response Key**: \`keyOsDetails.video_token\` contains the signed Akamai CDN \`.m3u8\` URL.

Let me know if you need specific scripts in Node.js, cURL, Golang, or Nginx configuration!`;
}

export default async function handler(req: any, res: any) {
  // Always handle CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {}
    }

    const message = body?.message || req.query?.message || "Write a complete PHP script to extract ZEE5 channel 0-9-zeemarathi";
    const history = body?.history || [];

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build"
            }
          }
        });

        const systemInstruction = `You are the ZEE5 Playback & IPTV Developer AI Assistant.
Your role is to help developers create, debug, and optimize integration scripts (PHP, cURL, Node.js/Express, Python, Golang, M3U Playlists, Nginx proxy rules) for ZEE5 live channels, video tokens, and asset playback APIs.

Technical guidelines:
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
          model: "gemini-3.7-flash",
          contents,
          config: {
            systemInstruction,
            temperature: 0.3
          }
        });

        const reply = response.text || generateFallbackResponse(message);
        return res.status(200).json({ reply });
      } catch (geminiError: any) {
        console.warn("Gemini API call warning, using fallback response:", geminiError.message);
        const fallback = generateFallbackResponse(message);
        return res.status(200).json({ reply: fallback });
      }
    }

    // If GEMINI_API_KEY is not set (e.g. initial Vercel deploy without env secrets)
    const reply = generateFallbackResponse(message);
    return res.status(200).json({ reply });
  } catch (err: any) {
    console.error("Assistant chat error:", err);
    return res.status(200).json({
      reply: generateFallbackResponse(req.body?.message || "ZEE5 integration help")
    });
  }
}
