const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const WEB_URL = 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, '..', 'metadata');

const DEVICES = [
  {
    name: 'web_desktop',
    width: 1920,
    height: 1080,
    isMobile: false,
    folder: 'web',
    filename: 'screenshot_desktop.png'
  },
  {
    name: 'ios_iphone',
    width: 430,
    height: 932,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    folder: 'ios',
    filename: 'screenshot_iphone.png'
  },
  {
    name: 'android_pixel',
    width: 412,
    height: 915,
    deviceScaleFactor: 2.6,
    isMobile: true,
    hasTouch: true,
    folder: 'android',
    filename: 'screenshot_android.png'
  }
];

async function captureScreenshots() {
  console.log('🚀 스크린샷 자동 생성 스크립트 시작');
  
  // 출력 디렉토리 확인
  DEVICES.forEach(dev => {
    const dir = path.join(OUTPUT_DIR, dev.folder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    for (const dev of DEVICES) {
      console.log(`📸 [${dev.name}] 캡처 중... (${dev.width}x${dev.height})`);

      // 뷰포트 설정
      await page.setViewport({
        width: dev.width,
        height: dev.height,
        deviceScaleFactor: dev.deviceScaleFactor || 1,
        isMobile: dev.isMobile,
        hasTouch: dev.hasTouch || false
      });

      // 페이지 이동
      await page.goto(WEB_URL, { waitUntil: 'networkidle2' });

      // 잠시 에디터 및 UI 렌더링 대기
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 스크린샷 캡처 및 저장
      const outputPath = path.join(OUTPUT_DIR, dev.folder, dev.filename);
      await page.screenshot({ path: outputPath, fullPage: false });
      console.log(`✅ 저장 완료: ${outputPath}`);
    }

  } catch (err) {
    console.error('❌ 스크린샷 생성 중 오류 발생:', err.message);
    console.log('💡 로컬 서버(npm run dev)가 http://localhost:3000 에서 실행 중인지 확인하세요.');
  } finally {
    await browser.close();
    console.log('🏁 스크린샷 자동 생성 프로세스 종료');
  }
}

captureScreenshots();
