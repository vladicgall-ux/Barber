import { supabaseAdmin } from '../supabaseAdmin';
import { upsertUserByTelegramId, upsertUserByMaxId } from '../auth/upsertUser';

const SIX_DIGIT_CODE = /^\s*(\d{6})\s*$/;
const NAME_PAIR = /^\s*([^\s]+)\s+([^\s]+)\s*$/;

// Shared conversational logic for the "enter this code" browser login, phone
// confirmation, and name collection — used by both the Telegram and MAX
// webhooks, which differ only in how they send/receive messages.
//
// `platform` is 'telegram' | 'max'. `send(text, options)` sends a reply in
// the current chat; `requestContactKeyboard()` returns a platform-specific
// reply markup that shows a "share phone number" button.
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
  const upsert = platform === 'telegram' ? upsertUserByTelegramId : upsertUserByMaxId;

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

  const codeMatch = text && text.match(SIX_DIGIT_CODE);
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
      })
      .eq('id', pending.id);

    await send('Вы вошли на сайт ✅ Вернитесь во вкладку браузера — вход выполнен автоматически.');

    if (!user.phone_confirmed) {
      await send('Чтобы записываться на услуги, подтвердите номер телефона:', {
        replyMarkup: requestContactKeyboard(),
      });
    }
    return;
  }

  // 2) Looks like "Имя Фамилия" — only accept it for a known user missing a name.
  const nameMatch = text && text.match(NAME_PAIR);
  if (nameMatch) {
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq(platform === 'telegram' ? 'telegram_id' : 'max_id', platformUserId)
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
  await send(
    'Привет! Я бот барбершопа BLACK BEARD.\n\n' +
      '• Чтобы войти на сайте с компьютера — введите там 6-значный код и пришлите его сюда.\n' +
      '• Чтобы записываться на услуги, поделитесь номером телефона.',
    { replyMarkup: requestContactKeyboard() }
  );
}
