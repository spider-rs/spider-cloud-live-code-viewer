"use client";

import { useState, useRef, useEffect } from "react";
import { VscExtensions } from "react-icons/vsc";
import { Button } from "@/components/ui/button";

const CURRENT_APP = "archiver";

const APPS = [
  { id: "archiver", name: "Archiver", desc: "Archive & view page source", subdomain: "archiver" },
  { id: "dead-link-checker", name: "Dead Link Checker", desc: "Find broken links", subdomain: "dead-link-checker" },
  { id: "a11y-checker", name: "A11y Checker", desc: "Audit accessibility issues", subdomain: "a11y-checker" },
  { id: "seo-auditor", name: "SEO Auditor", desc: "Audit SEO issues", subdomain: "seo-auditor" },
  { id: "content-extractor", name: "Content Extractor", desc: "Extract structured content", subdomain: "content-extractor" },
  { id: "knowledge-base", name: "Knowledge Base", desc: "Build a searchable knowledge base", subdomain: "knowledge-base" },
  { id: "perf-runner", name: "Perf Runner", desc: "Measure page performance", subdomain: "perf-runner" },
  { id: "content-translator", name: "Content Translator", desc: "Translate page content", subdomain: "content-translator" },
  { id: "diff-monitor", name: "Diff Monitor", desc: "Track page changes over time", subdomain: "diff-monitor" },
  { id: "sitemap-generator", name: "Sitemap Generator", desc: "Generate XML sitemaps", subdomain: "sitemap-generator" },
  { id: "link-graph", name: "Link Graph", desc: "Visualize site link structure", subdomain: "link-graph" },
  { id: "tech-detector", name: "Tech Detector", desc: "Detect website tech stacks", subdomain: "tech-detector" },
  { id: "schema-validator", name: "Schema Validator", desc: "Validate structured data", subdomain: "schema-validator" },
  { id: "security-scanner", name: "Security Scanner", desc: "Scan security headers", subdomain: "security-scanner" },
] as const;

const AppSwitcher = ({ currentUrl }: { currentUrl: string }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const buildHref = (subdomain: string) => {
    const base = `https://${subdomain}.spider.cloud`;
    return currentUrl ? `${base}?url=${encodeURIComponent(currentUrl)}` : base;
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
        aria-label="Switch app"
      >
        <VscExtensions className="w-4 h-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-64 rounded-lg border bg-popover p-1 shadow-md">
          {APPS.map((app) => {
            const isCurrent = app.id === CURRENT_APP;
            return (
              <a
                key={app.id}
                href={isCurrent ? undefined : buildHref(app.subdomain)}
                onClick={isCurrent ? (e) => { e.preventDefault(); setOpen(false); } : undefined}
                className={`flex flex-col gap-0.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  isCurrent
                    ? "bg-[#3bde77]/10 text-[#3bde77]"
                    : "text-popover-foreground hover:bg-muted"
                }`}
              >
                <span className="font-medium">{app.name}</span>
                <span className="text-xs text-muted-foreground">{app.desc}</span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AppSwitcher;
