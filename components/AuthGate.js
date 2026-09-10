// Shown instead of the booking form whenever the visitor isn't signed in,
// or is signed in but hasn't confirmed a phone / provided a name yet.
export default function AuthGate({ user, codeState, onRequestCode }) {
  if (!user) {
    return (
      <div className="bg-charcoal border border-white/10 rounded-xl p-5 space-y-4 text-center">
        <h3 className="font-bold">Вход через бота</h3>
        <p className="text-white/50 text-sm">
          Внутри Telegram или MAX вход выполняется автоматически. В обычном браузере
          получите код и отправьте его нашему боту в Telegram или MAX.
        </p>

        {!codeState && (
          <button
            type="button"
            onClick={onRequestCode}
            className="w-full bg-white text-graphite font-bold rounded-xl py-3"
          >
            Получить код для входа
          </button>
        )}

        {codeState && codeState.status === 'pending' && (
          <div className="space-y-2">
            <div className="text-3xl font-extrabold tracking-[0.3em]">{codeState.code}</div>
            <p className="text-white/40 text-xs">
              Отправьте этот код боту {codeState.telegramBotUsername ? `@${codeState.telegramBotUsername}` : ''}
              {codeState.maxBotUsername ? ` или @${codeState.maxBotUsername} в MAX` : ''}. Код действует 10 минут.
            </p>
          </div>
        )}

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

  if (!user.phoneConfirmed) {
    return (
      <div className="bg-charcoal border border-white/10 rounded-xl p-5 text-center space-y-2">
        <h3 className="font-bold">Подтвердите телефон</h3>
        <p className="text-white/50 text-sm">
          Откройте чат с нашим ботом и нажмите «Поделиться номером телефона», чтобы записаться на услугу.
        </p>
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
