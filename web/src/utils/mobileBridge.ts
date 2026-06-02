// 모바일 WebView 브릿지 유틸리티

interface PendingPromise {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

const pendingPromises = new Map<string, PendingPromise>();

// 브릿지 요청 고유 ID 생성
const generateRequestId = () => Math.random().toString(36).substring(2, 15);

// 모바일 웹뷰 환경 확인
export const isMobileApp = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).ReactNativeWebView;
};

// 모바일 앱으로 메시지 전송 및 응답 대기 (Promise)
const sendNativeMessage = <T = any>(type: string, payload: Record<string, any> = {}): Promise<T> => {
  return new Promise((resolve, reject) => {
    if (!isMobileApp()) {
      reject(new Error('모바일 앱 환경이 아닙니다.'));
      return;
    }

    const requestId = generateRequestId();
    pendingPromises.set(requestId, { resolve, reject });

    const message = {
      type,
      requestId,
      ...payload
    };

    (window as any).ReactNativeWebView.postMessage(JSON.stringify(message));

    // 브릿지 응답 타임아웃 처리 (5초)
    setTimeout(() => {
      if (pendingPromises.has(requestId)) {
        const promise = pendingPromises.get(requestId);
        promise?.reject(new Error(`Native Bridge Timeout: ${type}`));
        pendingPromises.delete(requestId);
      }
    }, 5000);
  });
};

// 모바일로부터 응답을 받는 글로벌 리스너 설정
if (typeof window !== 'undefined') {
  (window as any).onNativeResponse = (requestId: string, response: any) => {
    if (pendingPromises.has(requestId)) {
      const { resolve, reject } = pendingPromises.get(requestId)!;
      if (response.success) {
        resolve(response.value);
      } else {
        reject(new Error(response.error || 'Native bridge failed'));
      }
      pendingPromises.delete(requestId);
    }
  };
}

export const mobileCache = {
  // MMKV에서 값 조회
  getItem: async (key: string): Promise<string> => {
    if (!isMobileApp()) return localStorage.getItem(key) || '';
    return sendNativeMessage<string>('GET_ITEM', { key });
  },

  // MMKV에 값 기록
  setItem: async (key: string, value: string): Promise<void> => {
    if (!isMobileApp()) {
      localStorage.setItem(key, value);
      return;
    }
    await sendNativeMessage('SET_ITEM', { key, value });
  },

  // MMKV에서 값 삭제
  removeItem: async (key: string): Promise<void> => {
    if (!isMobileApp()) {
      localStorage.removeItem(key);
      return;
    }
    await sendNativeMessage('REMOVE_ITEM', { key });
  },

  // 모바일 공유 다이얼로그로 파일 출력
  exportFile: async (filename: string, content: string): Promise<void> => {
    if (!isMobileApp()) {
      // 웹 브라우저 환경에서는 파일 다운로드 트리거
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }
    await sendNativeMessage('EXPORT_FILE', { filename, content });
  }
};
