import React, { useState } from "react";
import { Copy, Check, Terminal, Globe, ExternalLink, Play, RefreshCw, Layers, Bot, Sparkles } from "lucide-react";
import { AiAssistant } from "./AiAssistant";
import { safeFetchJson } from "../utils/apiClient";

interface ApiSnippetModalProps {
  channelId: string;
}

export const ApiSnippetModal: React.FC<ApiSnippetModalProps> = ({ channelId }) => {
  const [activeLang, setActiveLang] = useState<"php" | "curl" | "node" | "python" | "m3u">("php");
  const [copied, setCopied] = useState(false);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const targetId = channelId || "0-9-zeemarathi";
  const apiEndpoint = `${baseUrl}/api/playback?id=${targetId}`;

  const phpSnippet = `<?php
header('Content-Type: application/json; charset=utf-8');

if (!isset($_GET['id']) || empty(trim($_GET['id']))) {
    http_response_code(400);
    die(json_encode(["error" => "Missing 'id' parameter."]));
}

$channelId = trim($_GET['id']);
$url = "${baseUrl}/api/playback?id=" . urlencode($channelId);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
$response = curl_exec($ch);
curl_close($ch);

echo $response;
?>`;

  const curlSnippet = `curl -X GET "${apiEndpoint}" \\
  -H "accept: application/json"`;

  const nodeSnippet = `// Node.js / Express Proxy / Browser Fetch
async function fetchChannelPlayback(channelId) {
  const endpoint = \`${baseUrl}/api/playback?id=\${encodeURIComponent(channelId)}\`;
  const response = await fetch(endpoint);
  const data = await response.json();
  console.log("Extracted Stream Data:", data);
  return data;
}

fetchChannelPlayback("${targetId}");`;

  const pythonSnippet = `# Python 3 requests integration
import requests

def get_zee5_stream(channel_id):
    url = f"${baseUrl}/api/playback?id={channel_id}"
    response = requests.get(url, timeout=10)
    if response.status_code == 200:
        data = response.json()
        print("Video Token Stream URL:", data.get("video_token"))
        return data
    else:
        print("Error:", response.text)

get_zee5_stream("${targetId}")`;

  const m3uSnippet = `#EXTM3U name="ZEE5 Live IPTV" x-tvg-url=""

# --- OPTION 1: FULL VIDEO TOKEN M3U PLAYLIST API ENDPOINT ---
# Server dynamically resolves full signed video_tokens for all channels:
# ${baseUrl}/api/playlist.m3u?mode=full

# --- OPTION 2: DIRECT SINGLE CHANNEL STREAM REDIRECT (.m3u8) ---
#EXTINF:-1 tvg-id="${targetId}" tvg-name="ZEE5 Channel" group-title="Entertainment",ZEE5 Channel
#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64)
#EXTVLCOPT:http-referrer=https://www.zee5.com/
${baseUrl}/api/live/${targetId}.m3u8`;

  const getCode = () => {
    switch (activeLang) {
      case "php":
        return phpSnippet;
      case "curl":
        return curlSnippet;
      case "node":
        return nodeSnippet;
      case "python":
        return pythonSnippet;
      case "m3u":
        return m3uSnippet;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runLiveTest = async () => {
    setTesting(true);
    setTestOutput(null);
    try {
      const res = await safeFetchJson(`/api/playback?id=${targetId}`);
      if (res.data) {
        setTestOutput(JSON.stringify(res.data, null, 2));
      } else {
        setTestOutput(res.error || res.rawText || "No response received");
      }
    } catch (err: any) {
      setTestOutput(`Execution Error: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-5 shadow-2xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            Integration Code Snippets & Direct Endpoint
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Integrate this API endpoint directly into your PHP, cURL, Node.js, Python, or IPTV M3U playlist setups.
          </p>
        </div>

        <a
          href={apiEndpoint}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-950 hover:bg-sky-900 text-sky-300 text-xs font-mono font-semibold rounded-xl border border-sky-800/60 transition-all self-start sm:self-auto shadow-md"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Open API Endpoint JSON</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Code Language Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800/80 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveLang("php")}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all shrink-0 ${
              activeLang === "php" ? "bg-amber-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            PHP Script
          </button>
          <button
            onClick={() => setActiveLang("curl")}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all shrink-0 ${
              activeLang === "curl" ? "bg-amber-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            cURL Command
          </button>
          <button
            onClick={() => setActiveLang("node")}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all shrink-0 ${
              activeLang === "node" ? "bg-amber-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Node.js / JS
          </button>
          <button
            onClick={() => setActiveLang("python")}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all shrink-0 ${
              activeLang === "python" ? "bg-amber-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Python
          </button>
          <button
            onClick={() => setActiveLang("m3u")}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all shrink-0 ${
              activeLang === "m3u" ? "bg-amber-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            IPTV M3U
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={runLiveTest}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950"
          >
            {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>{testing ? "Executing..." : "Test Run Output"}</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700/60 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Area */}
      <pre className="p-4 bg-slate-950 border border-slate-800 rounded-2xl font-mono text-xs text-amber-300/90 overflow-x-auto max-h-64 shadow-inner custom-scrollbar">
        <code>{getCode()}</code>
      </pre>

      {/* Live Test Run Response Box */}
      {testOutput && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Layers className="w-4 h-4" />
              Live Endpoint Test Response Output (`/api/playback?id=${targetId}`)
            </span>
            <button
              onClick={() => setTestOutput(null)}
              className="text-slate-500 hover:text-slate-300 text-[11px]"
            >
              Close Output
            </button>
          </div>
          <pre className="p-3 bg-slate-900 rounded-xl font-mono text-[11px] text-slate-200 overflow-x-auto max-h-48 border border-slate-800/80 custom-scrollbar">
            <code>{testOutput}</code>
          </pre>
        </div>
      )}

      {/* Integrated AI Assistant Section */}
      <div className="pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-lg text-white shadow-md">
              <Bot className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <span>AI Integration Assistant</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-200 border border-sky-400/30">Gemini</span>
              </h4>
              <p className="text-[11px] text-slate-400">Ask AI to generate custom code snippets, debug headers, or script integrations.</p>
            </div>
          </div>
        </div>

        <AiAssistant defaultChannelId={targetId} />
      </div>
    </div>
  );
};
