import React, { useState } from "react";
import { Copy, Check, Download, Search, Maximize2, Minimize2, Code2 } from "lucide-react";

interface JsonViewerProps {
  data: any;
  title?: string;
  defaultExpanded?: boolean;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  title = "JSON Output",
  defaultExpanded = true
}) => {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"tree" | "raw">("tree");
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const jsonString = React.useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `channel-output-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderSyntaxHighlighted = (text: string) => {
    if (!text) return null;

    const lines = text.split("\n");
    const filteredLines = searchQuery
      ? lines.filter((l) => l.toLowerCase().includes(searchQuery.toLowerCase()))
      : lines;

    return (
      <pre className="font-mono text-xs leading-relaxed overflow-x-auto p-4 text-slate-200 bg-slate-950 rounded-b-xl select-text">
        <code>
          {filteredLines.map((line, idx) => {
            const formattedLine = line
              .replace(/("&quot;|")([^"]+)("&quot;|")(\s*:)/g, '<span class="text-sky-400 font-semibold">"$2"</span>$4')
              .replace(/:\s*("([^"]*)")/g, ': <span class="text-emerald-400">"$2"</span>')
              .replace(/:\s*(true|false)/g, ': <span class="text-purple-400 font-bold">$1</span>')
              .replace(/:\s*(null)/g, ': <span class="text-rose-400 font-bold">$1</span>')
              .replace(/:\s*(-?\d+\.?\d*)/g, ': <span class="text-amber-400">$1</span>');

            return (
              <div key={idx} className="hover:bg-slate-900/80 px-1 rounded flex">
                <span className="w-8 shrink-0 text-slate-600 text-right pr-3 select-none">{idx + 1}</span>
                <span dangerouslySetInnerHTML={{ __html: formattedLine }} />
              </div>
            );
          })}
        </code>
      </pre>
    );
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-sky-400" />
          <span className="font-mono text-xs font-semibold text-slate-200 tracking-wide uppercase">
            {title}
          </span>
          <span className="text-[10px] bg-sky-950 text-sky-300 border border-sky-800/50 px-2 py-0.5 rounded-full font-mono">
            {typeof data === "object" && data !== null ? `${Object.keys(data).length} keys` : "JSON"}
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Filter keys or values..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 rounded-md focus:outline-none focus:border-sky-500 w-36 focus:w-48 transition-all"
            />
          </div>

          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-0.5">
            <button
              onClick={() => setViewMode("tree")}
              className={`px-2 py-0.5 text-xs font-mono rounded ${
                viewMode === "tree" ? "bg-sky-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Tree
            </button>
            <button
              onClick={() => setViewMode("raw")}
              className={`px-2 py-0.5 text-xs font-mono rounded ${
                viewMode === "raw" ? "bg-sky-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Raw
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700/60 transition-colors"
            title="Copy JSON to Clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
            title="Download JSON File"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
            title={isExpanded ? "Collapse View" : "Expand View"}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* JSON Content Area */}
      {isExpanded && (
        <div className="max-h-[500px] overflow-auto">
          {viewMode === "raw" ? (
            <textarea
              readOnly
              value={jsonString}
              className="w-full h-80 p-4 bg-slate-950 text-emerald-400 font-mono text-xs focus:outline-none border-none resize-y"
            />
          ) : (
            renderSyntaxHighlighted(jsonString)
          )}
        </div>
      )}
    </div>
  );
};
