import { XMLParser, XMLBuilder } from 'fast-xml-parser';

export interface TreeNode {
  id: string;
  key: string;
  value?: any;
  type:
    | 'object'
    | 'array'
    | 'string'
    | 'number'
    | 'boolean'
    | 'null'
    | 'xml-element'
    | 'xml-attribute'
    | 'md-heading'
    | 'md-paragraph'
    | 'md-list-item'
    | 'md-code-block'
    | 'md-blank'
    | 'root';
  children?: TreeNode[];
}

// 간단한 고유 ID 생성기
export const generateId = () => Math.random().toString(36).substring(2, 9);

// ==========================================
// JSON Parser & Serializer
// ==========================================

export function jsonToTree(jsonStr: string): TreeNode {
  const parsed = JSON.parse(jsonStr);
  const root: TreeNode = {
    id: generateId(),
    key: 'root',
    type: 'root',
    children: []
  };

  function valToNode(key: string, val: any): TreeNode {
    const id = generateId();
    if (val === null) {
      return { id, key, type: 'null', value: null };
    }
    if (Array.isArray(val)) {
      return {
        id,
        key,
        type: 'array',
        children: val.map((item, idx) => valToNode(`[${idx}]`, item))
      };
    }
    if (typeof val === 'object') {
      return {
        id,
        key,
        type: 'object',
        children: Object.entries(val).map(([k, v]) => valToNode(k, v))
      };
    }
    return { id, key, type: typeof val as any, value: val };
  }

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    root.children = Object.entries(parsed).map(([k, v]) => valToNode(k, v));
  } else if (Array.isArray(parsed)) {
    root.type = 'array';
    root.children = parsed.map((item, idx) => valToNode(`[${idx}]`, item));
  } else {
    root.children = [valToNode('value', parsed)];
  }

  return root;
}

export function treeToJson(tree: TreeNode): string {
  function nodeToVal(node: TreeNode): any {
    if (node.type === 'null') return null;
    if (node.type === 'string') return String(node.value);
    if (node.type === 'number') return Number(node.value);
    if (node.type === 'boolean') {
      if (typeof node.value === 'string') {
        return node.value.toLowerCase() === 'true';
      }
      return Boolean(node.value);
    }
    if (node.type === 'array') {
      return (node.children || []).map(nodeToVal);
    }
    if (node.type === 'object' || node.type === 'root') {
      const obj: Record<string, any> = {};
      (node.children || []).forEach(child => {
        obj[child.key] = nodeToVal(child);
      });
      return obj;
    }
    return node.value;
  }

  const obj = nodeToVal(tree);
  return JSON.stringify(obj, null, 2);
}

// ==========================================
// XML Parser & Serializer
// ==========================================

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true
});

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  indentBy: '  '
});

export function xmlToTree(xmlStr: string): TreeNode {
  const parsed = xmlParser.parse(xmlStr);
  const root: TreeNode = {
    id: generateId(),
    key: 'root',
    type: 'root',
    children: []
  };

  function valToNode(key: string, val: any): TreeNode {
    const id = generateId();
    const isAttr = key.startsWith('@_');
    const displayKey = isAttr ? key.substring(2) : key;
    const type = isAttr ? 'xml-attribute' : 'xml-element';

    if (val === null || val === undefined) {
      return { id, key: displayKey, type, value: '' };
    }

    if (Array.isArray(val)) {
      // 동일 태그 여러 개가 배열로 묶인 경우
      return {
        id,
        key: displayKey,
        type: 'array',
        children: val.map((item, idx) => valToNode(`${displayKey}[${idx}]`, item))
      };
    }

    if (typeof val === 'object') {
      return {
        id,
        key: displayKey,
        type: 'xml-element',
        children: Object.entries(val).map(([k, v]) => valToNode(k, v))
      };
    }

    return { id, key: displayKey, type, value: val };
  }

  root.children = Object.entries(parsed).map(([k, v]) => valToNode(k, v));
  return root;
}

export function treeToXml(tree: TreeNode): string {
  function nodeToVal(node: TreeNode): any {
    if (node.type === 'array') {
      return (node.children || []).map(nodeToVal);
    }
    // XML Element 및 Attribute 처리
    if (node.type === 'xml-element' || node.type === 'root') {
      const obj: Record<string, any> = {};
      (node.children || []).forEach(child => {
        // 복원 시 attribute는 원래의 '@_' 접두사를 붙여줌
        const isAttr = child.type === 'xml-attribute';
        const rawKey = isAttr ? `@_${child.key}` : child.key;
        
        // 동일 태그명이 이미 있는 경우 배열로 합침
        if (obj[rawKey] !== undefined) {
          if (!Array.isArray(obj[rawKey])) {
            obj[rawKey] = [obj[rawKey]];
          }
          obj[rawKey].push(nodeToVal(child));
        } else {
          obj[rawKey] = nodeToVal(child);
        }
      });
      return obj;
    }
    return node.value;
  }

  const obj = nodeToVal(tree);
  return xmlBuilder.build(obj);
}

// ==========================================
// Markdown (MD) Parser & Serializer
// ==========================================

export function mdToTree(mdStr: string): TreeNode {
  const lines = mdStr.split('\n');
  const root: TreeNode = {
    id: generateId(),
    key: 'root',
    type: 'root',
    children: []
  };

  let inCodeBlock = false;
  let codeBlockNode: TreeNode | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 코드 블록 처리
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockNode = {
          id: generateId(),
          key: 'Code Block',
          type: 'md-code-block',
          value: line, // ```js 등 헤더 저장
          children: []
        };
        root.children!.push(codeBlockNode);
      } else {
        inCodeBlock = false;
        if (codeBlockNode) {
          codeBlockNode.children!.push({
            id: generateId(),
            key: 'Code Block End',
            type: 'md-paragraph',
            value: '```'
          });
        }
        codeBlockNode = null;
      }
      continue;
    }

    if (inCodeBlock && codeBlockNode) {
      codeBlockNode.children!.push({
        id: generateId(),
        key: 'Code Line',
        type: 'md-paragraph',
        value: line
      });
      continue;
    }

    // 빈 줄
    if (line.trim() === '') {
      root.children!.push({
        id: generateId(),
        key: 'Blank Line',
        type: 'md-blank',
        value: ''
      });
      continue;
    }

    // 헤더 (#)
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      root.children!.push({
        id: generateId(),
        key: `Heading ${level}`,
        type: 'md-heading',
        value: headingMatch[2]
      });
      continue;
    }

    // 리스트 아이템 (-, *, +, 1. 등)
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const indent = listMatch[1];
      const bullet = listMatch[2];
      root.children!.push({
        id: generateId(),
        key: 'List Item',
        type: 'md-list-item',
        value: listMatch[3],
        // 들여쓰기와 불릿 기호 보존을 위해 meta로 저장하거나 value에 포함할 수 있음
        // 여기서는 value에 내용을 담고 기호를 복원할 수 있게 구조 설계
        children: [
          { id: generateId(), key: 'indent', type: 'string', value: indent },
          { id: generateId(), key: 'bullet', type: 'string', value: bullet }
        ]
      });
      continue;
    }

    // 일반 문단
    root.children!.push({
      id: generateId(),
      key: 'Paragraph',
      type: 'md-paragraph',
      value: line
    });
  }

  return root;
}

export function treeToMd(tree: TreeNode): string {
  const lines: string[] = [];

  (tree.children || []).forEach(node => {
    if (node.type === 'md-blank') {
      lines.push('');
    } else if (node.type === 'md-heading') {
      const levelStr = node.key.split(' ')[1] || '1';
      const level = parseInt(levelStr, 10);
      lines.push('#'.repeat(level) + ' ' + node.value);
    } else if (node.type === 'md-list-item') {
      const indent = node.children?.find(c => c.key === 'indent')?.value || '';
      const bullet = node.children?.find(c => c.key === 'bullet')?.value || '-';
      lines.push(`${indent}${bullet} ${node.value}`);
    } else if (node.type === 'md-code-block') {
      lines.push(node.value); // ```js
      (node.children || []).forEach(codeLine => {
        lines.push(codeLine.value);
      });
    } else {
      lines.push(node.value || '');
    }
  });

  return lines.join('\n');
}

// 강제 탭 인덴트 및 포맷팅 헬퍼
export function formatTabIndent(content: string, tabSize: number = 2): string {
  // 간단한 공백 -> 탭 변환 및 강제 정렬 기능
  const indentStr = ' '.repeat(tabSize);
  return content
    .split('\n')
    .map(line => {
      // 라인 앞부분 공백을 tabSize 단위로 강제
      const match = line.match(/^(\s*)/);
      if (match) {
        const spaces = match[1].length;
        const indentCount = Math.round(spaces / tabSize);
        return indentStr.repeat(indentCount) + line.trimStart();
      }
      return line;
    })
    .join('\n');
}
