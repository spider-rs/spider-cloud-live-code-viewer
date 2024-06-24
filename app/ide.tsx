"use client";

import Editor from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import { type editor } from "monaco-editor";

type CrawlValue = {
  name?: string;
  language?: string;
  value?: string;
};

export default function IDE({files}: {files?: Record<string, CrawlValue>}) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [fileName, setFileName] = useState("script.js");

  const file = files ? files[fileName] : null;

  useEffect(() => {
    editorRef.current?.focus();
  }, [file?.name]);

  return (
    <div className="w-full h-full">
        <Editor
        height="90vh"
        theme=".vsdark"
        path={file?.name}
        className="w-full h-full max-w-[calc(100vw - 240px)]"
        defaultLanguage={file?.language || "html"}
        defaultValue={file?.value}
        onMount={(editor) => (editorRef.current = editor)}
      />
    </div>
  );
}
