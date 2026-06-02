import React, { useRef, useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';

export const CodeEditor: React.FC = () => {
  const { files, activeTabId, updateContent } = useEditorStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeFile = files.find(f => f.id === activeTabId);

  useEffect(() => {
    // 탭 전환 시 에디터 포커싱 처리
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeTabId]);

  if (!activeFile) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-slate-950 rounded-lg border border-slate-800 p-8">
        <span className="text-4xl mb-4">🗂️</span>
        <p>열려 있는 탭이 없습니다. 상단 메뉴에서 예제를 로드하거나 탭을 만들어보세요.</p>
      </div>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // 1. Tab 키 입력 시 들여쓰기 강제 (공백 2칸)
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      const indent = '  '; // 2 spaces for tab indent
      const newValue = value.substring(0, start) + indent + value.substring(end);

      updateContent(newValue);

      // 커서 위치 재설정
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + indent.length;
      }, 0);
    }

    // 2. Enter 키 입력 시 이전 줄의 들여쓰기 자동 적용 (Auto Indentation)
    if (e.key === 'Enter') {
      const start = textarea.selectionStart;
      const value = textarea.value;

      // 현재 커서가 위치한 줄 찾기
      const lastNewLine = value.lastIndexOf('\n', start - 1);
      const currentLine = value.substring(lastNewLine + 1, start);

      // 이전 줄의 시작 공백 파악
      const match = currentLine.match(/^(\s*)/);
      if (match && match[1].length > 0) {
        e.preventDefault();
        const indent = match[1];
        const newValue = value.substring(0, start) + '\n' + indent + value.substring(start);

        updateContent(newValue);

        // 커서 위치 재설정
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1 + indent.length;
        }, 0);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
      {/* 에디터 헤더 */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-emerald-400 font-semibold uppercase">{activeFile.type}</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-200 font-mono">{activeFile.name}</span>
          {activeFile.isDirty && (
            <span className="w-2 h-2 rounded-full bg-amber-500" title="수정됨" />
          )}
        </div>
        {activeFile.error && (
          <span className="text-rose-400 font-mono max-w-[50%] truncate" title={activeFile.error}>
            ⚠️ 파싱 에러: {activeFile.error}
          </span>
        )}
      </div>

      {/* 에디터 본문 */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={activeFile.content}
          onChange={(e) => updateContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full h-full p-4 bg-slate-950 text-slate-200 font-mono text-sm leading-relaxed focus:outline-none resize-none overflow-y-auto selection:bg-cyan-500/30"
          spellCheck={false}
          placeholder="여기에 소스 코드를 입력하거나 트리 구조를 클릭해 보세요..."
        />
      </div>
    </div>
  );
};
