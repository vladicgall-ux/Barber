import { useState } from 'react';

// Shown instead of the booking form whenever the visitor isn't signed in,
// or is signed in but hasn't confirmed a phone / provided a name yet.
export default function AuthGate({ user, codeState, onRequestCode, vkDebug, rawDebug }) {
  if (!user) {
    return (
      <div className="bg-charcoal border border-white/10 rounded-xl p-5 space-y-4 text-center">
        <h3 className="font-bold">Вход через бота</h3>
        <p className="text-white/50 text-sm">
          Внутри Telegram, MAX или VK вход выполняется автоматически. В обычном браузере
          получите код и отправьте его в один из чатов ниже.
        </p>

        {rawDebug && (
          <pre className="text-left text-[10px] text-green-400/80 bg-black/30 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all">
            Raw debug: {JSON.stringify(rawDebug, null, 2)}
          </pre>
        )}

        {vkDebug && (
          <pre className="text-left text-[10px] text-yellow-400/80 bg-black/30 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all">
            VK debug: {JSON.stringify(vkDebug, null, 2)}
          </pre>
        )}

        {!codeState && (
          <button
            type="button"
            onClick={onRequestCode}
            className="w-full bg-white text-graphite font-bold rounded-xl py-3"
          >
            Получить код для входа
          </button>
        )}

        {codeState && codeState.status === 'pending' && <PendingCode codeState={codeState} />}

        {codeState && codeState.status === 'expired' && (
          <div className="space-y-3">
            <p className="text-red-400 text-sm">Код истёк.</p>
            <button
              type="button"
              onClick={onRequestCode}
              className="w-full bg-white text-graphite font-bold rounded-xl py-3"
            >
              Получить новый код
            </button>
          </div>
        )}
      </div>
    );
  }

  if (user.isBanned) {
    return (
      <div className="bg-charcoal border border-red-500/30 rounded-xl p-5 text-center text-red-400 text-sm">
        Ваш аккаунт заблокирован администратором.
      </div>
    );
  }

  if (!user.firstName || !user.lastName) {
    return (
      <div className="bg-charcoal border border-white/10 rounded-xl p-5 text-center space-y-2">
        <h3 className="font-bold">Укажите имя и фамилию</h3>
        <p className="text-white/50 text-sm">
          Отправьте боту сообщение с именем и фамилией (например: Иван Иванов), чтобы продолжить запись.
        </p>
      </div>
    );
  }

  return null;
}

function PendingCode({ codeState }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(codeState.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the code is already shown on screen.
    }
  }

  const channels = [
    { key: 'telegram', label: 'Telegram', url: codeState.telegramChatUrl, Icon: TelegramIcon },
    { key: 'max', label: 'MAX', url: codeState.maxChatUrl, Icon: MaxIcon },
    { key: 'vk', label: 'VK', url: codeState.vkChatUrl, Icon: VkIcon },
  ].filter((c) => c.url);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-3">
        <div className="text-3xl font-extrabold tracking-[0.3em]">{codeState.code}</div>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs bg-white/10 hover:bg-white/20 text-white rounded-lg px-2.5 py-1.5 shrink-0"
        >
          {copied ? 'Скопировано ✓' : 'Копировать'}
        </button>
      </div>

      <p className="text-white/40 text-xs">
        Откройте чат и отправьте туда этот код. Код действует 10 минут.
      </p>

      {channels.length > 0 && (
        <div className="flex items-center justify-center gap-4">
          {channels.map(({ key, label, url, Icon }) => (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 text-white/70 hover:text-white"
            >
              <span className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-white/5 border border-white/10">
                <Icon />
              </span>
              <span className="text-[11px]">{label}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 240 240" width="48" height="48">
      <circle cx="120" cy="120" r="120" fill="#29A9EA" />
      <path
        fill="#fff"
        d="M170 72l-22.6 106.6c-1.7 7.6-6.2 9.4-12.5 5.9l-34.6-25.5-16.7 16.1c-1.8 1.8-3.4 3.4-6.9 3.4l2.5-35.2 64-57.8c2.8-2.5-.6-3.9-4.3-1.4l-79.1 49.8-34.1-10.7c-7.4-2.3-7.6-7.4 1.6-11l133.3-51.4c6.2-2.3 11.6 1.5 9.4 11.2z"
      />
    </svg>
  );
}

function MaxIcon() {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48">
      <rect width="48" height="48" rx="24" fill="#111318" />
      <text x="50%" y="56%" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="16" fill="#fff">
        MAX
      </text>
    </svg>
  );
}

function VkIcon() {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48">
      <rect width="48" height="48" rx="24" fill="#0077FF" />
      <text x="50%" y="57%" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="17" fill="#fff">
        VK
      </text>
    </svg>
  );
}
