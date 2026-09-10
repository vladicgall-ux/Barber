// Detects whether the app is running inside Telegram Mini App, MAX Mini App,
// or plain VK Bridge context, and exposes a couple of helpers (haptics,
// closing the app).
//
// NOTE: `window.WebApp` is this project's assumed global for the MAX Mini
// App SDK (mirroring Telegram's `window.Telegram.WebApp` naming, since MAX
// Mini Apps sign their initData with the same scheme). Adjust the check
// below once MAX's actual SDK script/global is confirmed.

export function getPlatform() {
  if (typeof window === 'undefined') return 'web';
  if (window.Telegram?.WebApp?.initData) return 'telegram';
  if (window.WebApp?.initData) return 'max';
  // vk-bridge is loaded on every page load (see _document.js), so its mere
  // presence doesn't mean we're actually inside VK — only the launch params
  // VK appends to the URL do.
  if (/vk_app_id/.test(window.location.search)) return 'vk';
  return 'web';
}

export function getInitDataRaw(platform) {
  if (typeof window === 'undefined') return null;
  if (platform === 'telegram') return window.Telegram?.WebApp?.initData || null;
  if (platform === 'max') return window.WebApp?.initData || null;
  return null;
}

export function initPlatform() {
  if (typeof window === 'undefined') return;

  const platform = getPlatform();

  if (platform === 'telegram' && window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
  }

  if (platform === 'vk' && window.vkBridge) {
    window.vkBridge.send('VKWebAppInit').catch(() => {});
  }

  return platform;
}

export function hapticSuccess() {
  if (typeof window === 'undefined') return;
  const platform = getPlatform();
  if (platform === 'telegram' && window.Telegram?.WebApp?.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
  }
  if (platform === 'vk' && window.vkBridge) {
    window.vkBridge.send('VKWebAppTapticNotificationOccurred', { type: 'success' }).catch(() => {});
  }
}
