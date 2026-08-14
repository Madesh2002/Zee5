import React, { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, RefreshCw, Copy, Check, Zap, AlertCircle } from "lucide-react";
import { safeFetchJson } from "../utils/apiClient";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

export const AiAssistant: React.FC<{ defaultChannelId?: string }> = ({ defaultChannelId = "0-9-zeetvhd" }) => {
  const initialWelcomeMsg = "Hello! I am your ZEE5 & IPTV Developer AI Assistant.\n\nI can help you:\n- Write, debug, or optimize PHP, cURL, Node.js, Python, or Golang scripts to extract ZEE5 stream tokens (.m3u8).\n- Configure user_ip / X-Forwarded-For headers to bypass host IP restrictions.\n- Build custom M3U IPTV Playlists for Tivimate, OTT Navigator, or VLC.\n- Troubleshoot token authentication, x-access-token, x-dd-token, or X-Z5-Guest-Token.\n\nHow can I help with your ZEE5 integration today?";

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      text: initialWelcomeMsg,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setLoading(true);
    setError(null);

    try {
      const historyPayload = messages
        .filter((m) => m.id !== "welcome-1")
        .map((m) => ({
          role: m.role,
          text: m.text
        }));

      // Attempt primary and fallback endpoints (handles Vercel rewrite variations)
      const endpoints = ["/api/assistant/chat", "/api/assistant-chat", "/api/chat"];
      let responseReply: string | null = null;
      let lastErrMsg = "";

      for (const endpoint of endpoints) {
        try {
          const res = await safeFetchJson<{ reply?: string; error?: string }>(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: query,
              history: historyPayload
            })
          });

          if (res.ok && res.data?.reply) {
            responseReply = res.data.reply;
            break;
          } else if (res.status === 405 || res.status === 404) {
            // Try next endpoint or GET query format
            lastErrMsg = res.error || `HTTP ${res.status}`;
            continue;
          } else if (res.data?.reply) {
            responseReply = res.data.reply;
            break;
          } else {
            lastErrMsg = res.data?.error || res.error || "Unexpected response";
          }
        } catch (e: any) {
          lastErrMsg = e.message;
        }
      }

      // If POST was blocked by 405 (e.g. static rewrite), try GET fallback
      if (!responseReply) {
        try {
          const getRes = await safeFetchJson<{ reply?: string }>(
            `/api/assistant/chat?message=${encodeURIComponent(query)}`
          );
          if (getRes.ok && getRes.data?.reply) {
            responseReply = getRes.data.reply;
          }
        } catch {}
      }

      if (responseReply) {
        const botMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: responseReply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        const errText = lastErrMsg || "Failed to receive response from AI Assistant.";
        setError(errText);
      }
    } catch (err: any) {
      setError(`Network connection failure: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    `Write a complete PHP script to extract ZEE5 channel ${defaultChannelId}`,
    `How to forward user IP (X-Forwarded-For) in Python requests?`,
    `Generate an M3U IPTV playlist format with user-agent for Tivimate`,
    `Explain how ZEE5 x-access-token and x-dd-token rotation works`
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 flex flex-col h-[650px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-sky-500/20 ring-1 ring-sky-400/30">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-100 text-sm sm:text-base flex items-center gap-1.5">
              <span>ZEE5 Developer AI Assistant</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Gemini 3.7
              </span>
            </h3>
            <p className="text-xs text-slate-400">Ask questions, generate PHP/Node/cURL scripts, or debug IPTV token flows</p>
          </div>
        </div>

        <button
          onClick={() => setMessages([messages[0]])}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1"
          title="Clear Conversation"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset Chat</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1.5 custom-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} space-y-1`}
          >
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono px-1">
              <span>{msg.role === "user" ? "You" : "ZEE5 AI Assistant"}</span>
              <span>•</span>
              <span>{msg.timestamp}</span>
            </div>

            <div
              className={`p-3.5 rounded-2xl max-w-[92%] sm:max-w-[85%] text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-sky-600 text-white font-medium rounded-tr-none shadow-md"
                  : "bg-slate-950/90 text-slate-200 border border-slate-800 rounded-tl-none shadow-inner"
              }`}
            >
              <div className="whitespace-pre-wrap break-words font-sans">
                {msg.text}
              </div>

              {msg.role === "assistant" && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-sky-400" />
                    Verified Developer AI Solution
                  </span>
                  <button
                    onClick={() => copyToClipboard(msg.text, msg.id)}
                    className="hover:text-slate-200 text-[10px] font-semibold flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800"
                  >
                    {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === msg.id ? "Copied" : "Copy Response"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-3.5 bg-slate-950/90 border border-slate-800 rounded-2xl max-w-xs text-xs text-slate-400 animate-pulse">
            <Bot className="w-4 h-4 text-sky-400 animate-spin" />
            <span>Generating ZEE5 code solution...</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-950/80 border border-rose-800/80 text-rose-300 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Suggestions */}
      {messages.length <= 2 && (
        <div className="space-y-1.5 shrink-0 pt-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            Suggested Quick Questions:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                className="text-[11px] bg-slate-950 hover:bg-slate-800 text-sky-300 border border-slate-800 hover:border-sky-500/50 px-2.5 py-1 rounded-lg text-left transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 pt-2 border-t border-slate-800/80 shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI for PHP scripts, cURL commands, IPTV fixes..."
          disabled={loading}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-sky-950 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>
      </form>
    </div>
  );
};
