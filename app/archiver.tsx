"use client";

import { useState, useMemo, lazy, Suspense } from "react";
import SearchBar from "./searchbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

const MonacoEditor = lazy(() =>
  import("@monaco-editor/react").then((m) => ({ default: m.default }))
);

function getTitle(html: string, url: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.trim() || new URL(url).pathname;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Archiver() {
  const [data, setData] = useState<any[] | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const pages = (data || []).filter((p: any) => p?.url);
  const current = pages[selectedIdx];

  const content = current?.content || "";
  const contentSize = useMemo(
    () => (content ? new Blob([content]).size : 0),
    [content]
  );
  const charCount = content.length;

  const copyContent = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadCurrent = () => {
    const slug = current.url.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
    downloadBlob(content, `${slug}.html`, "text/html");
  };

  const exportAll = () => {
    const ts = new Date().toISOString().slice(0, 10);
    const combined = pages
      .map((p: any) => `<!-- ${p.url} -->\n${p.content || ""}`)
      .join("\n\n");
    downloadBlob(combined, `archive-${ts}.html`, "text/html");
  };

  return (
    <div className="flex flex-col h-screen">
      <SearchBar setDataValues={setData} />
      {pages.length > 0 && current ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Page List Sidebar */}
          <div className="w-64 border-r flex flex-col shrink-0">
            <div className="px-3 py-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>
                {pages.length} page{pages.length !== 1 ? "s" : ""} crawled
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px]"
                onClick={exportAll}
              >
                Export All
              </Button>
            </div>
            <div className="overflow-auto flex-1">
              {pages.map((p: any, i: number) => {
                const title = getTitle(p.content || "", p.url);
                const size = new Blob([p.content || ""]).size;
                const status = p.status || 200;
                return (
                  <button
                    key={i}
                    className={`w-full text-left px-3 py-2.5 border-b last:border-b-0 hover:bg-muted/30 transition-colors ${
                      selectedIdx === i
                        ? "bg-muted/50 border-l-2 border-l-[#3bde77]"
                        : ""
                    }`}
                    onClick={() => setSelectedIdx(i)}
                  >
                    <p className="text-xs font-medium truncate">{title}</p>
                    <p className="text-[10px] text-muted-foreground truncate font-mono mt-0.5">
                      {p.url}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0"
                      >
                        {formatSize(size)}
                      </Badge>
                      <Badge
                        variant={status >= 400 ? "destructive" : "outline"}
                        className="text-[9px] px-1 py-0"
                      >
                        {status}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/20">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{formatSize(contentSize)}</span>
                <span>{charCount.toLocaleString()} chars</span>
              </div>
              <div className="flex-1" />
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={copyContent}
              >
                {copied ? (
                  <>
                    <svg
                      className="w-3 h-3 mr-1 text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Copied
                  </>
                ) : (
                  "Copy"
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={downloadCurrent}
              >
                Download
              </Button>
            </div>

            {/* Monaco Editor */}
            <div className="flex-1">
              <Suspense
                fallback={
                  <div className="p-4 text-muted-foreground text-sm">
                    Loading editor...
                  </div>
                }
              >
                <MonacoEditor
                  height="100%"
                  language="html"
                  value={content}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    wordWrap: "on",
                    fontSize: 12,
                  }}
                />
              </Suspense>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 text-center space-y-4">
          <svg
            height={64}
            width={64}
            viewBox="0 0 36 34"
            xmlns="http://www.w3.org/2000/svg"
            className="fill-[#3bde77] opacity-30"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M9.13883 7.06589V0.164429L13.0938 0.164429V6.175L14.5178 7.4346C15.577 6.68656 16.7337 6.27495 17.945 6.27495C19.1731 6.27495 20.3451 6.69807 21.4163 7.46593L22.8757 6.175V0.164429L26.8307 0.164429V7.06589V7.95679L26.1634 8.54706L24.0775 10.3922C24.3436 10.8108 24.5958 11.2563 24.8327 11.7262L26.0467 11.4215L28.6971 8.08749L31.793 10.5487L28.7257 14.407L28.3089 14.9313L27.6592 15.0944L26.2418 15.4502C26.3124 15.7082 26.3793 15.9701 26.4422 16.2355L28.653 16.6566L29.092 16.7402L29.4524 17.0045L35.3849 21.355L33.0461 24.5444L27.474 20.4581L27.0719 20.3816C27.1214 21.0613 27.147 21.7543 27.147 22.4577C27.147 22.5398 27.1466 22.6214 27.1459 22.7024L29.5889 23.7911L30.3219 24.1177L30.62 24.8629L33.6873 32.5312L30.0152 34L27.246 27.0769L26.7298 26.8469C25.5612 32.2432 22.0701 33.8808 17.945 33.8808C13.8382 33.8808 10.3598 32.2577 9.17593 26.9185L8.82034 27.0769L6.05109 34L2.37897 32.5312L5.44629 24.8629L5.74435 24.1177L6.47743 23.7911L8.74487 22.7806C8.74366 22.6739 8.74305 22.5663 8.74305 22.4577C8.74305 21.7616 8.76804 21.0758 8.81654 20.4028L8.52606 20.4581L2.95395 24.5444L0.615112 21.355L6.54761 17.0045L6.908 16.7402L7.34701 16.6566L9.44264 16.2575C9.50917 15.9756 9.5801 15.6978 9.65528 15.4242L8.34123 15.0944L7.69155 14.9313L7.27471 14.407L4.20739 10.5487L7.30328 8.08749L9.95376 11.4215L11.0697 11.7016C11.3115 11.2239 11.5692 10.7716 11.8412 10.3473L9.80612 8.54706L9.13883 7.95679V7.06589Z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-muted-foreground">
            Spider Archiver
          </h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Crawl any website and archive the results locally. Browse pages,
            inspect source HTML, copy content, or download individual pages and
            full archives.
          </p>
        </div>
      )}
      <Toaster />
    </div>
  );
}
