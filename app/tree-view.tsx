"use client";

import useResizeObserver from "use-resize-observer";
import { Tree } from "react-arborist";
import { Dispatch, useMemo, useState } from "react";
import { Node, Entry } from "../components/tree/node";
import {
  VscSearch,
  VscFolder,
  VscTrash,
  VscChevronLeft,
} from "react-icons/vsc";
import { type DomainInfo, formatBytes, timeAgo } from "@/lib/storage";

let id = 1;

const nextId = () => (id++).toString();
const file = (name: string, dataIndex: number) => ({
  name,
  id: nextId(),
  dataIndex,
});
const folder = (name: string, dataIndex: number, ...children: Entry[]) => ({
  name,
  id: nextId(),
  children,
  dataIndex,
});

type SpiderResponseChunk = {
  url: string;
  content: string;
  error: string;
  status: number;
}[];

const processData = (data: SpiderResponseChunk) => {
  const structure: any[] = [];

  if (data && Array.isArray(data)) {
    for (const [index, item] of data.entries()) {
      const { url } = item;

      if (!url) {
        continue;
      }

      const parts = url.replace(/^https?:\/\//, "").split("/");
      let currentLevel = structure;

      let idx = 0;

      for (const part of parts) {
        let existing = currentLevel.find((e) => e.name === part);

        if (!existing) {
          existing =
            idx === parts.length - 1 ? file(part, index) : folder(part, index);
          currentLevel.push(existing);
        }

        if (!existing.children) {
          existing.children = [];
        }

        currentLevel = existing.children;
        idx++;
      }
    }
  }

  return structure;
};

const sortChildren = (node: Entry): Entry => {
  if (!node.children) return node;
  const copy = [...node.children];
  copy.sort((a, b) => {
    if (!!a.children && !b.children) return -1;
    if (!!b.children && !a.children) return 1;
    return a.name < b.name ? -1 : 1;
  });
  const children = copy.map(sortChildren);
  return { ...node, children };
};

const treeSort = (data: Entry[]) => data.map(sortChildren);

const DirectoryTreeView = ({
  data,
  setSelectedFile,
  savedDomains,
  onLoadDomain,
  onClearDomain,
  onClearAll,
  onBack,
}: {
  data: SpiderResponseChunk;
  setSelectedFile: Dispatch<any>;
  savedDomains: DomainInfo[];
  onLoadDomain: (domain: string) => void;
  onClearDomain: (domain: string) => void;
  onClearAll: () => void;
  onBack: () => void;
}) => {
  const { ref, width, height } = useResizeObserver();
  const [filter, setFilter] = useState("");

  const filteredData = useMemo(() => {
    if (!filter || !data) return data;
    return data.filter((item: any) =>
      item.url?.toLowerCase().includes(filter.toLowerCase())
    );
  }, [data, filter]);

  const structure = useMemo(() => processData(filteredData), [filteredData]);
  const sortedData = useMemo(() => treeSort(structure), [structure]);

  const handleFileClick = (file: Entry) => {
    file && setSelectedFile(filteredData[file?.dataIndex || 0]);
  };

  const hasData = data && Array.isArray(data) && data.length > 0;

  const filteredDomains = useMemo(() => {
    if (!filter || !savedDomains) return savedDomains;
    return savedDomains.filter((d) =>
      d.domain.toLowerCase().includes(filter.toLowerCase())
    );
  }, [savedDomains, filter]);

  const totalSize = useMemo(
    () => savedDomains.reduce((s, d) => s + d.totalSize, 0),
    [savedDomains]
  );

  return (
    <aside className="h-full flex flex-col md:border-r">
      {/* Filter input */}
      <div className="px-2 py-1.5 border-b shrink-0">
        <div className="flex items-center gap-1.5">
          {hasData && (
            <button
              onClick={() => {
                onBack();
                setFilter("");
              }}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground shrink-0"
              title="Back to saved sites"
            >
              <VscChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="relative flex-1">
            <VscSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input
              type="text"
              placeholder={hasData ? "Filter pages..." : "Search saved sites..."}
              className="w-full bg-secondary/50 border border-border rounded px-2 py-1 pl-7 text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {hasData ? (
        /* Tree view when data is loaded */
        <div ref={ref} className="flex-1 min-h-0">
          <Tree
            data={sortedData}
            width={width}
            height={height}
            className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-background"
          >
            {(props) => <Node {...props} onFileClick={handleFileClick} />}
          </Tree>
        </div>
      ) : (
        /* Saved domains list when no data */
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-background">
          <div className="px-2 py-2">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">
              Saved Sites
            </h3>

            {filteredDomains.length > 0 ? (
              <div className="flex flex-col gap-0.5">
                {filteredDomains.map((d) => (
                  <button
                    key={d.domain}
                    onClick={() => onLoadDomain(d.domain)}
                    className="w-full text-left px-2 py-2 rounded hover:bg-secondary/80 group flex items-center gap-2 transition-colors"
                  >
                    <VscFolder className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs truncate">{d.domain}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {d.pageCount} page{d.pageCount !== 1 ? "s" : ""}{" "}
                        <span className="text-muted-foreground/50">·</span>{" "}
                        {formatBytes(d.totalSize)}{" "}
                        <span className="text-muted-foreground/50">·</span>{" "}
                        {timeAgo(d.lastCrawled)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearDomain(d.domain);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 transition-opacity"
                      title="Remove saved site"
                    >
                      <VscTrash className="w-3 h-3 text-destructive" />
                    </button>
                  </button>
                ))}
              </div>
            ) : savedDomains.length > 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">
                No matches found.
              </p>
            ) : (
              <div className="py-6 text-center">
                <VscFolder className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  No saved sites yet.
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  Crawl a website to get started.
                </p>
              </div>
            )}
          </div>

          {/* Storage footer */}
          {savedDomains.length > 0 && (
            <div className="px-3 py-2 border-t mt-auto">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>
                  {formatBytes(totalSize)}{" "}
                  <span className="text-muted-foreground/50">/ 50 MB</span>
                </span>
                <button
                  onClick={onClearAll}
                  className="hover:text-destructive transition-colors"
                >
                  Clear All
                </button>
              </div>
              {/* Storage bar */}
              <div className="mt-1 h-1 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/40 transition-all"
                  style={{
                    width: `${Math.min((totalSize / (50 * 1024 * 1024)) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

export default DirectoryTreeView;
