"use client";

import { useState, useEffect, useCallback } from "react";
import IDE from "./ide";
import TreeView from "./tree-view";
import SearchBar from "./searchbar";
import { Toaster } from "@/components/ui/toaster";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  getPagesByDomain,
  getSavedDomains,
  clearDomain,
  clearAll,
  type DomainInfo,
} from "@/lib/storage";

export default function Editor() {
  const [dataValues, setDataValues] = useState<any>();
  const [selectedFile, setSelectedFile] = useState<any>();
  const [savedDomains, setSavedDomains] = useState<DomainInfo[]>([]);

  const refreshDomains = useCallback(async () => {
    try {
      const domains = await getSavedDomains();
      setSavedDomains(domains);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    refreshDomains();
  }, [refreshDomains]);

  const loadDomain = useCallback(async (domain: string) => {
    try {
      const pages = await getPagesByDomain(domain);
      setDataValues(
        pages.map((p) => ({
          url: p.url,
          content: p.content,
          error: p.error,
          status: p.status,
        }))
      );
      setSelectedFile(undefined);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleClearDomain = useCallback(
    async (domain: string) => {
      try {
        await clearDomain(domain);
        await refreshDomains();
      } catch (e) {
        console.error(e);
      }
    },
    [refreshDomains]
  );

  const handleClearAll = useCallback(async () => {
    try {
      await clearAll();
      setSavedDomains([]);
      setDataValues(undefined);
      setSelectedFile(undefined);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleBack = useCallback(() => {
    setDataValues(undefined);
    setSelectedFile(undefined);
  }, []);

  return (
    <>
      <SearchBar
        setDataValues={setDataValues}
        onSaveComplete={refreshDomains}
      />
      <ResizablePanelGroup
        direction="horizontal"
        className="gap-2 w-full h-full flex-1"
      >
        <ResizablePanel defaultSize={25}>
          <TreeView
            data={dataValues}
            setSelectedFile={setSelectedFile}
            savedDomains={savedDomains}
            onLoadDomain={loadDomain}
            onClearDomain={handleClearDomain}
            onClearAll={handleClearAll}
            onBack={handleBack}
          />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={75}>
          <IDE file={selectedFile} />
        </ResizablePanel>
      </ResizablePanelGroup>
      <Toaster />
    </>
  );
}
