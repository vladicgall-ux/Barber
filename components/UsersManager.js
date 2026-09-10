import { useEffect, useState } from 'react';

// Lets the admin see everyone who has ever logged in, ban/unban them, and
// grant or revoke admin rights — optionally scoped to one master, so that
// master's admin only gets notified about their own bookings.
export default function UsersManager({ masters }) {
  const [users, setUsers] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    const res = await fetch('/api/admin/users');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Не удалось загрузить пользователей');
    } else {
      setUsers(data.users || []);
      setCount(data.count ?? (data.users || []).length);
    }
    setLoading(false);
  }

  async function patch(userId, body) {
    setError('');
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Не удалось обновить пользователя');
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? data.user : u)));
  }

  function displayName(u) {
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ');
    if (name) return name;
    if (u.telegram_id) return `Telegram #${u.telegram_id}`;
    if (u.max_id) return `MAX #${u.max_id}`;
    if (u.vk_id) return `VK #${u.vk_id}`;
    return 'Без имени';
  }

  function platformBadge(u) {
    if (u.telegram_id) return { label: 'Telegram', classes: 'bg-sky-500/10 text-sky-400' };
    if (u.max_id) return { label: 'MAX', classes: 'bg-white/10 text-white/70' };
    if (u.vk_id) return { label: 'VK', classes: 'bg-blue-500/10 text-blue-400' };
    return null;
  }

  return (
    <div className="bg-charcoal border border-white/10 rounded-xl p-4 mb-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full"
      >
        <h3 className="font-bold">Пользователи ({count})</h3>
        <span className="text-white/40 text-sm">{expanded ? 'Скрыть' : 'Показать'}</span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-1.5">
          {error && <div className="text-red-400 text-sm mb-2">{error}</div>}
          {loading && <div className="text-white/40 text-sm">Загрузка...</div>}
          {!loading && users.length === 0 && <div className="text-white/40 text-sm">Пользователей нет</div>}

          {!loading &&
            users.map((u) => {
              const platform = platformBadge(u);
              return (
              <div key={u.id} className="bg-graphite border border-white/10 rounded-lg px-3 py-2.5 text-sm">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="font-medium truncate">{displayName(u)}</div>
                  <div className="flex gap-1.5 shrink-0">
                    {platform && (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${platform.classes}`}>
                        {platform.label}
                      </span>
                    )}
                    {u.is_admin && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-400">
                        Админ
                      </span>
                    )}
                    {u.is_banned && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400">
                        Заблокирован
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-white/40 text-xs mb-2">
                  {u.phone || 'телефон не подтверждён'}
                  {u.telegram_id && ` · Telegram #${u.telegram_id}`}
                  {u.max_id && ` · MAX #${u.max_id}`}
                  {u.vk_id && ` · VK #${u.vk_id}`}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => patch(u.id, { isAdmin: !u.is_admin })}
                    className={`text-xs rounded-lg px-2.5 py-1 ${
                      u.is_admin
                        ? 'bg-white/10 text-white/70 hover:bg-white/20'
                        : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                    }`}
                  >
                    {u.is_admin ? 'Убрать администратора' : 'Сделать администратором'}
                  </button>

                  {u.is_admin && (
                    <select
                      value={u.admin_master_id || ''}
                      onChange={(e) => patch(u.id, { adminMasterId: e.target.value || null })}
                      className="bg-charcoal border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                    >
                      <option value="">Все мастера</option>
                      {masters.map((m) => (
                        <option key={m.id} value={m.id}>
                          Уведомления только {m.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    type="button"
                    onClick={() => patch(u.id, { isBanned: !u.is_banned })}
                    className={`text-xs rounded-lg px-2.5 py-1 ${
                      u.is_banned
                        ? 'bg-white/10 text-white/70 hover:bg-white/20'
                        : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                    }`}
                  >
                    {u.is_banned ? 'Разблокировать' : 'Заблокировать'}
                  </button>
                </div>
              </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
