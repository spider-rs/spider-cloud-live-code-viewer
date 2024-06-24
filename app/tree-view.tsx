"use client";

import useResizeObserver from "use-resize-observer";
import { NodeRendererProps, Tree } from "react-arborist";
import { BiFolder, BiFile } from "react-icons/bi";

let id = 1;

type Entry = { name: string; id: string; children?: Entry[] };

const nextId = () => (id++).toString();
const file = (name: string) => ({ name, id: nextId() });
const folder = (name: string, ...children: Entry[]) => ({
  name,
  id: nextId(),
  children,
});

const structure = [
  folder(
    "src",
    file("index.ts"),
    folder(
      "lib",
      file("index.ts"),
      file("worker.ts"),
      file("utils.ts"),
      file("model.ts")
    ),
    folder(
      "ui",
      file("button.ts"),
      file("form.ts"),
      file("table.ts"),
      folder(
        "demo",
        file("welcome.ts"),
        file("example.ts"),
        file("container.ts")
      )
    )
  ),
];

function sortChildren(node: Entry): Entry {
  if (!node.children) return node;
  const copy = [...node.children];
  copy.sort((a, b) => {
    if (!!a.children && !b.children) return -1;
    if (!!b.children && !a.children) return 1;
    return a.name < b.name ? -1 : 1;
  });
  const children = copy.map(sortChildren);
  return { ...node, children };
}

function useTreeSort(data: Entry[]) {
  return data.map(sortChildren);
}

const DirectoryTreeView = () => {
  const { ref, width, height } = useResizeObserver();
  const data = useTreeSort(structure);

  return (
      <aside ref={ref}>
        <Tree
          data={data}
          width={width}
          height={height}
          indent={24}
          rowHeight={36}
          overscanCount={1}
          paddingTop={30}
          paddingBottom={10}
          padding={25}
        >
          {Node}
        </Tree>
      </aside>
  );
};

function Node({ node, style, dragHandle }: NodeRendererProps<Entry>) {
  const isLeafNode = node.isLeaf;
  const Icon = isLeafNode ? BiFile : BiFolder;

  return (
    <div
      className="flex gap-2 items-center"
      onClick={() => node.toggle()}
      style={style}
      ref={dragHandle}
    >
      <Icon />
      {node.data.name}
    </div>
  );
}

export default DirectoryTreeView;
