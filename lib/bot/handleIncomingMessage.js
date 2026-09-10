import { supabaseAdmin } from '../supabaseAdmin';
import { upsertUserByTelegramId, upsertUserByMaxId, upsertUserByVkId } from '../auth/upsertUser';

// Matches a bare 6-digit code, or "/start 123456" — the latter is what
// Telegram (and, assuming parity, MAX) sends when the user opens a deep
// link like https://t.me/<bot>?start=123456, so tapping "Open chat" can
// skip having to paste the code by hand.
const CODE_PATTERN = /^\s*(?:\/start\s+)?(\d{6})\s*$/;
const NAME_PAIR = /^\s*([^\s]+)\s+([^\s]+)\s*$/;

// VK opens vk.com/app<ID> as an embedded Mini App (with automatic VK login);
// Telegram/MAX get a plain link to the site since they don't have that yet.
function appLinkLine(platform) {
  if (platform === 'vk') {
    const appId = process.env.VK_APP_ID;
    return appId ? `\n\n👉 Открыть приложение: https://vk.com/app${appId}` : '';
  }
  const url = process.env.SITE_URL;
  return url ? `\n\n👉 Открыть приложение: ${url}` : '';
}

const UPSERT_BY_PLATFORM = {
  telegram: upsertUserByTelegramId,
  max: upsertUserByMaxId,
  vk: upsertUserByVkId,
};

const ID_COLUMN_BY_PLATFORM = {
  telegram: 'telegram_id',
  max: 'max_id',
  vk: 'vk_id',
};

// Shared conversational logic for the "enter this code" browser login, phone
// confirmation, and name collection — used by the Telegram, MAX and VK
// webhooks, which differ only in how they send/receive messages.
//
// `platform` is 'telegram' | 'max' | 'vk'. `send(text, options)` sends a
// reply in the current chat; `requestContactKeyboard()` returns a
// platform-specific reply markup that shows a "share phone number" button
// (VK has no equivalent, so its webhook just returns undefined there).
export async function handleIncomingMessage({
  platform,
  platformUserId,
  firstName,
  lastName,
  text,
  contactPhone,
  send,
  requestContactKeyboard,
}) {
  const upsert = UPSERT_BY_PLATFORM[platform];
  const idColumn = ID_COLUMN_BY_PLATFORM[platform];

  // 1) User shared their phone number via the contact button.
  if (contactPhone) {
    const user = await upsert(platformUserId, { firstName, lastName });
    await supabaseAdmin
      .from('users')
      .update({ phone: contactPhone, phone_confirmed: true, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (!user.first_name || !user.last_name) {
      await send('Телефон подтверждён ✅\nТеперь отправьте, пожалуйста, ваше имя и фамилию одним сообщением (например: Иван Иванов).');
    } else {
      await send('Телефон подтверждён ✅ Теперь в приложении доступны запись и бронирование.');
    }
    return;
  }

  const codeMatch = text && text.match(CODE_PATTERN);
  if (codeMatch) {
    const code = codeMatch[1];
    const { data: pending } = await supabaseAdmin
      .from('auth_codes')
      .select('*')
      .eq('code', code)
      .eq('status', 'pending')
      .maybeSingle();

    if (!pending) {
      await send('Код не найден или уже устарел. Запросите новый код на сайте.');
      return;
    }
    if (new Date(pending.expires_at).getTime() < Date.now()) {
      await supabaseAdmin.from('auth_codes').update({ status: 'expired' }).eq('id', pending.id);
      await send('Срок действия кода истёк. Запросите новый код на сайте.');
      return;
    }

    const user = await upsert(platformUserId, { firstName, lastName });
    await supabaseAdmin
      .from('auth_codes')
      .update({
        status: 'claimed',
        user_id: user.id,
        telegram_id: platform === 'telegram' ? platformUserId : null,
        max_id: platform === 'max' ? platformUserId : null,
        vk_id: platform === 'vk' ? platformUserId : null,
      })
      .eq('id', pending.id);

    await send(`Вы вошли на сайт ✅ Вернитесь во вкладку браузера — вход выполнен автоматически.${appLinkLine(platform)}`);

    if (!user.phone_confirmed) {
      const replyMarkup = requestContactKeyboard ? requestContactKeyboard() : undefined;
      await send(
        replyMarkup
          ? 'Чтобы записываться на услуги, подтвердите номер телефона:'
          : 'Чтобы записываться на услуги, подтвердите номер телефона через приложение (в VK это делается автоматически при входе).',
        { replyMarkup }
      );
    }
    return;
  }

  // 2) Looks like "Имя Фамилия" — only accept it for a known user missing a name.
  const nameMatch = text && text.match(NAME_PAIR);
  if (nameMatch) {
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq(idColumn, platformUserId)
      .maybeSingle();

    if (existing && (!existing.first_name || !existing.last_name)) {
      await supabaseAdmin
        .from('users')
        .update({ first_name: nameMatch[1], last_name: nameMatch[2], updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      await send('Спасибо! Имя сохранено. Теперь запись на услуги доступна в приложении.');
      return;
    }
  }

  // 3) Fallback / greeting.
  const replyMarkup = requestContactKeyboard ? requestContactKeyboard() : undefined;
  await send(
    '💈 Привет! Я бот барбершопа BLACK BEARD.\n\n' +
      '🖥️ Чтобы войти на сайте с компьютера — введите там 6-значный код и пришлите его сюда.\n' +
      '📱 Чтобы записываться на услуги, поделитесь номером телефона.',
    { replyMarkup }
  );
}
