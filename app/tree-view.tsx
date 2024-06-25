"use client";

import useResizeObserver from "use-resize-observer";
import { NodeRendererProps, Tree } from "react-arborist";
import { Dispatch, useMemo } from "react";
import { VscFile, VscFolder } from "react-icons/vsc";

let id = 1;

type Entry = {
  name: string;
  id: string;
  children?: Entry[];
  dataIndex?: number;
};

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
}: {
  data: SpiderResponseChunk;
  setSelectedFile: Dispatch<any>;
}) => {
  const { ref, width, height } = useResizeObserver();
  const structure = useMemo(() => processData(data), [data]);
  const sortedData = useMemo(() => treeSort(structure), [structure]);

  const handleFileClick = (file: Entry) => {
    file && setSelectedFile(data[file?.dataIndex || 0]);
  };

  return (
    <aside ref={ref} className="md:border-r py-2 h-full">
      <Tree data={sortedData} width={width} height={height}>
        {(props) => <Node {...props} onFileClick={handleFileClick} />}
      </Tree>
    </aside>
  );
};

function Node({
  node,
  style,
  dragHandle,
  onFileClick,
}: NodeRendererProps<Entry> & { onFileClick: (file: Entry) => void }) {
  const isLeafNode =
    node.isLeaf || !node.children || node.children.length === 0;

  const Icon = isLeafNode ? VscFile : VscFolder;

  const handleClick = () => {
    node.data && onFileClick(node.data);
    node.toggle();
  };

  return (
    <button
      className={`flex w-full gap-2 items-center truncate text-sm${
        node.isOnlySelection ? " bg-blue-200" : ""
      }`}
      onClick={handleClick}
      style={style}
      ref={dragHandle as (el: HTMLButtonElement | null) => void}
    >
      <Icon />
      {node.data.name}
    </button>
  );
}

export default DirectoryTreeView;
