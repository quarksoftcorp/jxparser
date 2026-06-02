import React, { useEffect, useState } from 'react';
import { useEditorStore } from '../store/editorStore';

const getCategoryStyle = (category: string) => {
  const cat = category.toLowerCase();
  switch (cat) {
    case 'resume':
      return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300';
    case 'documentation':
      return 'bg-blue-500/10 border-blue-500/30 text-blue-300';
    case 'meeting':
      return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
    case 'blog':
      return 'bg-violet-500/10 border-violet-500/30 text-violet-300';
    case 'planning':
      return 'bg-amber-500/10 border-amber-500/30 text-amber-300';
    case 'report':
      return 'bg-rose-500/10 border-rose-500/30 text-rose-300';
    case 'harnessengineering':
    case '하네스엔지니어링':
      return 'bg-orange-500/10 border-orange-500/30 text-orange-300';
    default:
      return 'bg-slate-800/40 border-slate-700/60 text-slate-400';
  }
};

export const TemplateStore: React.FC = () => {
  const {
    templateStoreOpen,
    setTemplateStoreOpen,
    templates,
    templatesLoading,
    templatesError,
    fetchTemplates,
    loadTemplate,
    t,
    
    // 공유 스토어 상태 연동
    storeTab,
    setStoreTab,
    communityTemplates,
    communityLoading,
    communityError,
    fetchCommunityTemplates,
    starTemplate,
    forkTemplate
  } = useEditorStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<'newest' | 'stars' | 'forks'>('newest');
  const [starredIds, setStarredIds] = useState<string[]>([]);

  // 모달이 열리거나 탭이 전환될 때 데이터 로드 및 별점 기록 조회
  useEffect(() => {
    if (templateStoreOpen) {
      // 별점 기록 동기화
      try {
        const starred = localStorage.getItem('starred_templates') || '[]';
        setStarredIds(JSON.parse(starred));
      } catch (err) {
        console.error(err);
      }

      if (storeTab === 'official' && templates.length === 0) {
        fetchTemplates();
      } else if (storeTab === 'community' && communityTemplates.length === 0) {
        fetchCommunityTemplates();
      }
    }
  }, [templateStoreOpen, storeTab, templates.length, communityTemplates.length, fetchTemplates, fetchCommunityTemplates]);

  if (!templateStoreOpen) return null;

  // 활성화된 탭 기준의 데이터 설정
  const activeTemplates = storeTab === 'official' ? templates : communityTemplates;
  const isLoading = storeTab === 'official' ? templatesLoading : communityLoading;
  const isError = storeTab === 'official' ? templatesError : communityError;

  // 카테고리 목록 추출
  const categories = ['all', ...Array.from(new Set(activeTemplates.map(t => t.category)))];

  // 1. 카테고리 필터링
  let processedTemplates = selectedCategory === 'all'
    ? activeTemplates
    : activeTemplates.filter(t => t.category === selectedCategory);

  // 2. 정렬 옵션 적용 (추천수 또는 포크수 내림차순)
  if (selectedSort === 'stars') {
    processedTemplates = [...processedTemplates].sort((a, b) => (b.stars || 0) - (a.stars || 0));
  } else if (selectedSort === 'forks') {
    processedTemplates = [...processedTemplates].sort((a, b) => (b.forks || 0) - (a.forks || 0));
  }

  const handleTabChange = (tab: 'official' | 'community') => {
    setStoreTab(tab);
    setSelectedCategory('all'); // 탭 변경 시 카테고리 필터 초기화
    setSelectedSort('newest');  // 정렬 필터 초기화
  };

  const handleStar = async (id: string) => {
    await starTemplate(id);
    try {
      const starred = localStorage.getItem('starred_templates') || '[]';
      setStarredIds(JSON.parse(starred));
    } catch (err) {
      console.error(err);
    }
  };

  const isStarred = (id: string) => starredIds.includes(id);

  // 랭킹 배지 반환 헬퍼 (정렬 방식이 newest가 아닐 때 적용)
  const getRankBadge = (index: number) => {
    if (selectedSort === 'newest') return null;
    if (index === 0) return { text: t('rankGold'), className: 'bg-amber-500/20 border-amber-500/50 text-amber-300' };
    if (index === 1) return { text: t('rankSilver'), className: 'bg-slate-350/20 border-slate-300/50 text-slate-200' };
    if (index === 2) return { text: t('rankBronze'), className: 'bg-amber-700/20 border-amber-700/50 text-amber-600' };
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-5 bg-slate-900 border-b border-slate-800/80 shrink-0">
          <div className="space-y-1">
            <h3 className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-indigo-300 bg-clip-text text-transparent flex items-center gap-2">
              {t('storeTitle')}
            </h3>
            <p className="text-xs text-slate-400 leading-none">{t('storeDesc')}</p>
          </div>
          <button
            onClick={() => setTemplateStoreOpen(false)}
            className="w-8 h-8 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 탭 버튼 영역 */}
        <div className="px-6 py-1 bg-slate-900 border-b border-slate-800/60 shrink-0 flex gap-4">
          <button
            onClick={() => handleTabChange('official')}
            className={`py-3 text-sm font-bold border-b-2 transition cursor-pointer ${
              storeTab === 'official'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('tabOfficial')}
          </button>
          <button
            onClick={() => handleTabChange('community')}
            className={`py-3 text-sm font-bold border-b-2 transition cursor-pointer ${
              storeTab === 'community'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('tabCommunity')}
          </button>
        </div>

        {/* 카테고리 필터 & 정렬 컨트롤 바 (로딩/에러가 아닐 때만 노출) */}
        {!isLoading && !isError && activeTemplates.length > 0 && (
          <div className="px-6 py-3.5 bg-slate-900/50 border-b border-slate-800/50 shrink-0 flex flex-wrap items-center justify-between gap-3">
            {/* 카테고리 필터 칩 */}
            <div className="flex items-center gap-2 overflow-x-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg border transition capitalize cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                      : 'bg-slate-800/30 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat === 'all' ? t('allCategories') : cat}
                </button>
              ))}
            </div>

            {/* 정렬 필터 칩 */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setSelectedSort('newest')}
                className={`px-3 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${
                  selectedSort === 'newest' ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('sortNewest')}
              </button>
              <button
                onClick={() => setSelectedSort('stars')}
                className={`px-3 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${
                  selectedSort === 'stars' ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('sortStars')}
              </button>
              <button
                onClick={() => setSelectedSort('forks')}
                className={`px-3 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${
                  selectedSort === 'forks' ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('sortForks')}
              </button>
            </div>
          </div>
        )}

        {/* 모달 바디 (스크롤 가능) */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/40">
          {/* 1. 로딩 상태 */}
          {isLoading && (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
              <p className="text-sm font-semibold">{t('storeLoading')}</p>
            </div>
          )}

          {/* 2. 에러 상태 */}
          {!isLoading && isError && (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-4">
              <span className="text-4xl">⚠️</span>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-300">{t('storeError')}</p>
                <p className="text-xs text-rose-400 mt-1">{isError}</p>
              </div>
              <button
                onClick={storeTab === 'official' ? fetchTemplates : fetchCommunityTemplates}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                🔄 {t('retry')}
              </button>
            </div>
          )}

          {/* 3. 정상 상태 */}
          {!isLoading && !isError && (
            processedTemplates.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500">
                <span className="text-4xl mb-2">📁</span>
                <p className="text-sm">{t('emptyTree')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {processedTemplates.map((tmpl, idx) => {
                  const rankBadge = getRankBadge(idx);
                  return (
                    <div
                      key={tmpl.id}
                      className="p-5 rounded-xl bg-slate-900/40 hover:bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition duration-300 flex flex-col justify-between group shadow-sm hover:shadow-cyan-500/5 relative overflow-hidden"
                    >
                      {/* 랭킹 뱃지 시각화 */}
                      {rankBadge && (
                        <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-bold border-b border-l rounded-bl-xl tracking-wide select-none ${rankBadge.className}`}>
                          {rankBadge.text}
                        </div>
                      )}

                      <div className="mb-4">
                        <div className="flex items-start justify-between mb-2">
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border uppercase font-mono tracking-wider ${getCategoryStyle(tmpl.category)}`}>
                            {tmpl.category}
                          </span>
                          <span className={`text-[10px] text-slate-500 ${rankBadge ? 'mr-16' : ''}`}>
                            {t('author')}: <span className="font-semibold text-slate-400">{tmpl.author}</span>
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-slate-200 group-hover:text-cyan-400 transition duration-200 mb-1.5 pr-2">
                          {tmpl.title}
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed pr-2">
                          {tmpl.description}
                        </p>
                      </div>
                      
                      {/* 카드 하단 버튼 및 소셜 카운터 */}
                      <div className="flex flex-col gap-3">
                        {/* 추천/포크 카운터 */}
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 border-t border-slate-800/40 pt-2.5">
                          <span className="flex items-center gap-1">
                            ⭐ <span className="font-semibold text-slate-400">{tmpl.stars || 0}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            🍴 <span className="font-semibold text-slate-400">{tmpl.forks || 0}</span>
                          </span>
                        </div>

                        {/* 액션 버튼 그룹 */}
                        <div className="flex gap-2">
                          {/* 다운로드 */}
                          <button
                            id={`btn-download-${tmpl.id}`}
                            onClick={() => loadTemplate(tmpl)}
                            className="flex-1 py-2 bg-slate-800/60 hover:bg-slate-700 border border-slate-700/50 text-slate-300 hover:text-slate-100 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            📥 {t('download')}
                          </button>

                          {/* 추천(Star) */}
                          <button
                            id={`btn-star-${tmpl.id}`}
                            onClick={() => handleStar(tmpl.id)}
                            className={`px-3 py-2 border rounded-lg transition flex items-center justify-center text-xs cursor-pointer ${
                              isStarred(tmpl.id)
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <span>⭐</span>
                          </button>

                          {/* 포크(Fork) */}
                          <button
                            id={`btn-fork-${tmpl.id}`}
                            onClick={() => forkTemplate(tmpl)}
                            className="px-3 py-2 bg-slate-800/60 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-indigo-600 border border-slate-700/50 hover:border-transparent text-slate-400 hover:text-white rounded-lg transition flex items-center justify-center text-xs cursor-pointer"
                          >
                            🍴
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="px-6 py-4 bg-slate-900 border-t border-slate-800/80 flex justify-end shrink-0">
          <button
            onClick={() => setTemplateStoreOpen(false)}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-slate-100 border border-slate-800 hover:border-slate-700 rounded-lg transition cursor-pointer"
          >
            {t('close')}
          </button>
        </div>

      </div>
    </div>
  );
};
