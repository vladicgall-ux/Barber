import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="ru">
      <Head>
        <meta charSet="utf-8" />
        <title>BLACK BEARD — барбершоп</title>
        <meta name="description" content="Онлайн-запись в барбершоп BLACK BEARD, Кунашак" />

        {/* PWA / add-to-home-screen: icon + name shown on Android and iOS */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <meta name="theme-color" content="#141414" />
        <meta name="background-color" content="#141414" />

        {/* iOS: open as a standalone app from the home screen, correct title */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BLACK BEARD" />
        <meta name="format-detection" content="telephone=no" />

        {/* Android: standalone display via manifest above */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="BLACK BEARD" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Telegram Web App SDK */}
        <script src="https://telegram.org/js/telegram-web-app.js" />
        {/* VK Mini Apps Bridge */}
        <script src="https://unpkg.com/@vkontakte/vk-bridge/dist/browser.min.js" />
      </Head>
      <body className="bg-graphite text-white antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
