import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hitgram — Build Your Best Self',
  description: 'AI-powered fitness, health tracking and IRA voice AI platform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Hitgram',
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    title: 'Hitgram — Build Your Best Self',
    description: 'AI-powered health and fitness platform with IRA voice AI',
    siteName: 'Hitgram',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hitgram',
    description: 'AI-powered health and fitness platform',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
    shortcut: '/icons/icon-192.png',
  },
  keywords: ['fitness', 'health', 'AI', 'workout', 'nutrition', 'IRA', 'Hitgram'],
}

export const viewport: Viewport = {
  themeColor: '#AAFF00',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Hitgram"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <meta name="apple-mobile-web-app-title" content="Hitgram"/>
        <meta name="mobile-web-app-capable" content="yes"/>
        <meta name="msapplication-TileColor" content="#AAFF00"/>
        <meta name="msapplication-tap-highlight" content="no"/>

        {/* Apple touch icons */}
        <link rel="apple-touch-icon" href="/icons/icon-192.png"/>
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png"/>
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png"/>

        {/* Splash screens for iOS */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(registration) {
                    console.log('Hitgram SW registered:', registration.scope);
                  })
                  .catch(function(err) {
                    console.log('Hitgram SW error:', err);
                  });
              });
            }
          `
        }}/>
      </body>
    </html>
  )
}