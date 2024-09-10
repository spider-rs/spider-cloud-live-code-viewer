"use client";

import Editor from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import { type editor } from "monaco-editor";

type CrawlValue = {
  error?: string;
  url?: string;
  content?: string;
};

export default function IDE({ file }: { file?: CrawlValue }) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    editorRef.current?.focus();
  }, [file?.url]);

  return (
    <div className="w-full h-full">
      <Editor
        height="100%"
        theme="vs-dark"
        path={file?.url}
        className="w-full h-full max-w-[calc(100vw - 240px)]"
        defaultLanguage={file?.url?.endsWith(".md") ? "markdown" : "html"}
        defaultValue={file?.content}
        onMount={(editor) => (editorRef.current = editor)}
        wrapperProps={{}}
      />
    </div>
  );
}
