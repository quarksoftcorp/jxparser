import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAmlwbz_BiVi0ggbLN4RSea68t0dyjjIiM",
  authDomain: "jxmparser.firebaseapp.com",
  projectId: "jxmparser",
  storageBucket: "jxmparser.firebasestorage.app",
  messagingSenderId: "1026460056284",
  appId: "1:1026460056284:web:40d84eabc0866c2a98d219",
};

let db: Firestore | null = null;
let auth: Auth | null = null;
const googleProvider = new GoogleAuthProvider();

// 클라이언트 사이드에서 필수 설정값이 있을 때만 초기화 진행
if (typeof window !== 'undefined' && firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
} else {
  console.warn('Firebase client config is missing. Fallback local mock mode will be active.');
}

export { db, auth, googleProvider };
