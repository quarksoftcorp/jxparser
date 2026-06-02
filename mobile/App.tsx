import React, { useRef } from 'react';
import { StyleSheet, SafeAreaView, Alert, Platform } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { MMKV } from 'react-native-mmkv';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// 1. MMKV 인스턴스 초기화
const storage = new MMKV();

// 2. 웹뷰에 로드할 Next.js 에디터 주소 (개발 시 로컬 서버, 배포 시 배포 URL로 매핑)
// 안드로이드 에뮬레이터에서는 localhost 대신 10.0.2.2를 사용해야 로컬 PC 서버에 접근 가능
const WEB_URL = Platform.select({
  ios: 'http://localhost:3000',
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
});

export default function App() {
  const webViewRef = useRef<WebView>(null);

  // 웹뷰로부터 메시지 수신 및 처리 (Bridge)
  const handleMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      const { type, key, value, filename, content, requestId } = data;

      // 1. MMKV에서 데이터 조회 (GET_ITEM)
      if (type === 'GET_ITEM') {
        const storedValue = storage.getString(key) || '';
        sendResponse(requestId, { success: true, value: storedValue });
      }
      
      // 2. MMKV에 데이터 저장 (SET_ITEM)
      else if (type === 'SET_ITEM') {
        storage.set(key, value);
        sendResponse(requestId, { success: true });
      }

      // 3. MMKV에서 데이터 삭제 (REMOVE_ITEM)
      else if (type === 'REMOVE_ITEM') {
        storage.delete(key);
        sendResponse(requestId, { success: true });
      }

      // 4. 모바일 공유 시트를 통한 파일 저장 및 내보내기 (EXPORT_FILE)
      else if (type === 'EXPORT_FILE') {
        if (!content || !filename) {
          throw new Error('파일명과 내용이 누락되었습니다.');
        }

        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        
        // 로컬 임시 폴더에 파일 쓰기
        await FileSystem.writeAsStringAsync(fileUri, content, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        // 시스템 공유 다이얼로그 호출
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
          sendResponse(requestId, { success: true });
        } else {
          Alert.alert('공유 실패', '이 디바이스에서는 파일 공유 기능을 사용할 수 없습니다.');
          sendResponse(requestId, { success: false, error: 'Sharing not available' });
        }
      }
    } catch (err: any) {
      console.error('WebView Bridge Error:', err);
      Alert.alert('오류', `브릿지 통신 중 에러가 발생했습니다: ${err.message}`);
    }
  };

  // 웹뷰로 데이터 응답 전송
  const sendResponse = (requestId: string, payload: any) => {
    if (!webViewRef.current) return;
    const jsCode = `
      if (window.onNativeResponse) {
        window.onNativeResponse('${requestId}', ${JSON.stringify(payload)});
      }
      true;
    `;
    webViewRef.current.injectJavaScript(jsCode);
  };

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_URL }}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        style={styles.webview}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // Next.js bg-slate-950 색상과 통일
  },
  webview: {
    flex: 1,
    backgroundColor: '#020617',
  },
});
