import React, { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, RefreshCw, Copy, Check, Zap, AlertCircle, Brain, ChevronDown, ChevronRight } from "lucide-react";
import { safeFetchJson } from "../utils/apiClient";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  thought?: string;
  model?: string;
  timestamp: string;
}

export const AiAssistant: React.FC<{ defaultChannelId?: string }> = ({ defaultChannelId = "0-9-zeetvhd" }) => {
  const initialWelcomeMsg = "Hello! I am your Free ZEE5 & IPTV Developer AI Assistant with Deep Thought Reasoning (100% Free - No API Key Required).\n\nI can help you:\n- Write, debug, or optimize PHP, cURL, Node.js, Python, or Golang scripts to extract ZEE5 stream tokens (.m3u8).\n- Configure user_ip / X-Forwarded-For headers to bypass host IP restrictions.\n- Build custom M3U IPTV Playlists for Tivimate, OTT Navigator, or VLC.\n- Troubleshoot token authentication, x-access-token, x-dd-token, or X-Z5-Guest-Token.\n\nHow can I help with your ZEE5 integration today?";

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      text: initialWelcomeMsg,
      thought: "Initialized free developer reasoning assistant for ZEE5 token extraction, IPTV integration, and cross-platform playback.",
      model: "DeepSeek-R1 (Free Reasoning Engine)",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);

  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({ "welcome-1": false });
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

  const toggleThought = (id: string) => {
    setExpandedThoughts((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

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
      let responseThought: string | undefined = undefined;
      let responseModel: string | undefined = undefined;
      let lastErrMsg = "";

      for (const endpoint of endpoints) {
        try {
          const res = await safeFetchJson<{ reply?: string; thought?: string; model?: string; error?: string }>(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: query,
              history: historyPayload
            })
          });

          if (res.ok && res.data?.reply) {
            responseReply = res.data.reply;
            responseThought = res.data.thought;
            responseModel = res.data.model;
            break;
          } else if (res.status === 405 || res.status === 404) {
            lastErrMsg = res.error || `HTTP ${res.status}`;
            continue;
          } else if (res.data?.reply) {
            responseReply = res.data.reply;
            responseThought = res.data.thought;
            responseModel = res.data.model;
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
          const getRes = await safeFetchJson<{ reply?: string; thought?: string; model?: string }>(
            `/api/assistant/chat?message=${encodeURIComponent(query)}`
          );
          if (getRes.ok && getRes.data?.reply) {
            responseReply = getRes.data.reply;
            responseThought = getRes.data.thought;
            responseModel = getRes.data.model;
          }
        } catch {}
      }

      if (responseReply) {
        const newBotId = `assistant-${Date.now()}`;
        const botMsg: ChatMessage = {
          id: newBotId,
          role: "assistant",
          text: responseReply,
          thought: responseThought,
          model: responseModel || "DeepSeek-R1 (Free Reasoning Engine)",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };
        setMessages((prev) => [...prev, botMsg]);
        if (responseThought) {
          setExpandedThoughts((prev) => ({ ...prev, [newBotId]: true }));
        }
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
    <div className="bg-slate-900/90 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 flex flex-col h-[680px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/30">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-100 text-sm sm:text-base flex items-center gap-1.5">
              <span>ZEE5 Developer AI Assistant</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                100% Free AI • Deep Thought
              </span>
            </h3>
            <p className="text-xs text-slate-400">DeepSeek-R1 reasoning engine • No API key required • Vercel ready</p>
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
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} space-y-1.5`}
          >
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono px-1">
              <span>{msg.role === "user" ? "You" : (msg.model || "Free AI Assistant")}</span>
              <span>•</span>
              <span>{msg.timestamp}</span>
            </div>

            <div
              className={`p-4 rounded-2xl max-w-[95%] sm:max-w-[88%] text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-sky-600 text-white font-medium rounded-tr-none shadow-md"
                  : "bg-slate-950/90 text-slate-200 border border-slate-800 rounded-tl-none shadow-inner"
              }`}
            >
              {/* Chain-of-Thought Reasoning Box */}
              {msg.role === "assistant" && msg.thought && (
                <div className="mb-3 rounded-xl border border-indigo-500/20 bg-indigo-950/30 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleThought(msg.id)}
                    className="w-full px-3 py-2 text-left flex items-center justify-between text-[11px] font-semibold text-indigo-300 hover:bg-indigo-900/20 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Thinking Process & Reasoning</span>
                    </span>
                    {expandedThoughts[msg.id] ? (
                      <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                  </button>

                  {expandedThoughts[msg.id] && (
                    <div className="px-3 pb-3 pt-1 text-[11px] text-slate-400 font-mono border-t border-indigo-500/10 whitespace-pre-wrap leading-relaxed bg-black/20">
                      {msg.thought}
                    </div>
                  )}
                </div>
              )}

              {/* Main Reply */}
              <div className="whitespace-pre-wrap break-words font-sans">
                {msg.text}
              </div>

              {msg.role === "assistant" && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    Free Developer Reasoning
                  </span>
                  <button
                    onClick={() => copyToClipboard(msg.text, msg.id)}
                    className="hover:text-slate-200 text-[10px] font-semibold flex items-center gap-1 bg-slate-900 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-800 transition-colors"
                  >
                    {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === msg.id ? "Copied" : "Copy Solution"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2.5 p-3.5 bg-slate-950/90 border border-slate-800 rounded-2xl max-w-sm text-xs text-slate-300 animate-pulse">
            <Brain className="w-4 h-4 text-emerald-400 animate-spin" />
            <div className="flex flex-col">
              <span className="font-semibold text-emerald-400">Thinking & Analyzing Token Flow...</span>
              <span className="text-[10px] text-slate-500">Formulating optimal script with Indian IP spoofing</span>
            </div>
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
          placeholder="Ask Free AI for PHP scripts, Python geo-bypass, M3U headers..."
          disabled={loading}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ask Free AI</span>
        </button>
      </form>
    </div>
  );
};
