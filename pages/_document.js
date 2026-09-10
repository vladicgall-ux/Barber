import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="ru">
      <Head>
        <meta charSet="utf-8" />
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
