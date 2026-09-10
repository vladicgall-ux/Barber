import { useCallback, useEffect, useRef, useState } from 'react';
import { getPlatform, getInitDataRaw, getVkQueryString } from './platform';

// Drives the four login channels described in the app's auth design:
//  - Telegram Mini App: auto-login via signed initData (X-Telegram-Init-Data)
//  - MAX Mini App: auto-login via signed initData (X-Max-Init-Data)
//  - VK Mini App: auto-login via VK's own signed launch params (query string)
//  - Plain browser: 6-digit code the user sends to the bot, polled here
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [codeState, setCodeState] = useState(null); // { code, pollToken, expiresAt, status }
  const [vkDebug, setVkDebug] = useState(null);
  const pollTimer = useRef(null);

  const refreshMe = useCallback(async () => {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    setUser(data.user || null);
    return data.user || null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const platform = getPlatform();

      if (platform === 'telegram' || platform === 'max') {
        const initDataRaw = getInitDataRaw(platform);
        if (initDataRaw) {
          const headerName = platform === 'telegram' ? 'X-Telegram-Init-Data' : 'X-Max-Init-Data';
          await fetch(`/api/auth/${platform}`, {
            method: 'POST',
            headers: { [headerName]: initDataRaw },
          }).catch(() => {});
        }
      }

      if (platform === 'vk') {
        const queryString = getVkQueryString();
        if (queryString) {
          // Best-effort: ask VK for the user's name/phone via the bridge so
          // a fresh account doesn't have to go through the bot phone-share
          // flow (which VK users, having no bot chat here, can't reach).
          const [profile, phoneResult] = await Promise.all([
            window.vkBridge?.send('VKWebAppGetUserInfo').catch(() => null),
            window.vkBridge?.send('VKWebAppGetPhoneNumber').catch(() => null),
          ]);

          try {
            const res = await fetch('/api/auth/vk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                queryString,
                firstName: profile?.first_name,
                lastName: profile?.last_name,
                phone: phoneResult?.phone_number,
              }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) setVkDebug({ status: res.status, ...data, queryString });
          } catch (e) {
            setVkDebug({ networkError: String(e), queryString });
          }
        } else {
          setVkDebug({ noQueryString: true });
        }
      }

      if (!cancelled) {
        await refreshMe();
        setLoading(false);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [refreshMe]);

  const requestLoginCode = useCallback(async () => {
    const res = await fetch('/api/auth/code/request', { method: 'POST' });
    const data = await res.json();
    setCodeState({ ...data, status: 'pending' });
    return data;
  }, []);

  useEffect(() => {
    if (!codeState || codeState.status !== 'pending') return undefined;

    pollTimer.current = setInterval(async () => {
      const res = await fetch(`/api/auth/code/poll?pollToken=${codeState.pollToken}`);
      const data = await res.json();

      if (data.status === 'confirmed') {
        clearInterval(pollTimer.current);
        setUser(data.user);
        setCodeState((prev) => (prev ? { ...prev, status: 'confirmed' } : prev));
      } else if (data.status === 'expired' || data.status === 'not_found') {
        clearInterval(pollTimer.current);
        setCodeState((prev) => (prev ? { ...prev, status: 'expired' } : prev));
      }
    }, 3000);

    return () => clearInterval(pollTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeState?.pollToken, codeState?.status]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setCodeState(null);
  }, []);

  return { user, loading, codeState, requestLoginCode, logout, refreshMe, vkDebug };
}
