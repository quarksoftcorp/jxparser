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
  const [submitting, setSubmitting] = useState(false);

  if (!shareOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    const success = await shareTemplate(title, description, category, author);
    setSubmitting(false);

    if (success) {
      alert(t('shareSuccess'));
      // 입력 폼 초기화
      setTitle('');
      setDescription('');
      setCategory('Resume');
      setAuthor('');
    } else {
      alert(t('shareFail'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-5 bg-slate-900 border-b border-slate-800/80">
          <div className="space-y-1">
            <h3 className="text-lg font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-indigo-300 bg-clip-text text-transparent flex items-center gap-2">
              {t('shareTitle')}
            </h3>
            <p className="text-xs text-slate-400 leading-normal">{t('shareDesc')}</p>
          </div>
          <button
            onClick={() => setShareOpen(false)}
            className="w-8 h-8 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 폼 양식 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 제목 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('inputTitle')}</label>
            <input
              id="input-share-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('inputTitlePl')}
              className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 text-sm focus:border-cyan-500/50 focus:outline-none transition"
            />
          </div>

          {/* 설명 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('inputDesc')}</label>
            <textarea
              id="input-share-desc"
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('inputDescPl')}
              className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 text-sm focus:border-cyan-500/50 focus:outline-none transition resize-none"
            />
          </div>

          {/* 카테고리 & 작성자 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('inputCategory')}</label>
              <select
                id="select-share-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 text-sm focus:border-cyan-500/50 focus:outline-none transition cursor-pointer"
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

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('inputAuthor')}</label>
              <input
                id="input-share-author"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder={t('inputAuthorPl')}
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 text-sm focus:border-cyan-500/50 focus:outline-none transition"
              />
            </div>
          </div>

          {/* 푸터 및 제출 버튼 */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShareOpen(false)}
              className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-slate-100 border border-slate-800 hover:border-slate-700 rounded-lg transition cursor-pointer"
            >
              {t('close')}
            </button>
            <button
              id="btn-share-submit"
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-lg transition shadow-md shadow-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? '...' : t('submitShare')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
