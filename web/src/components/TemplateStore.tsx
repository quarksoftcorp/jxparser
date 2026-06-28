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
    case 'prompt':
      return 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-300';
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
    forkTemplate,
    deleteTemplate,
    
    // Auth 연동
    user
  } = useEditorStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<'newest' | 'stars' | 'forks'>('newest');
  const [selectedModel, setSelectedModel] = useState<string>('all');

  const handleDelete = async (id: string) => {
    if (confirm(t('confirmDelete'))) {
      await deleteTemplate(id);
    }
  };

  // 모달이 열리거나 탭이 전환될 때 데이터 로드
  useEffect(() => {
    if (templateStoreOpen) {
      if (storeTab === 'official' && templates.length === 0) {
        fetchTemplates();
      } else if ((storeTab === 'community' || storeTab === 'prompt' || storeTab === 'mine') && communityTemplates.length === 0) {
        fetchCommunityTemplates();
      }
    }
  }, [templateStoreOpen, storeTab, templates.length, communityTemplates.length, fetchTemplates, fetchCommunityTemplates]);

  if (!templateStoreOpen) return null;

  // 활성화된 탭 기준의 데이터 설정
  const activeTemplates = storeTab === 'official'
    ? templates
    : storeTab === 'prompt'
      ? communityTemplates.filter(t => t.isPrompt)
      : storeTab === 'community'
        ? communityTemplates.filter(t => !t.isPrompt)
        : communityTemplates.filter(t => t.uid === user?.uid);
  const isLoading = storeTab === 'official' ? templatesLoading : communityLoading;
  const isError = storeTab === 'official' ? templatesError : communityError;

  // 카테고리 목록 추출
  const categories = ['all', ...Array.from(new Set(activeTemplates.map(t => t.category)))];

  // 1. 카테고리 필터링
  let processedTemplates = selectedCategory === 'all'
    ? activeTemplates
    : activeTemplates.filter(t => t.category === selectedCategory);

  // AI 모델 필터링 적용
  if (selectedModel !== 'all') {
    processedTemplates = processedTemplates.filter(t => t.isPrompt && t.targetModel === selectedModel);
  }

  // 2. 정렬 옵션 적용 (추천수 또는 포크수 내림차순)
  if (selectedSort === 'stars') {
    processedTemplates = [...processedTemplates].sort((a, b) => (b.stars || 0) - (a.stars || 0));
  } else if (selectedSort === 'forks') {
    processedTemplates = [...processedTemplates].sort((a, b) => (b.forks || 0) - (a.forks || 0));
  }

  const handleTabChange = (tab: 'official' | 'community' | 'prompt' | 'mine') => {
    setStoreTab(tab);
    setSelectedCategory('all'); // 탭 변경 시 카테고리 필터 초기화
    setSelectedSort('newest');  // 정렬 필터 초기화
    setSelectedModel('all');    // AI 모델 필터 초기화
  };

  const handleStar = async (id: string) => {
    await starTemplate(id);
  };

  const isStarred = (tmpl: any) => {
    if (!user) return false;
    return tmpl.starredUids?.includes(user.uid) || false;
  };

  // 랭킹 배지 반환 헬퍼 (정렬 방식이 newest가 아닐 때 적용)
  const getRankBadge = (index: number) => {
    if (selectedSort === 'newest') return null;
    if (index === 0) return { text: t('rankGold'), className: 'bg-amber-500/20 border-amber-500/50 text-amber-300' };
    if (index === 1) return { text: t('rankSilver'), className: 'bg-slate-350/20 border-slate-300/50 text-slate-200' };
    if (index === 2) return { text: t('rankBronze'), className: 'bg-amber-700/20 border-amber-700/50 text-amber-600' };
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101010]/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-4xl bg-[#1e1e1e] border border-[#2d2d2d] rounded shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#1e1e1e] border-b border-[#2d2d2d] shrink-0">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-[#e0e0e0] flex items-center gap-2">
              {t('storeTitle')}
            </h3>
            <p className="text-[10px] text-[#858585] leading-none">{t('storeDesc')}</p>
          </div>
          <button
            onClick={() => setTemplateStoreOpen(false)}
            className="w-6 h-6 rounded bg-[#2d2d2d] hover:bg-[#333333] border border-[#2d2d2d] hover:border-[#3c3c3c] text-[#cccccc] flex items-center justify-center transition cursor-pointer text-[10px]"
          >
            ✕
          </button>
        </div>

        {/* 탭 버튼 영역 */}
        <div className="px-5 py-0.5 bg-[#1e1e1e] border-b border-[#2d2d2d] shrink-0 flex gap-4">
          <button
            onClick={() => handleTabChange('official')}
            className={`py-2 text-[11px] font-bold border-b-2 transition cursor-pointer ${
              storeTab === 'official'
                ? 'border-[#0e639c] text-white'
                : 'border-transparent text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            {t('tabOfficial')}
          </button>
          <button
            onClick={() => handleTabChange('community')}
            className={`py-2 text-[11px] font-bold border-b-2 transition cursor-pointer ${
              storeTab === 'community'
                ? 'border-[#0e639c] text-white'
                : 'border-transparent text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            {t('tabCommunity')}
          </button>
          <button
            onClick={() => handleTabChange('prompt')}
            className={`py-2 text-[11px] font-bold border-b-2 transition cursor-pointer ${
              storeTab === 'prompt'
                ? 'border-[#0e639c] text-white'
                : 'border-transparent text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            {t('tabPrompt')}
          </button>
          {user && (
            <button
              onClick={() => handleTabChange('mine')}
              className={`py-2 text-[11px] font-bold border-b-2 transition cursor-pointer ${
                storeTab === 'mine'
                  ? 'border-[#0e639c] text-white'
                  : 'border-transparent text-[#858585] hover:text-[#cccccc]'
              }`}
            >
              {t('tabMine')}
            </button>
          )}
        </div>

        {/* 카테고리 필터 & 정렬 컨트롤 바 (로딩/에러가 아닐 때만 노출) */}
        {!isLoading && !isError && activeTemplates.length > 0 && (
          <div className="px-5 py-2.5 bg-[#181818] border-b border-[#2d2d2d] shrink-0 flex flex-wrap items-center justify-between gap-3">
            {/* 카테고리 필터 칩 */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-0.5 text-[11px] rounded border transition capitalize cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#2d2d2d] border-[#3c3c3c] text-white'
                      : 'bg-[#1e1e1e] border-[#2d2d2d] hover:border-[#3c3c3c] text-[#858585] hover:text-[#cccccc]'
                  }`}
                >
                  {cat === 'all' ? t('allCategories') : cat}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* AI 모델 필터 셀렉터 (AI 프롬프트 및 내 템플릿 탭에서 노출) */}
              {(storeTab === 'prompt' || storeTab === 'mine') && (
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-[#2d2d2d] border border-[#2d2d2d] hover:border-[#3c3c3c] rounded text-[#cccccc] text-[10px] font-bold px-2 py-0.5 focus:outline-none transition cursor-pointer"
                >
                  <option value="all">{t('filterAllModels')}</option>
                  <option value="Gemini">Gemini</option>
                  <option value="GPT">GPT-4</option>
                  <option value="Claude">Claude</option>
                  <option value="Llama">LLaMA</option>
                  <option value="General">General</option>
                </select>
              )}

              {/* 정렬 필터 칩 */}
              <div className="flex items-center bg-[#1e1e1e] p-0.5 rounded border border-[#2d2d2d]">
                <button
                  onClick={() => setSelectedSort('newest')}
                  className={`px-2 py-0.5 rounded-sm text-[9px] font-bold transition cursor-pointer ${
                    selectedSort === 'newest' ? 'bg-[#2d2d2d] text-white' : 'text-[#666666] hover:text-[#858585]'
                  }`}
                >
                  {t('sortNewest')}
                </button>
                <button
                  onClick={() => setSelectedSort('stars')}
                  className={`px-2 py-0.5 rounded-sm text-[9px] font-bold transition cursor-pointer ${
                    selectedSort === 'stars' ? 'bg-[#2d2d2d] text-white' : 'text-[#666666] hover:text-[#858585]'
                  }`}
                >
                  {t('sortStars')}
                </button>
                <button
                  onClick={() => setSelectedSort('forks')}
                  className={`px-2 py-0.5 rounded-sm text-[9px] font-bold transition cursor-pointer ${
                    selectedSort === 'forks' ? 'bg-[#2d2d2d] text-white' : 'text-[#666666] hover:text-[#858585]'
                  }`}
                >
                  {t('sortForks')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 모달 바디 (스크롤 가능) */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#181818]">
          {/* 1. 로딩 상태 */}
          {isLoading && (
            <div className="h-64 flex flex-col items-center justify-center text-[#858585] gap-2">
              <div className="w-6 h-6 border-2 border-[#0e639c]/20 border-t-[#0e639c] rounded-full animate-spin"></div>
              <p className="text-[11px]">{t('storeLoading')}</p>
            </div>
          )}

          {/* 2. 에러 상태 */}
          {!isLoading && isError && (
            <div className="h-64 flex flex-col items-center justify-center text-[#858585] gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="text-center">
                <p className="text-xs font-semibold text-[#cccccc]">{t('storeError')}</p>
                <p className="text-[10px] text-rose-400 mt-1">{isError}</p>
              </div>
              <button
                onClick={storeTab === 'official' ? fetchTemplates : fetchCommunityTemplates}
                className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#333333] border border-[#2d2d2d] hover:border-[#3c3c3c] text-white text-xs font-semibold rounded transition cursor-pointer"
              >
                🔄 {t('retry')}
              </button>
            </div>
          )}

          {/* 3. 정상 상태 */}
          {!isLoading && !isError && (
            processedTemplates.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-[#858585]">
                <span className="text-2xl mb-1">📁</span>
                <p className="text-xs">{t('emptyTree')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {processedTemplates.map((tmpl, idx) => {
                  const rankBadge = getRankBadge(idx);
                  return (
                    <div
                      key={tmpl.id}
                      className="p-4 rounded bg-[#1e1e1e] hover:bg-[#232324] border border-[#2d2d2d] hover:border-[#3c3c3c] transition duration-150 flex flex-col justify-between group shadow-sm relative overflow-hidden"
                    >
                      {/* 랭킹 뱃지 시각화 */}
                      {rankBadge && (
                        <div className={`absolute top-0 right-0 px-2 py-0.5 text-[8px] font-bold border-b border-l rounded-bl tracking-wide select-none ${rankBadge.className}`}>
                          {rankBadge.text}
                        </div>
                      )}

                      <div className="mb-3.5">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase font-mono tracking-wider ${getCategoryStyle(tmpl.category)}`}>
                              {tmpl.category}
                            </span>
                            {tmpl.isPrompt && tmpl.targetModel && (
                              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase font-mono tracking-wider ${
                                tmpl.targetModel === 'Gemini'
                                  ? 'bg-[#0e639c]/10 text-[#80dbff] border-[#0e639c]/20'
                                  : tmpl.targetModel === 'GPT'
                                    ? 'bg-[#107c41]/10 text-[#4ec9b0] border-[#107c41]/20'
                                    : tmpl.targetModel === 'Claude'
                                      ? 'bg-[#ce9178]/10 text-[#e5a285] border-[#ce9178]/20'
                                      : 'bg-[#2d2d2d] text-[#a0a0a0] border-[#2d2d2d]'
                              }`}>
                                🤖 {tmpl.targetModel}
                              </span>
                            )}
                          </div>
                          <span className={`text-[9px] text-[#858585] ${rankBadge ? 'mr-14' : ''}`}>
                            {t('author')}: <span className="font-medium text-[#cccccc]">{tmpl.author}</span>
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-[#e0e0e0] group-hover:text-[#4fc1ff] transition duration-150 mb-1">
                          {tmpl.title}
                        </h4>
                        <p className="text-[11px] text-[#a0a0a0] leading-relaxed">
                          {tmpl.description}
                        </p>
                      </div>
                      
                      {/* 카드 하단 버튼 및 소셜 카운터 */}
                      <div className="flex flex-col gap-2.5">
                        {/* 추천/포크 카운터 */}
                        <div className="flex items-center gap-3 text-[9px] text-[#858585] border-t border-[#2d2d2d] pt-2">
                          <span className="flex items-center gap-0.5">
                            ⭐ <span className="font-medium text-[#cccccc]">{tmpl.stars || 0}</span>
                          </span>
                          <span className="flex items-center gap-0.5">
                            🍴 <span className="font-medium text-[#cccccc]">{tmpl.forks || 0}</span>
                          </span>
                        </div>

                        {/* 액션 버튼 그룹 */}
                        <div className="flex gap-1.5">
                          {/* 다운로드 */}
                          <button
                            id={`btn-download-${tmpl.id}`}
                            onClick={() => loadTemplate(tmpl)}
                            className="flex-1 py-1.5 bg-[#2d2d2d] hover:bg-[#333333] border border-[#2d2d2d] hover:border-[#3c3c3c] text-[#cccccc] hover:text-white text-[11px] font-semibold rounded transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            📥 {t('download')}
                          </button>

                          {/* 추천(Star) */}
                          <button
                            id={`btn-star-${tmpl.id}`}
                            onClick={() => handleStar(tmpl.id)}
                            className={`px-2.5 py-1.5 border rounded transition flex items-center justify-center text-xs cursor-pointer ${
                              isStarred(tmpl)
                                ? 'bg-[#ce9178]/5 border-[#ce9178]/20 text-[#ce9178]'
                                : 'bg-[#2d2d2d] border-[#2d2d2d] hover:border-[#3c3c3c] text-[#858585] hover:text-[#cccccc]'
                            }`}
                          >
                            <span>⭐</span>
                          </button>

                          {/* 포크(Fork) */}
                          <button
                            id={`btn-fork-${tmpl.id}`}
                            onClick={() => forkTemplate(tmpl)}
                            className="px-2.5 py-1.5 bg-[#2d2d2d] border border-[#2d2d2d] hover:border-[#3c3c3c] text-[#858585] hover:text-white rounded transition flex items-center justify-center text-xs cursor-pointer"
                          >
                            🍴
                          </button>

                          {/* 삭제(Delete - 본인 템플릿일 때만 노출) */}
                          {user && tmpl.uid === user.uid && (
                            <button
                              id={`btn-delete-${tmpl.id}`}
                              onClick={() => handleDelete(tmpl.id)}
                              className="px-2.5 py-1.5 bg-[#3a1c1c] hover:bg-[#c53030] border border-[#4a2222] hover:border-[#c53030] text-rose-300 hover:text-white rounded transition flex items-center justify-center text-xs cursor-pointer"
                              title={t('confirmDelete')}
                            >
                              🗑️
                            </button>
                          )}
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
        <div className="px-5 py-3 bg-[#1e1e1e] border-t border-[#2d2d2d] flex justify-end shrink-0">
          <button
            onClick={() => setTemplateStoreOpen(false)}
            className="px-4 py-1.5 text-xs font-semibold bg-[#2d2d2d] hover:bg-[#333333] border border-[#2d2d2d] hover:border-[#3c3c3c] text-[#cccccc] rounded transition cursor-pointer"
          >
            {t('close')}
          </button>
        </div>

      </div>
    </div>
  );
};
