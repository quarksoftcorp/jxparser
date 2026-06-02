'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { CodeEditor } from '../components/CodeEditor';
import { TreeViewer } from '../components/TreeViewer';
import { ExampleViewer } from '../components/ExampleViewer';
import { TemplateStore } from '../components/TemplateStore';
import { ShareModal } from '../components/ShareModal';

export default function Home() {
  const {
    files,
    activeTabId,
    locale,
    addTab,
    closeTab,
    setActiveTab,
    formatActiveFile,
    setExampleOpen,
    setLocale,
    t,
    loadCachedFiles,
    exportActiveFile,
    setTemplateStoreOpen,
    setShareOpen
  } = useEditorStore();

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileLoad = (file: File) => {
    const reader = new FileReader();
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension !== 'json' && extension !== 'xml' && extension !== 'md') {
      alert(t('importFail'));
      return;
    }
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content !== undefined) {
        addTab(extension as 'json' | 'xml' | 'md', file.name, content);
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach((file) => {
        handleFileLoad(file);
      });
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file) => {
        handleFileLoad(file);
      });
      e.target.value = '';
    }
  };

  // 마운트 시 로컬 캐시/MMKV 파일 복구 수행
  useEffect(() => {
    const init = async () => {
      await loadCachedFiles();
      // 캐시 복구 후에도 열린 파일이 없으면 기본 JSON 예제 생성
      if (useEditorStore.getState().files.length === 0) {
        addTab('json', 'example.json', `{
  "appName": "JxmParser",
  "version": "1.0.0",
  "features": [
    "JSON/XML/MD Multi-Tab",
    "Interactive Tree Viewer",
    "Auto Formatting",
    "Tab Indent Constraint"
  ],
  "author": {
    "name": "개발자",
    "email": "contact@developer.com"
  },
  "isActive": true
}`);
      }
    };
    init();
  }, []);

  const activeFile = files.find(f => f.id === activeTabId);

  return (
    <main 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans relative"
    >
      {/* 1. 상단 글로벌 헤더 & 컨트롤 바 */}
      <header className="flex flex-wrap items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shrink-0 gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="font-bold text-white text-lg tracking-wider">JX</span>
          </div>
          <div>
            <h1 id="main-title" className="text-lg font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-indigo-300 bg-clip-text text-transparent">
              {t('title')}
            </h1>
            <p className="text-xs text-slate-400">{t('subtitle')}</p>
          </div>
        </div>

        {/* 새 탭 & 공통 동작 */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* 포맷 추가 버튼들 */}
          <button
            id="btn-add-json"
            onClick={() => addTab('json')}
            className="px-3.5 py-1.5 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800 text-cyan-300 text-xs font-semibold rounded-lg transition"
          >
            + {t('newJson')}
          </button>
          <button
            id="btn-add-xml"
            onClick={() => addTab('xml')}
            className="px-3.5 py-1.5 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800 text-indigo-300 text-xs font-semibold rounded-lg transition"
          >
            + {t('newXml')}
          </button>
          <button
            id="btn-add-md"
            onClick={() => addTab('md')}
            className="px-3.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800 text-rose-300 text-xs font-semibold rounded-lg transition"
          >
            + {t('newMd')}
          </button>

          <span className="h-6 w-[1px] bg-slate-800 mx-1"></span>

          {/* 스토어 공유하기 버튼 */}
          <button
            id="btn-share-open"
            onClick={() => {
              if (!activeFile || activeFile.type !== 'md') {
                alert(t('activeTabAlert'));
                return;
              }
              setShareOpen(true);
            }}
            className="px-4 py-1.5 bg-gradient-to-r from-emerald-600/80 to-teal-600/80 hover:from-emerald-550 hover:to-teal-550 text-white text-xs font-semibold rounded-lg transition border border-emerald-800/40 shadow-md shadow-emerald-500/5"
          >
            {t('shareBtn')}
          </button>

          {/* 코드 포맷팅 버튼 */}
          <button
            id="btn-format-code"
            onClick={formatActiveFile}
            disabled={!activeFile}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-xs font-semibold rounded-lg transition border border-slate-700"
          >
            ✨ {t('format')}
          </button>

          {/* 예제 로드 버튼 */}
          <button
            id="btn-view-examples"
            onClick={() => setExampleOpen(true)}
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg transition shadow-md shadow-indigo-500/10"
          >
            💡 {t('example')}
          </button>

          {/* 템플릿 스토어 버튼 */}
          <button
            id="btn-open-store"
            onClick={() => setTemplateStoreOpen(true)}
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-700 hover:from-cyan-500 hover:to-indigo-600 text-white text-xs font-semibold rounded-lg transition shadow-md shadow-cyan-500/10 border border-slate-700/60"
          >
            {t('storeBtn')}
          </button>

          {/* 파일 불러오기 버튼 */}
          <button
            id="btn-import-file"
            onClick={triggerFileInput}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition border border-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            📂 {t('importBtn')}
          </button>

          {/* 저장 / 공유 버튼 */}
          <button
            id="btn-export-code"
            onClick={exportActiveFile}
            disabled={!activeFile}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-550 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition shadow-md shadow-emerald-500/10"
          >
            💾 {t('export')}
          </button>

          <span className="h-6 w-[1px] bg-slate-800 mx-1"></span>

          {/* 다국어 전환 버튼 */}
          <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-800">
            <button
              id="btn-locale-ko"
              onClick={() => setLocale('ko')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition ${
                locale === 'ko' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              KO
            </button>
            <button
              id="btn-locale-en"
              onClick={() => setLocale('en')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition ${
                locale === 'en' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* 2. 가로 탭 바 영역 */}
      {files.length > 0 && (
        <div className="flex items-center px-4 py-1 bg-slate-950 border-b border-slate-800/80 shrink-0 overflow-x-auto gap-1">
          {files.map(file => {
            const isActive = file.id === activeTabId;
            return (
              <div
                key={file.id}
                onClick={() => setActiveTab(file.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-t-lg text-xs font-mono transition cursor-pointer select-none border-t-2 ${
                  isActive
                    ? 'bg-slate-900 border-t-cyan-400 text-slate-100'
                    : 'bg-slate-950 hover:bg-slate-900/40 border-t-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  file.type === 'json' ? 'bg-cyan-400' : file.type === 'xml' ? 'bg-indigo-400' : 'bg-rose-400'
                }`} />
                <span className="truncate max-w-[120px]">{file.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(file.id);
                  }}
                  className="text-slate-500 hover:text-slate-300 transition text-[10px] pl-1"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. 에디터 및 트리 뷰어 컨텐츠 영역 */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6 bg-slate-950">
        {activeFile ? (
          <>
            <div className="flex-1 h-full min-w-[300px]">
              <CodeEditor />
            </div>
            <div className="flex-1 h-full min-w-[300px]">
              <TreeViewer tree={activeFile.tree} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl p-12 bg-slate-900/10">
            <span className="text-5xl mb-4">🔮</span>
            <p className="text-sm font-semibold mb-2">{t('noTabs')}</p>
            <div className="flex gap-2.5 mt-4">
              <button
                onClick={() => addTab('json')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
              >
                {t('newJson')}
              </button>
              <button
                onClick={() => setExampleOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-semibold rounded-lg transition"
              >
                {t('example')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. 예제 선택 모달 */}
      <ExampleViewer />

      {/* 5. 템플릿 스토어 모달 */}
      <TemplateStore />

      {/* 6. 템플릿 공유 모달 */}
      <ShareModal />

      {/* 숨겨진 파일 입력 필드 */}
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".json,.xml,.md"
        className="hidden"
        multiple
      />

      {/* 드래그앤드롭 오버레이 */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md border-2 border-dashed border-cyan-500/40 m-4 rounded-2xl pointer-events-none animate-fadeIn">
          <div className="flex flex-col items-center gap-4 text-center p-8 bg-slate-900/60 rounded-xl border border-slate-800 shadow-2xl">
            <span className="text-6xl animate-bounce">📥</span>
            <p className="text-lg font-bold text-cyan-300">{t('dropZoneText')}</p>
            <p className="text-xs text-slate-400">JSON, XML, Markdown (.md)</p>
          </div>
        </div>
      )}
    </main>
  );
}
