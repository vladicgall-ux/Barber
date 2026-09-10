// Detects whether the app is running inside Telegram Web App or VK Mini App,
// and exposes a couple of helpers (haptics, theme, closing the app).

export function getPlatform() {
  if (typeof window === 'undefined') return 'web';
  if (window.Telegram?.WebApp?.initData) return 'telegram';
  if (window.vkBridge || /vk_app_id/.test(window.location.search)) return 'vk';
  return 'web';
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
