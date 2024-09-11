"use client";

import useResizeObserver from "use-resize-observer";
import { Tree } from "react-arborist";
import { Dispatch, useMemo } from "react";
import { Node, Entry } from "../components/tree/node";

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

      let currentLevel = structure;

      let existing = currentLevel.find((e) => e.name === url);

      if (!existing) {
        existing = file(url, index);
        currentLevel.push(existing);
      }

      if (!existing.children) {
        existing.children = [];
      }

      currentLevel = existing.children;
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
    <aside ref={ref} className="md:border-r py-2 h-full relative">
      <Tree
        data={sortedData}
        width={width}
        height={height}
        className="overflow-hidden scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-700 dark:scrollbar-track-gray-900"
      >
        {(props) => <Node {...props} onFileClick={handleFileClick} />}
      </Tree>
    </aside>
  );
};

export default DirectoryTreeView;
