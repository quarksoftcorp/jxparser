import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JxmParser - JSON, XML, MD Tree Viewer & Editor",
  description: "JSON, XML, Markdown(MD) 파일을 직관적인 트리 구조로 시각화하여 편리하게 탐색하고 편집할 수 있는 다국어 지원 에디터 서비스입니다.",
  keywords: ["JSON parser", "XML parser", "Markdown viewer", "Tree viewer", "Code editor", "JSON beautifier", "XML formatter", "Markdown editor", "JxmParser", "JSON 트리 뷰어", "XML 트리 뷰어"],
  authors: [{ name: "개발자", url: "https://github.com/jxmparser" }],
  creator: "개발자",
  publisher: "개발자",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: "https://jxmparser-daimontech.web.app",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://jxmparser-daimontech.web.app",
    title: "JxmParser - JSON, XML, MD Tree Viewer & Editor",
    description: "JSON, XML, Markdown(MD) 파일을 직관적인 트리 구조로 시각화하여 편리하게 탐색하고 편집할 수 있는 다국어 지원 에디터 서비스입니다.",
    siteName: "JxmParser",
  },
  twitter: {
    card: "summary_large_image",
    title: "JxmParser - JSON, XML, MD Tree Viewer & Editor",
    description: "JSON, XML, Markdown(MD) 파일을 직관적인 트리 구조로 시각화하여 편리하게 탐색하고 편집할 수 있는 다국어 지원 에디터 서비스입니다.",
  },
  verification: {
    google: "rnHCiAVi7iZsDCnA-Jt9gVoLNx6tTrVflmHlYiGRlVA",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className={`${outfit.variable} ${jetbrainsMono.variable} font-sans bg-slate-950 text-slate-100 min-h-full flex flex-col antialiased`}>
        {children}
      </body>
    </html>
  );
}
