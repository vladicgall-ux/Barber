import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { createUserSessionCookie } from '../../../../lib/auth/session';
import { toPublicUser } from '../../../../lib/auth/publicUser';

// GET /api/auth/code/poll?pollToken=...
// The browser polls this every few seconds while showing the 6-digit code.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pollToken } = req.query;
  if (!pollToken) return res.status(400).json({ error: 'pollToken is required' });

  const { data: row, error } = await supabaseAdmin
    .from('auth_codes')
    .select('*')
    .eq('poll_token', pollToken)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!row) return res.status(404).json({ status: 'not_found' });

  if (row.status === 'pending' && new Date(row.expires_at).getTime() < Date.now()) {
    await supabaseAdmin.from('auth_codes').update({ status: 'expired' }).eq('id', row.id);
    return res.status(200).json({ status: 'expired' });
  }

  if (row.status === 'pending') {
    return res.status(200).json({ status: 'pending' });
  }

  if (row.status === 'expired') {
    return res.status(200).json({ status: 'expired' });
  }

  // status === 'claimed'
  if (!row.user_id) return res.status(200).json({ status: 'pending' });

  const { data: user } = await supabaseAdmin.from('users').select('*').eq('id', row.user_id).maybeSingle();
  if (!user) return res.status(200).json({ status: 'pending' });

  res.setHeader('Set-Cookie', createUserSessionCookie(user.id));
  return res.status(200).json({ status: 'confirmed', user: toPublicUser(user) });
}
