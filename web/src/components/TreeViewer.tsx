import React, { useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { TreeNode } from '../utils/parser';

interface TreeViewerProps {
  tree: TreeNode;
}

export const TreeViewer: React.FC<TreeViewerProps> = ({ tree }) => {
  const { updateTree } = useEditorStore();

  const handleNodeUpdate = (updatedNode: TreeNode) => {
    // 트리 전체에서 특정 ID를 찾아 노드를 교체하고 전체 트리를 업데이트
    const replaceNode = (current: TreeNode): TreeNode => {
      if (current.id === updatedNode.id) {
        return updatedNode;
      }
      if (current.children) {
        return {
          ...current,
          children: current.children.map(replaceNode)
        };
      }
      return current;
    };

    const newTree = replaceNode(tree);
    updateTree(newTree);
  };

  return (
    <div className="p-4 bg-slate-900 text-slate-100 rounded-lg font-mono text-sm overflow-auto h-full border border-slate-700">
      <div className="text-slate-400 mb-2 pb-2 border-b border-slate-800 flex justify-between items-center">
        <span>🌳 트리 구조 뷰어 (클릭하여 편집 가능)</span>
      </div>
      {tree.children && tree.children.length > 0 ? (
        tree.children.map(child => (
          <NodeItem key={child.id} node={child} onUpdate={handleNodeUpdate} />
        ))
      ) : (
        <div className="text-slate-500 italic p-2">비어 있거나 해석할 수 없는 구조입니다.</div>
      )}
    </div>
  );
};

interface NodeItemProps {
  node: TreeNode;
  onUpdate: (node: TreeNode) => void;
  depth?: number;
}

const NodeItem: React.FC<NodeItemProps> = ({ node, onUpdate, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [editKey, setEditKey] = useState(node.key);
  const [editValue, setEditValue] = useState(String(node.value ?? ''));

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const hasChildren = node.children && node.children.length > 0;

  // 노드 타입별 배지 스타일 및 아이콘 정의
  const getTypeDetails = (type: string) => {
    switch (type) {
      case 'object':
        return { color: 'text-cyan-400', label: '{ }', isContainer: true };
      case 'array':
        return { color: 'text-yellow-400', label: '[ ]', isContainer: true };
      case 'xml-element':
        return { color: 'text-indigo-400', label: '< >', isContainer: hasChildren };
      case 'xml-attribute':
        return { color: 'text-emerald-400', label: '@', isContainer: false };
      case 'md-heading':
        return { color: 'text-rose-400', label: 'H#', isContainer: false };
      case 'md-paragraph':
        return { color: 'text-sky-400', label: '¶', isContainer: false };
      case 'md-list-item':
        return { color: 'text-amber-400', label: '•', isContainer: false };
      case 'md-code-block':
        return { color: 'text-purple-400', label: '`', isContainer: true };
      default:
        return { color: 'text-slate-300', label: 'val', isContainer: false };
    }
  };

  const { color, label, isContainer } = getTypeDetails(node.type);

  const handleKeySave = () => {
    setIsEditingKey(false);
    if (editKey !== node.key) {
      onUpdate({ ...node, key: editKey });
    }
  };

  const handleValueSave = () => {
    setIsEditingValue(false);
    let parsedValue: any = editValue;
    
    // 원래 타입이 boolean이나 number였으면 형식에 맞게 파싱
    if (node.type === 'number') {
      parsedValue = Number(editValue);
      if (isNaN(parsedValue)) parsedValue = node.value;
    } else if (node.type === 'boolean') {
      parsedValue = editValue.toLowerCase() === 'true';
    } else if (node.type === 'null') {
      parsedValue = null;
    }

    onUpdate({ ...node, value: parsedValue });
  };

  const handleChildUpdate = (updatedChild: TreeNode) => {
    if (node.children) {
      onUpdate({
        ...node,
        children: node.children.map(c => (c.id === updatedChild.id ? updatedChild : c))
      });
    }
  };

  return (
    <div className="my-1">
      <div
        className="flex items-center hover:bg-slate-800/60 rounded px-2 py-1 transition group cursor-pointer"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* 접기/펼치기 화살표 */}
        {isContainer ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand();
            }}
            className="mr-1 text-slate-500 hover:text-slate-300 focus:outline-none"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        ) : (
          <span className="w-4 inline-block" />
        )}

        {/* 타입 배지 */}
        <span className={`mr-2 font-bold text-xs ${color} px-1.5 py-0.5 bg-slate-950/60 rounded`}>
          {label}
        </span>

        {/* 키 (Key) */}
        <div className="flex-1 flex items-center min-w-0" onClick={(e) => e.stopPropagation()}>
          {isEditingKey ? (
            <input
              type="text"
              value={editKey}
              onChange={(e) => setEditKey(e.target.value)}
              onBlur={handleKeySave}
              onKeyDown={(e) => e.key === 'Enter' && handleKeySave()}
              className="bg-slate-950 border border-cyan-500 rounded px-1 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
              autoFocus
            />
          ) : (
            <span
              onClick={() => setIsEditingKey(true)}
              className="font-bold text-cyan-300 hover:underline truncate"
            >
              {node.key}
            </span>
          )}

          {/* 구분자 */}
          {!isContainer && <span className="mx-1.5 text-slate-500">:</span>}

          {/* 값 (Value) */}
          {!isContainer && (
            <div className="flex-1 min-w-0">
              {isEditingValue ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleValueSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleValueSave()}
                  className="bg-slate-950 border border-yellow-500 rounded px-1 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500 w-full"
                  autoFocus
                />
              ) : (
                <span
                  onClick={() => setIsEditingValue(true)}
                  className="text-amber-200 hover:underline truncate block"
                >
                  {node.value === null ? 'null' : String(node.value)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 자식 노드 렌더링 */}
      {isContainer && isExpanded && node.children && (
        <div>
          {node.children.map(child => (
            <NodeItem
              key={child.id}
              node={child}
              onUpdate={handleChildUpdate}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
