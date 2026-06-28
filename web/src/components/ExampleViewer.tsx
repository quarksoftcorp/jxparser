import React from 'react';
import { useEditorStore } from '../store/editorStore';

export const ExampleViewer: React.FC = () => {
  const { exampleOpen, setExampleOpen, loadExample } = useEditorStore();

  if (!exampleOpen) return null;

  const examples = [
    {
      type: 'json' as const,
      title: 'JSON 예제 (애플리케이션 스택)',
      desc: 'Zustand 설정, 특징 목록 등이 포함된 구조화된 JSON 데이터 예시입니다.'
    },
    {
      type: 'xml' as const,
      title: 'XML 예제 (설정 구성 파일)',
      desc: '태그 엘리먼트 및 중첩 태그, XML 선언부가 포함된 표준 XML 포맷 예시입니다.'
    },
    {
      type: 'md' as const,
      title: 'Markdown 예제 (프로젝트 설명서)',
      desc: '헤더(Heading), 목록(List Item), 굵은 글씨 등 마크다운의 대표 구조 예시입니다.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#181818]/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#252526] border border-[#3c3c3c] rounded overflow-hidden shadow-2xl">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#252526] border-b border-[#3c3c3c]">
          <h3 className="text-sm font-bold text-white">💡 사용 예제(Example) 선택</h3>
          <button
            onClick={() => setExampleOpen(false)}
            className="text-[#858585] hover:text-[#cccccc] transition text-lg"
          >
            ✕
          </button>
        </div>

        {/* 모달 바디 */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-[#858585]">
            원하는 형식의 사용 예제를 선택하면 새 편집 탭이 자동으로 생성되고 깔끔한 트리 구조로 시각화됩니다.
          </p>

          <div className="space-y-3">
            {examples.map(ex => (
              <button
                key={ex.type}
                onClick={() => loadExample(ex.type)}
                className="w-full text-left p-4 bg-[#1e1e1e] hover:bg-[#2d2d2d] border border-[#3c3c3c] hover:border-[#555555] rounded transition flex justify-between items-center group cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white group-hover:text-[#4fc1ff] transition">
                      {ex.title}
                    </span>
                    <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-[#3a3d41] text-[#cccccc] font-mono">
                      {ex.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#858585] leading-normal">{ex.desc}</p>
                </div>
                <span className="text-[#858585] group-hover:text-[#4fc1ff] transition pl-4">➔</span>
              </button>
            ))}
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="px-6 py-3 bg-[#252526] border-t border-[#3c3c3c] flex justify-end">
          <button
            onClick={() => setExampleOpen(false)}
            className="px-4 py-2 text-xs font-semibold bg-[#3a3d41] hover:bg-[#464b50] border border-[#3c3c3c] text-white rounded transition cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
