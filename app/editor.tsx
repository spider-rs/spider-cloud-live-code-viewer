"use client";

import { useState } from "react";
import IDE from "./ide";
import TreeView from "./tree-view";
import SearchBar from "./searchbar";
import { Toaster } from "@/components/ui/toaster";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function Editor() {
  const [dataValues, setDataValues] = useState<any>();
  const [selectedFile, setSelectedFile] = useState<any>();

  return (
    <>
      <SearchBar setDataValues={setDataValues} />
      <ResizablePanelGroup
        direction="horizontal"
        className="gap-2 w-full h-full flex-1"
      >
        <ResizablePanel defaultSize={25}>
          <TreeView data={dataValues} setSelectedFile={setSelectedFile} />
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
