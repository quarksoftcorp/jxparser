import { create } from 'zustand';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import {
  TreeNode,
  jsonToTree,
  treeToJson,
  xmlToTree,
  treeToXml,
  mdToTree,
  treeToMd,
  formatTabIndent,
  generateId
} from '../utils/parser';
import { mobileCache } from '../utils/mobileBridge';
import { db, auth, googleProvider } from '../utils/firebase';
import { collection, getDocs, addDoc, query, orderBy, limit, Timestamp, doc, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { User, signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';

export interface TabFile {
  id: string;
  name: string;
  type: 'json' | 'xml' | 'md';
  content: string;
  tree: TreeNode;
  isDirty: boolean;
  error?: string;
}

export interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  filePath: string;
  author: string;
  stars?: number;
  forks?: number;
  uid?: string;
  starredUids?: string[];
  isPrompt?: boolean;
  targetModel?: string;
}

interface EditorState {
  files: TabFile[];
  activeTabId: string | null;
  exampleOpen: boolean;
  locale: 'ko' | 'en';
  templateStoreOpen: boolean;
  templates: Template[];
  templatesLoading: boolean;
  templatesError: string | null;

  // 사용자 인증 상태 추가
  user: User | null;
  authLoading: boolean;

  // 공유 스토어 상태 추가
  shareOpen: boolean;
  storeTab: 'official' | 'community' | 'prompt' | 'mine';
  communityTemplates: Template[];
  communityLoading: boolean;
  communityError: string | null;

  // Actions
  addTab: (type: 'json' | 'xml' | 'md', name?: string, content?: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateContent: (content: string) => void;
  updateTree: (tree: TreeNode) => void;
  formatActiveFile: () => void;
  setExampleOpen: (open: boolean) => void;
  loadExample: (type: 'json' | 'xml' | 'md') => void;
  setLocale: (locale: 'ko' | 'en') => void;
  t: (key: string) => string;
  loadCachedFiles: () => Promise<void>;
  exportActiveFile: () => Promise<void>;
  setTemplateStoreOpen: (open: boolean) => void;
  fetchTemplates: () => Promise<void>;
  loadTemplate: (template: Template) => Promise<void>;

  // 사용자 인증 액션 추가
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  initializeAuth: () => void;

  // 공유 스토어 액션 추가
  setShareOpen: (open: boolean) => void;
  setStoreTab: (tab: 'official' | 'community' | 'prompt' | 'mine') => void;
  shareTemplate: (title: string, description: string, category: string, author: string, isPrompt?: boolean, targetModel?: string) => Promise<boolean>;
  fetchCommunityTemplates: () => Promise<void>;
  starTemplate: (templateId: string) => Promise<void>;
  forkTemplate: (template: Template) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<boolean>;
}

// 예제 데이터 정의
const EXAMPLES = {
  json: `{
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
}`,
  xml: `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <appName>JxmParser</appName>
  <version>1.0.0</version>
  <features>
    <feature>JSON/XML/MD Multi-Tab</feature>
    <feature>Interactive Tree Viewer</feature>
    <feature>Auto Formatting</feature>
    <feature>Tab Indent Constraint</feature>
  </features>
  <author>
    <name>개발자</name>
    <email>contact@developer.com</email>
  </author>
  <isActive>true</isActive>
</root>`,
  md: `# JxmParser

JxmParser는 다양한 텍스트 포맷을 시각화하고 편집할 수 있는 강력한 도구입니다.

## 주요 기능
- **멀티 탭 지원**: JSON, XML, Markdown을 동시에 띄워놓고 작업할 수 있습니다.
- **트리 뷰어**: 구조화된 트리를 보면서 간편하게 노드별 편집을 수행합니다.
- **자동 포맷팅**: 코드를 저장하거나 전환할 때 이쁘게 포맷팅됩니다.

### 사용 방법
1. 왼쪽 에디터에 텍스트를 입력합니다.
2. 오른쪽 트리 뷰어에 실시간으로 구조가 나타납니다.
3. 트리 노드를 클릭하여 값을 수정하면 에디터에도 즉시 반영됩니다.`
};

// RxJS Subject를 이용한 에디터 내용 파싱 디바운스 처리
const contentUpdateSubject = new Subject<{ fileId: string; content: string; type: 'json' | 'xml' | 'md' }>();

export const useEditorStore = create<EditorState>((set, get) => {
  // RxJS 구독 설정: 타이핑 할 때 300ms 디바운스 적용 후 트리 구조 백그라운드 파싱
  contentUpdateSubject.pipe(debounceTime(300)).subscribe(({ fileId, content, type }) => {
    try {
      let tree: TreeNode;
      if (type === 'json') {
        tree = jsonToTree(content);
      } else if (type === 'xml') {
        tree = xmlToTree(content);
      } else {
        tree = mdToTree(content);
      }

      set(state => ({
        files: state.files.map(f =>
          f.id === fileId ? { ...f, tree, error: undefined } : f
        )
      }));
    } catch (err: any) {
      // 파싱 실패 시 에러 상태 업데이트 (트리는 이전 상태 유지)
      set(state => ({
        files: state.files.map(f =>
          f.id === fileId ? { ...f, error: err.message || 'Parsing error' } : f
        )
      }));
    }
  });

  // 캐시 자동 저장 헬퍼
  const persist = () => {
    mobileCache.setItem('cached_files', JSON.stringify(get().files));
  };

  return {
    files: [],
    activeTabId: null,
    exampleOpen: false,
    locale: 'ko',
    templateStoreOpen: false,
    templates: [],
    templatesLoading: false,
    templatesError: null,

    // 사용자 인증 기본 상태
    user: null,
    authLoading: true,

    // 공유 스토어 기본 상태
    shareOpen: false,
    storeTab: 'official',
    communityTemplates: [],
    communityLoading: false,
    communityError: null,

    addTab: (type, name, content) => {
      const id = generateId();
      const tabName = name || `Untitled.${type}`;
      const defaultContent = content !== undefined ? content : (type === 'json' ? '{}' : type === 'xml' ? '<root></root>' : '');
      
      let tree: TreeNode;
      try {
        if (type === 'json') tree = jsonToTree(defaultContent);
        else if (type === 'xml') tree = xmlToTree(defaultContent);
        else tree = mdToTree(defaultContent);
      } catch (err) {
        tree = { id: generateId(), key: 'root', type: 'root', children: [] };
      }

      const newFile: TabFile = {
        id,
        name: tabName,
        type,
        content: defaultContent,
        tree,
        isDirty: false
      };

      set(state => ({
        files: [...state.files, newFile],
        activeTabId: id
      }));

      persist();
    },

    closeTab: id => {
      set(state => {
        const nextFiles = state.files.filter(f => f.id !== id);
        let nextActiveId = state.activeTabId;
        if (state.activeTabId === id) {
          nextActiveId = nextFiles.length > 0 ? nextFiles[nextFiles.length - 1].id : null;
        }
        return {
          files: nextFiles,
          activeTabId: nextActiveId
        };
      });

      persist();
    },

    setActiveTab: id => {
      set({ activeTabId: id });
    },

    updateContent: content => {
      const { files, activeTabId } = get();
      if (!activeTabId) return;

      const activeFile = files.find(f => f.id === activeTabId);
      if (!activeFile) return;

      set(state => ({
        files: state.files.map(f =>
          f.id === activeTabId ? { ...f, content, isDirty: true } : f
        )
      }));

      contentUpdateSubject.next({ fileId: activeTabId, content, type: activeFile.type });
      
      // 조금 뒤에 파싱이 끝나서 트리가 업데이트되므로, 디바운스 파트와 타이핑 파트 둘 다 반영되도록 즉시 콘텐츠 캐싱
      persist();
    },

    updateTree: tree => {
      const { files, activeTabId } = get();
      if (!activeTabId) return;

      const activeFile = files.find(f => f.id === activeTabId);
      if (!activeFile) return;

      let content = '';
      try {
        if (activeFile.type === 'json') {
          content = treeToJson(tree);
        } else if (activeFile.type === 'xml') {
          content = treeToXml(tree);
        } else {
          content = treeToMd(tree);
        }
      } catch (err) {
        console.error('Tree serialization failed', err);
        return;
      }

      set(state => ({
        files: state.files.map(f =>
          f.id === activeTabId ? { ...f, tree, content, isDirty: true, error: undefined } : f
        )
      }));

      persist();
    },

    formatActiveFile: () => {
      const { files, activeTabId } = get();
      if (!activeTabId) return;

      const activeFile = files.find(f => f.id === activeTabId);
      if (!activeFile) return;

      try {
        let formattedContent = '';
        if (activeFile.type === 'json') {
          const parsed = JSON.parse(activeFile.content);
          formattedContent = JSON.stringify(parsed, null, 2);
        } else if (activeFile.type === 'xml') {
          formattedContent = treeToXml(activeFile.tree);
        } else {
          formattedContent = formatTabIndent(treeToMd(activeFile.tree));
        }

        set(state => ({
          files: state.files.map(f =>
            f.id === activeTabId ? { ...f, content: formattedContent } : f
          )
        }));

        persist();
      } catch (err) {
        console.error('Formatting failed', err);
      }
    },

    setExampleOpen: open => {
      set({ exampleOpen: open });
    },

    loadExample: type => {
      const content = EXAMPLES[type];
      const name = `example.${type}`;
      get().addTab(type, name, content);
      set({ exampleOpen: false });
    },

    setLocale: locale => {
      set({ locale });
    },

    t: key => {
      const { locale } = get();
      return TRANSLATIONS[locale]?.[key] || key;
    },

    loadCachedFiles: async () => {
      try {
        const cachedData = await mobileCache.getItem('cached_files');
        if (cachedData) {
          const parsedFiles: TabFile[] = JSON.parse(cachedData);
          if (Array.isArray(parsedFiles) && parsedFiles.length > 0) {
            set({
              files: parsedFiles,
              activeTabId: parsedFiles[parsedFiles.length - 1].id
            });
          }
        }
      } catch (err) {
        console.error('Failed to load cached files', err);
      }
    },

    exportActiveFile: async () => {
      const { files, activeTabId } = get();
      if (!activeTabId) return;

      const activeFile = files.find(f => f.id === activeTabId);
      if (!activeFile) return;

      try {
        await mobileCache.exportFile(activeFile.name, activeFile.content);
        // 내보내기 성공 시 dirty 플래그 리셋
        set(state => ({
          files: state.files.map(f =>
            f.id === activeTabId ? { ...f, isDirty: false } : f
          )
        }));
        persist();
      } catch (err) {
        console.error('Export failed', err);
      }
    },

    setTemplateStoreOpen: open => {
      set({ templateStoreOpen: open });
    },

    fetchTemplates: async () => {
      set({ templatesLoading: true, templatesError: null });
      try {
        const res = await fetch('https://raw.githubusercontent.com/daimontech/jxmparser-templates/main/index.json');
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        set({ templates: data, templatesLoading: false });
      } catch (err: any) {
        console.warn('Failed to fetch from GitHub, trying local fallback...', err);
        try {
          const fallbackRes = await fetch('/templates/index.json');
          if (!fallbackRes.ok) throw new Error('Local fallback templates also failed to load');
          const fallbackData = await fallbackRes.json();
          set({ templates: fallbackData, templatesLoading: false });
        } catch (fallbackErr: any) {
          set({ templatesError: fallbackErr.message || 'Failed to load templates', templatesLoading: false });
        }
      }
    },

    loadTemplate: async template => {
      set({ templatesLoading: true, templatesError: null });
      try {
        let content = '';
        // 커뮤니티 템플릿의 경우 content가 메타데이터에 직접 포함되도록 설계하므로 분기 처리
        if ('content' in template && (template as any).content) {
          content = (template as any).content;
        } else {
          try {
            const res = await fetch(`https://raw.githubusercontent.com/daimontech/jxmparser-templates/main/${template.filePath}`);
            if (!res.ok) throw new Error('Failed to fetch from GitHub');
            content = await res.text();
          } catch (githubErr) {
            console.warn(`Failed to load ${template.filePath} from GitHub, trying local fallback...`, githubErr);
            const fallbackRes = await fetch(`/templates/${template.filePath}`);
            if (!fallbackRes.ok) throw new Error('Local fallback template file failed to load');
            content = await fallbackRes.text();
          }
        }
        get().addTab('md', `${template.id}.md`, content);
        set({ templateStoreOpen: false, templatesLoading: false });
      } catch (err: any) {
        console.error('Failed to load template content', err);
        set({ templatesError: err.message || 'Failed to download template', templatesLoading: false });
      }
    },

    setShareOpen: open => {
      set({ shareOpen: open });
    },

    setStoreTab: tab => {
      set({ storeTab: tab });
    },

    shareTemplate: async (title, description, category, author, isPrompt = false, targetModel = '') => {
      const { files, activeTabId, user, t } = get();
      if (!user) {
        alert(t('loginRequired'));
        return false;
      }
      if (!activeTabId) return false;
      const activeFile = files.find(f => f.id === activeTabId);
      if (!activeFile || activeFile.type !== 'md') return false;

      const templateData = {
        title,
        description,
        category,
        author: author.trim() || user.displayName || 'Anonymous',
        uid: user.uid,
        content: activeFile.content,
        createdAt: new Date().toISOString(),
        isPrompt,
        targetModel: isPrompt ? targetModel : ''
      };

      if (!db) {
        // Fallback: Firebase 설정이 없는 경우 로컬 스토리지에 Mock 저장
        console.warn('Firebase is not configured. Saving template to local Mock store.');
        try {
          const localDataStr = localStorage.getItem('local_shared_templates') || '[]';
          const localTemplates = JSON.parse(localDataStr);
          const newMockTemplate = {
            id: `local-tmpl-${generateId()}`,
            ...templateData,
            filePath: ''
          };
          localTemplates.unshift(newMockTemplate);
          localStorage.setItem('local_shared_templates', JSON.stringify(localTemplates));
          set({ shareOpen: false });
          get().fetchCommunityTemplates();
          return true;
        } catch (localErr) {
          console.error('Failed to save to local mock store', localErr);
          return false;
        }
      }

      // Firestore에 등록
      try {
        await addDoc(collection(db, 'shared_templates'), {
          ...templateData,
          createdAt: Timestamp.now()
        });
        set({ shareOpen: false });
        get().fetchCommunityTemplates();
        return true;
      } catch (err) {
        console.error('Failed to add document to firestore', err);
        return false;
      }
    },

    fetchCommunityTemplates: async () => {
      set({ communityLoading: true, communityError: null });
      
      if (!db) {
        // Fallback: 로컬 스토리지 데이터 로드
        try {
          const localDataStr = localStorage.getItem('local_shared_templates') || '[]';
          const localTemplates: Template[] = JSON.parse(localDataStr);
          set({ communityTemplates: localTemplates, communityLoading: false });
        } catch (localErr: any) {
          set({ communityError: localErr.message || 'Failed to load local templates', communityLoading: false });
        }
        return;
      }

      // Firestore 데이터 로드
      try {
        const q = query(collection(db, 'shared_templates'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedTemplates: Template[] = [];
        querySnapshot.forEach((snapshotDoc) => {
          const data = snapshotDoc.data();
          fetchedTemplates.push({
            id: snapshotDoc.id,
            title: data.title || '',
            description: data.description || '',
            category: data.category || 'General',
            filePath: '',
            author: data.author || 'Anonymous',
            uid: data.uid || '',
            content: data.content || '',
            stars: data.stars || 0,
            forks: data.forks || 0,
            starredUids: data.starredUids || [],
            isPrompt: data.isPrompt !== undefined ? data.isPrompt : true,
            targetModel: data.targetModel || 'General'
          } as any);
        });
        set({ communityTemplates: fetchedTemplates, communityLoading: false });
      } catch (err: any) {
        console.error('Firestore query failed. It might be due to missing indexes or permission rules.', err);
        // Firestore 쿼리 실패 시 로컬 스토리지로 2차 fallback 제공
        try {
          const localDataStr = localStorage.getItem('local_shared_templates') || '[]';
          const localTemplates: Template[] = JSON.parse(localDataStr);
          set({ communityTemplates: localTemplates, communityLoading: false });
        } catch {
          set({ communityError: err.message || 'Failed to load community templates', communityLoading: false });
        }
      }
    },

    starTemplate: async templateId => {
      const { user, t } = get();
      if (!user) {
        alert(t('loginRequired'));
        return;
      }

      // 대상 템플릿의 기존 추천 UID 목록 확보
      const targetTemplate = get().communityTemplates.find(tmpl => tmpl.id === templateId) || get().templates.find(tmpl => tmpl.id === templateId);
      const currentStarredUids = targetTemplate?.starredUids || [];
      const hasStarred = currentStarredUids.includes(user.uid);

      // 토글 상태 계산
      const nextStarredUids = hasStarred 
        ? currentStarredUids.filter(uid => uid !== user.uid)
        : [...currentStarredUids, user.uid];
      const nextStars = nextStarredUids.length;

      // 상태 업데이트 헬퍼
      const updateStarInState = () => {
        set(state => ({
          communityTemplates: state.communityTemplates.map(tmpl =>
            tmpl.id === templateId ? { ...tmpl, stars: nextStars, starredUids: nextStarredUids } : tmpl
          ),
          templates: state.templates.map(tmpl =>
            tmpl.id === templateId ? { ...tmpl, stars: nextStars, starredUids: nextStarredUids } : tmpl
          )
        }));
      };

      if (!db) {
        // Fallback: 로컬 Mock 데이터 추천 토글
        try {
          const localDataStr = localStorage.getItem('local_shared_templates') || '[]';
          const localTemplates: any[] = JSON.parse(localDataStr);
          const updatedTemplates = localTemplates.map(tmpl =>
            tmpl.id === templateId ? { ...tmpl, stars: nextStars, starredUids: nextStarredUids } : tmpl
          );
          localStorage.setItem('local_shared_templates', JSON.stringify(updatedTemplates));
          updateStarInState();
        } catch (err) {
          console.error('Failed to update stars in local mock store', err);
        }
        return;
      }

      // Firestore 추천 토글 반영
      try {
        const docRef = doc(db, 'shared_templates', templateId);
        await updateDoc(docRef, {
          stars: nextStars,
          starredUids: nextStarredUids
        });
        updateStarInState();
      } catch (err) {
        console.error('Failed to update stars in firestore', err);
      }
    },

    forkTemplate: async template => {
      let content = '';
      if ('content' in template && (template as any).content) {
        content = (template as any).content;
      } else {
        try {
          const res = await fetch(`https://raw.githubusercontent.com/daimontech/jxmparser-templates/main/${template.filePath}`);
          if (!res.ok) throw new Error('Failed to fetch from GitHub');
          content = await res.text();
        } catch (githubErr) {
          const fallbackRes = await fetch(`/templates/${template.filePath}`);
          if (!fallbackRes.ok) throw new Error('Fallback template failed');
          content = await fallbackRes.text();
        }
      }

      // 상태 업데이트 헬퍼
      const incrementForkInState = () => {
        set(state => ({
          communityTemplates: state.communityTemplates.map(t =>
            t.id === template.id ? { ...t, forks: (t.forks || 0) + 1 } : t
          ),
          templates: state.templates.map(t =>
            t.id === template.id ? { ...t, forks: (t.forks || 0) + 1 } : t
          )
        }));
      };

      if (!db) {
        // Fallback: 로컬 Mock 데이터 포크
        try {
          const localDataStr = localStorage.getItem('local_shared_templates') || '[]';
          const localTemplates: any[] = JSON.parse(localDataStr);
          const updatedTemplates = localTemplates.map(t =>
            t.id === template.id ? { ...t, forks: (t.forks || 0) + 1 } : t
          );
          localStorage.setItem('local_shared_templates', JSON.stringify(updatedTemplates));
          incrementForkInState();
        } catch (err) {
          console.error('Failed to update forks in local mock store', err);
        }
      } else {
        // Firestore 포크 수 업
        try {
          // 커뮤니티 템플릿의 경우에만 Firestore 카운트 업데이트 진행 (공식 템플릿은 id가 docId 형식이 아니거나 문서가 없을 수 있음)
          if (template.id.startsWith('local-tmpl-') === false && template.filePath === '') {
            const docRef = doc(db, 'shared_templates', template.id);
            await updateDoc(docRef, {
              forks: increment(1)
            });
          }
          incrementForkInState();
        } catch (err) {
          console.error('Failed to update forks in firestore', err);
        }
      }

      // 에디터 새 탭으로 로드
      get().addTab('md', `${template.title} (Forked).md`, content);
      set({ templateStoreOpen: false });
      alert(get().t('forkSuccessAlert'));
    },

    signInWithGoogle: async () => {
      if (!auth) {
        alert('Firebase Auth가 설정되어 있지 않습니다.');
        return;
      }
      set({ authLoading: true });
      try {
        const result = await signInWithPopup(auth, googleProvider);
        set({ user: result.user, authLoading: false });
      } catch (err: any) {
        console.error('Google 로그인 실패:', err);
        set({ authLoading: false });
        alert(`로그인 실패: ${err.message}`);
      }
    },

    signOutUser: async () => {
      if (!auth) return;
      try {
        await fbSignOut(auth);
        set({ user: null });
      } catch (err) {
        console.error('로그아웃 실패:', err);
      }
    },

    initializeAuth: () => {
      if (!auth) {
        set({ authLoading: false });
        return;
      }
      onAuthStateChanged(auth, (user) => {
        set({ user, authLoading: false });
      });
    },

    deleteTemplate: async (templateId) => {
      const { user, t } = get();
      if (!user) {
        alert(t('loginRequired'));
        return false;
      }

      // 로컬 Mock 템플릿 삭제
      if (templateId.startsWith('local-tmpl-')) {
        try {
          const localDataStr = localStorage.getItem('local_shared_templates') || '[]';
          const localTemplates: any[] = JSON.parse(localDataStr);
          const updatedTemplates = localTemplates.filter(t => t.id !== templateId);
          localStorage.setItem('local_shared_templates', JSON.stringify(updatedTemplates));
          
          set(state => ({
            communityTemplates: state.communityTemplates.filter(t => t.id !== templateId)
          }));
          alert(t('deleteSuccess'));
          return true;
        } catch (err) {
          console.error(err);
          return false;
        }
      }

      if (!db) {
        return false;
      }

      // Firestore 템플릿 삭제
      try {
        const docRef = doc(db, 'shared_templates', templateId);
        await deleteDoc(docRef);
        
        set(state => ({
          communityTemplates: state.communityTemplates.filter(t => t.id !== templateId)
        }));
        alert(t('deleteSuccess'));
        return true;
      } catch (err: any) {
        console.error('Failed to delete template from firestore', err);
        alert(`${t('deleteFail')}: ${err.message}`);
        return false;
      }
    }
  };
});

// 번역 데이터 정의
const TRANSLATIONS: Record<string, Record<string, string>> = {
  ko: {
    title: 'JxmParser 에디터',
    subtitle: 'JSON, XML, MD 트리 뷰어 & 에디터',
    newJson: 'JSON 새 탭',
    newXml: 'XML 새 탭',
    newMd: 'MD 새 탭',
    example: '예제 불러오기',
    format: '코드 포맷',
    export: '저장 / 공유',
    noTabs: '열려 있는 파일이 없습니다. 새 탭을 추가하거나 예제를 로드해보세요.',
    treeTitle: '🌳 트리 구조 뷰어 (클릭하여 편집 가능)',
    emptyTree: '비어 있거나 해석할 수 없는 구조입니다.',
    parserError: '파싱 에러',
    placeholder: '여기에 소스 코드를 입력하거나 트리 구조를 클릭해 보세요...',
    selectExample: '💡 사용 예제(Example) 선택',
    exampleDesc: '원하는 형식의 사용 예제를 선택하면 새 편집 탭이 자동으로 생성되고 깔끔한 트리 구조로 시각화됩니다.',
    close: '닫기',
    jsonExample: 'JSON 예제 (애플리케이션 스택)',
    xmlExample: 'XML 예제 (설정 구성 파일)',
    mdExample: 'Markdown 예제 (프로젝트 설명서)',
    jsonExampleDesc: 'Zustand 설정, 특징 목록 등이 포함된 구조화된 JSON 데이터 예시입니다.',
    xmlExampleDesc: '태그 엘리먼트 및 중첩 태그, XML 선언부가 포함된 표준 XML 포맷 예시입니다.',
    mdExampleDesc: '헤더(Heading), 목록(List Item), 굵은 글씨 등 마크다운의 대표 구조 예시입니다.',
    storeBtn: '📚 템플릿 스토어',
    storeTitle: '📚 마크다운 템플릿 스토어',
    storeDesc: '공식 템플릿과 다른 사용자들이 공유한 커뮤니티 템플릿을 불러옵니다.',
    storeLoading: '템플릿 목록을 가져오는 중입니다...',
    storeError: '템플릿을 불러오는 데 실패했습니다.',
    retry: '재시도',
    author: '작성자',
    download: '로드하기',
    allCategories: '전체 카테고리',
    tabOfficial: '🎈 공식 템플릿',
    tabCommunity: '👥 커뮤니티 공유',
    tabPrompt: '🤖 AI 프롬프트',
    tabMine: '👤 내가 올린 템플릿',
    shareBtn: '🔗 공유하기',
    shareTitle: '📢 템플릿 스토어에 공유',
    shareDesc: '현재 편집 중인 마크다운 문서를 공개 스토어에 업로드하여 다른 사람들과 공유해보세요.',
    inputTitle: '템플릿 제목',
    inputTitlePl: '예: 리액트 컴포넌트 개발 가이드',
    inputDesc: '템플릿 설명',
    inputDescPl: '이 마크다운 템플릿이 어떤 내용을 담고 있는지 설명해 주세요.',
    inputCategory: '카테고리',
    inputAuthor: '작성자 이름',
    inputAuthorPl: '기본값: 익명',
    submitShare: '스토어에 공유하기',
    shareSuccess: '템플릿이 스토어에 공유되었습니다!',
    shareFail: '공유에 실패했습니다. 마크다운 파일만 공유할 수 있습니다.',
    activeTabAlert: '마크다운(.md) 파일이 열려있지 않으면 스토어에 공유할 수 없습니다.',
    starredAlert: '이미 이 템플릿을 추천하셨습니다.',
    starSuccessAlert: '이 템플릿을 추천했습니다!',
    forkSuccessAlert: '템플릿이 에디터로 성공적으로 복제(Fork)되었습니다.',
    sortNewest: '최신순',
    sortStars: '추천수 랭킹',
    sortForks: '포크수 랭킹',
    rankGold: '🥇 1위',
    rankSilver: '🥈 2위',
    rankBronze: '🥉 3위',
    importBtn: '파일 불러오기',
    importFail: '파일을 불러오지 못했습니다. .json, .xml, .md 형식만 지원합니다.',
    dropZoneText: '파일을 여기에 드롭하여 새 탭으로 열기',
    loginRequired: '이 기능을 사용하려면 로그인이 필요합니다.',
    deleteSuccess: '템플릿이 삭제되었습니다.',
    deleteFail: '템플릿 삭제에 실패했습니다.',
    confirmDelete: '정말로 이 템플릿을 삭제하시겠습니까?',
    loginBtn: '구글 로그인',
    logoutBtn: '로그아웃',
    myTemplates: '내가 올린 템플릿',
    isPromptTemplate: '이 템플릿을 AI 프롬프트로 등록',
    targetModelLabel: '대상 AI 모델',
    modelGemini: 'Google Gemini',
    modelGPT: 'OpenAI GPT',
    modelClaude: 'Anthropic Claude',
    modelLlama: 'Meta LLaMA',
    modelGeneral: '공통/기타',
    filterAllModels: '모든 AI 모델'
  },
  en: {
    title: 'JxmParser Editor',
    subtitle: 'JSON, XML, MD Tree Viewer & Editor',
    newJson: 'New JSON',
    newXml: 'New XML',
    newMd: 'New MD',
    example: 'Load Example',
    format: 'Format Code',
    export: 'Save & Share',
    noTabs: 'No open files. Add a new tab or load an example to start.',
    treeTitle: '🌳 Tree Structure Viewer (Click to Edit)',
    emptyTree: 'Empty or unparseable structure.',
    parserError: 'Parser Error',
    placeholder: 'Input your source code here or interact with the tree structure...',
    selectExample: '💡 Select Template Example',
    exampleDesc: 'Select an example templates. A new editor tab will open and display in an interactive tree view.',
    close: 'Close',
    jsonExample: 'JSON Example (App Stack)',
    xmlExample: 'XML Example (Config File)',
    mdExample: 'Markdown Example (Project Document)',
    jsonExampleDesc: 'Structured JSON data featuring Zustand configs, features list, etc.',
    xmlExampleDesc: 'Standard XML format with tag elements, nesting, and XML declaration.',
    mdExampleDesc: 'Standard Markdown syntax with Headings, list items, and bold text.',
    storeBtn: '📚 Template Store',
    storeTitle: '📚 GitHub Markdown Template Store',
    storeDesc: 'Fetch high-quality Markdown templates from GitHub open-source repository.',
    storeLoading: 'Loading templates list from GitHub...',
    storeError: 'Failed to fetch templates.',
    retry: 'Retry',
    author: 'Author',
    download: 'Load Template',
    allCategories: 'All Categories',
    tabOfficial: '🎈 Official Templates',
    tabCommunity: '👥 Community Shared',
    tabPrompt: '🤖 AI Prompts',
    tabMine: '👤 My Templates',
    sortNewest: 'Newest',
    sortStars: 'Most Starred',
    sortForks: 'Most Forked',
    rankGold: '🥇 1st',
    rankSilver: '🥈 2nd',
    rankBronze: '🥉 3rd',
    importBtn: 'Import File',
    importFail: 'Failed to import file. Only .json, .xml, and .md formats are supported.',
    dropZoneText: 'Drop files here to open in new tab',
    loginRequired: 'Login is required to use this feature.',
    deleteSuccess: 'Template has been deleted.',
    deleteFail: 'Failed to delete template.',
    confirmDelete: 'Are you sure you want to delete this template?',
    loginBtn: 'Google Login',
    logoutBtn: 'Sign Out',
    myTemplates: 'My Templates',
    isPromptTemplate: 'Register as AI Prompt Template',
    targetModelLabel: 'Target AI Model',
    modelGemini: 'Google Gemini',
    modelGPT: 'OpenAI GPT',
    modelClaude: 'Anthropic Claude',
    modelLlama: 'Meta LLaMA',
    modelGeneral: 'General',
    filterAllModels: 'All AI Models'
  }
};;

