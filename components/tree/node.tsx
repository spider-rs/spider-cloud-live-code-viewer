"use client";

import { memo } from "react";
import { NodeRendererProps } from "react-arborist";
import { VscFile, VscFolder } from "react-icons/vsc";

export type Entry = {
    name: string;
    id: string;
    children?: Entry[];
    dataIndex?: number;
  };

  
 const NodeWrapper = ({
    node,
    style,
    dragHandle,
    onFileClick,
  }: NodeRendererProps<Entry> & { onFileClick: (file: Entry) => void }) => {
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
          node.isOnlySelection ? " bg-blue-200 dark:bg-gray-800" : ""
        }`}
        onClick={handleClick}
        style={style}
        ref={dragHandle as (el: HTMLButtonElement | null) => void}
      >
        <Icon />
        {node.data.name || "index"}
      </button>
    );
  }

  export const Node = memo(NodeWrapper)