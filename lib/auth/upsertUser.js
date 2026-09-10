import { supabaseAdmin } from '../supabaseAdmin';

// Creates or updates a user by their Telegram or MAX id, refreshing their
// name from the platform's initData on every login.
export async function upsertUserByTelegramId(telegramId, { firstName, lastName } = {}) {
  return upsertUser({ telegram_id: telegramId }, { firstName, lastName });
}

export async function upsertUserByMaxId(maxId, { firstName, lastName } = {}) {
  return upsertUser({ max_id: maxId }, { firstName, lastName });
}

async function upsertUser(identity, { firstName, lastName }) {
  const column = identity.telegram_id != null ? 'telegram_id' : 'max_id';
  const value = identity[column];

  const { data: existing, error: findErr } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq(column, value)
    .maybeSingle();

  if (findErr) throw findErr;

  if (existing) {
    const patch = {};
    if (firstName && !existing.first_name) patch.first_name = firstName;
    if (lastName && !existing.last_name) patch.last_name = lastName;
    if (Object.keys(patch).length === 0) return existing;

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('users')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (updateErr) throw updateErr;
    return updated;
  }

  const { data: created, error: insertErr } = await supabaseAdmin
    .from('users')
    .insert({ [column]: value, first_name: firstName || null, last_name: lastName || null })
    .select()
    .single();
  if (insertErr) throw insertErr;
  return created;
}
