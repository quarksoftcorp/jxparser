import React, { useState } from 'react';
import { useEditorStore } from '../store/editorStore';

export const ShareModal: React.FC = () => {
  const {
    shareOpen,
    setShareOpen,
    shareTemplate,
    t
  } = useEditorStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Resume');
  const [author, setAuthor] = useState('');
  const [isPrompt, setIsPrompt] = useState(false);
  const [targetModel, setTargetModel] = useState('Gemini');
  const [submitting, setSubmitting] = useState(false);

  if (!shareOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    const finalCategory = isPrompt ? 'Prompt' : category;
    const success = await shareTemplate(title, description, finalCategory, author, isPrompt, targetModel);
    setSubmitting(false);

    if (success) {
      alert(t('shareSuccess'));
      // 입력 폼 초기화
      setTitle('');
      setDescription('');
      setCategory('Resume');
      setAuthor('');
      setIsPrompt(false);
      setTargetModel('Gemini');
    } else {
      alert(t('shareFail'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#181818]/85 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-[#252526] border border-[#3c3c3c] rounded overflow-hidden shadow-2xl flex flex-col">
        
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-5 bg-[#252526] border-b border-[#3c3c3c]">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              {t('shareTitle')}
            </h3>
            <p className="text-[11px] text-[#858585] leading-normal">{t('shareDesc')}</p>
          </div>
          <button
            onClick={() => setShareOpen(false)}
            className="w-7 h-7 rounded bg-[#3a3d41] hover:bg-[#464b50] border border-[#3c3c3c] text-white flex items-center justify-center transition cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>

        {/* 폼 양식 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 제목 */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#858585] uppercase tracking-wider">{t('inputTitle')}</label>
            <input
              id="input-share-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('inputTitlePl')}
              className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-[#cccccc] placeholder-[#555555] text-xs focus:border-[#0e639c] focus:outline-none transition"
            />
          </div>

          {/* 설명 */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#858585] uppercase tracking-wider">{t('inputDesc')}</label>
            <textarea
              id="input-share-desc"
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('inputDescPl')}
              className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-[#cccccc] placeholder-[#555555] text-xs focus:border-[#0e639c] focus:outline-none transition resize-none"
            />
          </div>

          {/* AI 프롬프트 등록 체크박스 */}
          <div className="flex items-center space-x-2 py-1">
            <input
              id="checkbox-share-prompt"
              type="checkbox"
              checked={isPrompt}
              onChange={(e) => setIsPrompt(e.target.checked)}
              className="w-3.5 h-3.5 bg-[#1e1e1e] border border-[#3c3c3c] text-[#0e639c] rounded focus:ring-1 focus:ring-[#0e639c] cursor-pointer"
            />
            <label htmlFor="checkbox-share-prompt" className="text-xs font-semibold text-[#cccccc] cursor-pointer select-none">
              {t('isPromptTemplate')}
            </label>
          </div>

          {/* 카테고리 (또는 대상 AI 모델) & 작성자 */}
          <div className="grid grid-cols-2 gap-4">
            {isPrompt ? (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#858585] uppercase tracking-wider">{t('targetModelLabel')}</label>
                <select
                  id="select-share-model"
                  value={targetModel}
                  onChange={(e) => setTargetModel(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-[#cccccc] text-xs focus:border-[#0e639c] focus:outline-none transition cursor-pointer"
                >
                  <option value="Gemini">{t('modelGemini')}</option>
                  <option value="GPT">{t('modelGPT')}</option>
                  <option value="Claude">{t('modelClaude')}</option>
                  <option value="Llama">{t('modelLlama')}</option>
                  <option value="General">{t('modelGeneral')}</option>
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#858585] uppercase tracking-wider">{t('inputCategory')}</label>
                <select
                  id="select-share-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-[#cccccc] text-xs focus:border-[#0e639c] focus:outline-none transition cursor-pointer"
                >
                  <option value="Resume">Resume</option>
                  <option value="Documentation">Documentation</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Blog">Blog</option>
                  <option value="Planning">Planning</option>
                  <option value="Report">Report</option>
                  <option value="HarnessEngineering">HarnessEngineering</option>
                  <option value="하네스엔지니어링">하네스엔지니어링</option>
                  <option value="General">General</option>
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#858585] uppercase tracking-wider">{t('inputAuthor')}</label>
              <input
                id="input-share-author"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder={t('inputAuthorPl')}
                className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-[#cccccc] placeholder-[#555555] text-xs focus:border-[#0e639c] focus:outline-none transition"
              />
            </div>
          </div>

          {/* 푸터 및 제출 버튼 */}
          <div className="pt-4 border-t border-[#3c3c3c] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShareOpen(false)}
              className="px-4 py-2 text-xs font-semibold bg-[#3a3d41] hover:bg-[#464b50] border border-[#3c3c3c] text-white rounded transition cursor-pointer"
            >
              {t('close')}
            </button>
            <button
              id="btn-share-submit"
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold bg-[#0e639c] hover:bg-[#1177bb] text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? '...' : t('submitShare')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
