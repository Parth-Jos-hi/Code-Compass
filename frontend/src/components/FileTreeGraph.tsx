'use client';

import React, { useState, useMemo } from 'react';
import { CodeNode } from '@/services/api';
import { ChevronRightIcon, FolderIcon, FileCodeIcon } from 'lucide-react';

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children: TreeNode[];
  nodeData?: CodeNode;
}

interface FileTreeGraphProps {
  nodes: CodeNode[];
  selectedNode: CodeNode | null;
  onSelectNode: (node: CodeNode) => void;
}

export default function FileTreeGraph({
  nodes,
  selectedNode,
  onSelectNode,
}: FileTreeGraphProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Build tree structure from flat file paths
  const treeRoot = useMemo<TreeNode>(() => {
    const root: TreeNode = {
      name: 'root',
      path: '',
      type: 'folder',
      children: [],
    };

    // Sort nodes by path for consistent ordering
    const sortedNodes = [...nodes].sort((a, b) =>
      a.file_path.localeCompare(b.file_path)
    );

    // Build tree by parsing file paths
    sortedNodes.forEach((node) => {
      const parts = node.file_path.split('/').filter(p => p);
      let current = root;

      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        const currentPath = parts.slice(0, index + 1).join('/');

        let existing = current.children.find(
          (c) => c.name === part && c.path === currentPath
        );

        if (!existing) {
          existing = {
            name: part,
            path: currentPath,
            type: isFile ? 'file' : 'folder',
            children: [],
            nodeData: isFile ? node : undefined,
          };
          current.children.push(existing);
          // Sort children to keep folders first, then files
          current.children.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
        }

        current = existing;
      });
    });

    return root;
  }, [nodes]);

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const TreeNodeComponent = ({
    node,
    depth = 0,
  }: {
    node: TreeNode;
    depth?: number;
  }) => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected =
      selectedNode && node.nodeData?.id === selectedNode.id;

    return (
      <div key={node.path}>
        <div
          className={`flex items-center gap-2 px-2 py-1 cursor-pointer rounded transition-colors ${
            isSelected
              ? 'bg-blue-600 text-white'
              : 'hover:bg-gray-700 text-gray-200'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (node.type === 'folder') {
              toggleFolder(node.path);
            } else if (node.nodeData) {
              onSelectNode(node.nodeData);
            }
          }}
        >
          {node.type === 'folder' ? (
            <>
              <ChevronRightIcon
                size={16}
                className={`transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`}
              />
              <FolderIcon size={16} className="text-yellow-500" />
            </>
          ) : (
            <>
              <div className="w-4" />
              <FileCodeIcon
                size={16}
                className={
                  node.nodeData?.is_mastered
                    ? 'text-green-500'
                    : 'text-gray-400'
                }
              />
            </>
          )}
          <span className="text-sm font-medium flex-1">{node.name}</span>

          {node.nodeData && (
            <div className="flex items-center gap-1">
              {node.nodeData.is_mastered && (
                <span className="text-xs bg-green-600 px-2 py-0.5 rounded">
                  ✓ Mastered
                </span>
              )}
              {node.nodeData.avg_score !== undefined && (
                <span className="text-xs bg-blue-600 px-2 py-0.5 rounded">
                  {(node.nodeData.avg_score * 100).toFixed(0)}%
                </span>
              )}
            </div>
          )}
        </div>

        {node.type === 'folder' && isExpanded && node.children.length > 0 && (
          <div>
            {node.children.map((child) => (
              <TreeNodeComponent key={child.path} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full bg-gray-800 border border-gray-700 rounded-lg p-4 overflow-auto">
      <div className="space-y-1">
        <div className="font-bold text-sm text-gray-300 mb-4">
          📁 Repository Structure
        </div>
        {treeRoot.children.length > 0 ? (
          treeRoot.children.map((node) => (
            <TreeNodeComponent key={node.path} node={node} />
          ))
        ) : (
          <div className="text-gray-500 text-sm">No files indexed yet</div>
        )}
      </div>
    </div>
  );
}
