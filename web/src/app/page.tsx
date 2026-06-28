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
    setShareOpen,
    
    // Auth 연동
    user,
    authLoading,
    signInWithGoogle,
    signOutUser,
    initializeAuth
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

  // 마운트 시 로컬 캐시/MMKV 파일 복구 및 Auth 초기화 수행
  useEffect(() => {
    const init = async () => {
      initializeAuth();
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
      className="flex flex-col h-screen bg-[#181818] text-[#cccccc] overflow-hidden font-sans relative"
    >
      {/* 1. 상단 글로벌 헤더 & 컨트롤 바 */}
      <header className="flex flex-wrap items-center justify-between px-5 py-2.5 bg-[#1e1e1e] border-b border-[#2d2d2d] shrink-0 gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center overflow-hidden shadow-inner">
            <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <h1 id="main-title" className="text-xs font-bold tracking-tight text-[#e0e0e0] flex items-center gap-2">
              {t('title')}
            </h1>
            <p className="text-[10px] text-[#858585]">{t('subtitle')}</p>
          </div>
        </div>

        {/* 새 탭 & 공통 동작 */}
        <div className="flex items-center flex-wrap gap-1.5">
          {/* 포맷 추가 버튼들 */}
          <button
            id="btn-add-json"
            onClick={() => addTab('json')}
            className="px-2.5 py-1 bg-[#2d2d2d] hover:bg-[#333333] border border-[#2d2d2d] hover:border-[#3c3c3c] text-[#cccccc] text-[11px] font-semibold rounded transition"
          >
            + {t('newJson')}
          </button>
          <button
            id="btn-add-xml"
            onClick={() => addTab('xml')}
            className="px-2.5 py-1 bg-[#2d2d2d] hover:bg-[#333333] border border-[#2d2d2d] hover:border-[#3c3c3c] text-[#cccccc] text-[11px] font-semibold rounded transition"
          >
            + {t('newXml')}
          </button>
          <button
            id="btn-add-md"
            onClick={() => addTab('md')}
            className="px-2.5 py-1 bg-[#2d2d2d] hover:bg-[#333333] border border-[#2d2d2d] hover:border-[#3c3c3c] text-[#cccccc] text-[11px] font-semibold rounded transition"
          >
            + {t('newMd')}
          </button>

          <span className="h-4 w-[1px] bg-[#2d2d2d] mx-0.5"></span>

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
            className="px-2.5 py-1 bg-[#0e639c] hover:bg-[#1177bb] text-white text-[11px] font-semibold rounded transition"
          >
            {t('shareBtn')}
          </button>

          {/* 코드 포맷팅 버튼 */}
          <button
            id="btn-format-code"
            onClick={formatActiveFile}
            disabled={!activeFile}
            className="px-2.5 py-1 bg-[#2d2d2d] hover:bg-[#333333] disabled:opacity-30 disabled:cursor-not-allowed text-[#cccccc] text-[11px] font-semibold rounded transition border border-[#2d2d2d]"
          >
            ✨ {t('format')}
          </button>

          {/* 예제 로드 버튼 */}
          <button
            id="btn-view-examples"
            onClick={() => setExampleOpen(true)}
            className="px-2.5 py-1 bg-[#2d2d2d] hover:bg-[#333333] text-[#cccccc] text-[11px] font-semibold rounded transition border border-[#2d2d2d]"
          >
            💡 {t('example')}
          </button>

          {/* 템플릿 스토어 버튼 */}
          <button
            id="btn-open-store"
            onClick={() => setTemplateStoreOpen(true)}
            className="px-2.5 py-1 bg-[#2d2d2d] hover:bg-[#333333] text-[#cccccc] text-[11px] font-semibold rounded transition border border-[#2d2d2d]"
          >
            {t('storeBtn')}
          </button>

          {/* 파일 불러오기 버튼 */}
          <button
            id="btn-import-file"
            onClick={triggerFileInput}
            className="px-2.5 py-1 bg-[#2d2d2d] hover:bg-[#333333] text-[#cccccc] text-[11px] font-semibold rounded transition border border-[#2d2d2d] flex items-center gap-1 cursor-pointer"
          >
            📂 {t('importBtn')}
          </button>

          {/* 저장 / 공유 버튼 */}
          <button
            id="btn-export-code"
            onClick={exportActiveFile}
            disabled={!activeFile}
            className="px-2.5 py-1 bg-[#0e639c] hover:bg-[#1177bb] disabled:opacity-30 disabled:cursor-not-allowed text-white text-[11px] font-semibold rounded transition"
          >
            💾 {t('export')}
          </button>

          <span className="h-4 w-[1px] bg-[#2d2d2d] mx-0.5"></span>

          {/* 구글 로그인 영역 */}
          <div className="flex items-center">
            {authLoading ? (
              <span className="text-[10px] text-[#858585]">...</span>
            ) : user ? (
              <div className="flex items-center gap-1.5 bg-[#181818] px-2 py-0.5 rounded border border-[#2d2d2d]">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-4 h-4 rounded-full border border-[#2d2d2d]" referrerPolicy="no-referrer" />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-[#2d2d2d] border border-[#2d2d2d] flex items-center justify-center text-[8px]">👤</span>
                )}
                <span className="text-[11px] font-medium text-[#b3b3b3] max-w-[70px] truncate">{user.displayName}</span>
                <button
                  id="btn-logout"
                  onClick={signOutUser}
                  className="text-[9px] text-rose-400 hover:text-rose-350 transition cursor-pointer pl-1 font-bold"
                >
                  {t('logoutBtn')}
                </button>
              </div>
            ) : (
              <button
                id="btn-google-login"
                onClick={signInWithGoogle}
                className="px-2.5 py-1 bg-[#0e639c] hover:bg-[#1177bb] text-white text-[11px] font-bold rounded transition flex items-center gap-1 cursor-pointer"
              >
                🔑 {t('loginBtn')}
              </button>
            )}
          </div>

          <span className="h-4 w-[1px] bg-[#2d2d2d] mx-0.5"></span>

          {/* 다국어 전환 버튼 */}
          <div className="flex bg-[#181818] rounded p-0.5 border border-[#2d2d2d]">
            <button
              id="btn-locale-ko"
              onClick={() => setLocale('ko')}
              className={`px-2 py-0.5 rounded-sm text-[9px] font-bold transition ${
                locale === 'ko' ? 'bg-[#2d2d2d] text-white' : 'text-[#858585] hover:text-[#cccccc]'
              }`}
            >
              KO
            </button>
            <button
              id="btn-locale-en"
              onClick={() => setLocale('en')}
              className={`px-2 py-0.5 rounded-sm text-[9px] font-bold transition ${
                locale === 'en' ? 'bg-[#2d2d2d] text-white' : 'text-[#858585] hover:text-[#cccccc]'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* 2. 가로 탭 바 영역 */}
      {files.length > 0 && (
        <div className="flex items-center px-4 py-0.5 bg-[#181818] border-b border-[#2d2d2d] shrink-0 overflow-x-auto gap-1">
          {files.map(file => {
            const isActive = file.id === activeTabId;
            return (
              <div
                key={file.id}
                onClick={() => setActiveTab(file.id)}
                className={`flex items-center space-x-2 px-2.5 py-1 rounded-t-sm text-[11px] font-mono transition cursor-pointer select-none border-t ${
                  isActive
                    ? 'bg-[#1e1e1e] border-t-[#0e639c] text-[#e0e0e0]'
                    : 'bg-[#252526] hover:bg-[#29292a] border-t-transparent text-[#858585] hover:text-[#cccccc]'
                }`}
              >
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition-colors duration-200 ${
                  file.type === 'json'
                    ? 'bg-[#4fc1ff]/10 border-[#4fc1ff]/30 text-[#4fc1ff]'
                    : file.type === 'xml'
                      ? 'bg-[#ce9178]/10 border-[#ce9178]/30 text-[#ce9178]'
                      : 'bg-[#4ec9b0]/10 border-[#4ec9b0]/30 text-[#4ec9b0]'
                }`}>
                  {file.type === 'json' ? '{}' : file.type === 'xml' ? '<>' : 'MD'}
                </span>
                <span className="truncate max-w-[120px]">{file.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(file.id);
                  }}
                  className="text-[#858585] hover:text-[#cccccc] transition text-[9px] pl-1"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. 에디터 및 트리 뷰어 컨텐츠 영역 */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4 bg-[#181818]">
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
          <div className="flex-1 flex flex-col items-center justify-center text-[#858585] border border-dashed border-[#2d2d2d] rounded p-12 bg-[#1e1e1e]">
            <span className="text-4xl mb-3">🔮</span>
            <p className="text-xs font-semibold mb-2">{t('noTabs')}</p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => addTab('json')}
                className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#333333] border border-[#2d2d2d] hover:border-[#3c3c3c] text-white text-xs font-semibold rounded transition"
              >
                {t('newJson')}
              </button>
              <button
                onClick={() => setExampleOpen(true)}
                className="px-3 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] text-white text-xs font-semibold rounded transition"
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
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#181818]/85 backdrop-blur-sm border border-dashed border-[#0e639c]/40 m-4 rounded pointer-events-none animate-fadeIn">
          <div className="flex flex-col items-center gap-4 text-center p-8 bg-[#1e1e1e] rounded border border-[#2d2d2d] shadow-2xl">
            <span className="text-6xl animate-bounce">📥</span>
            <p className="text-base font-bold text-[#4fc1ff]">{t('dropZoneText')}</p>
            <p className="text-xs text-[#858585]">JSON, XML, Markdown (.md)</p>
          </div>
        </div>
      )}
    </main>
  );
}
