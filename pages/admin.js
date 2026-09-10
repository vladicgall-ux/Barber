import { useEffect, useState } from 'react';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  const [masters, setMasters] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterMaster, setFilterMaster] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    fetch('/api/admin/appointments?date=' + new Date().toISOString().slice(0, 10))
      .then((r) => {
        if (r.status === 401) {
          setAuthed(false);
        } else if (r.ok) {
          setAuthed(true);
        }
      })
      .finally(() => setCheckingSession(false));

    fetch('/api/masters').then((r) => r.json()).then((d) => setMasters(d.masters || []));
  }, []);

  useEffect(() => {
    if (authed) loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, filterDate, filterMaster]);

  async function loadAppointments() {
    setLoading(true);
    setActionError('');
    const params = new URLSearchParams();
    if (filterDate) params.set('date', filterDate);
    if (filterMaster) params.set('masterId', filterMaster);

    const res = await fetch(`/api/admin/appointments?${params.toString()}`);
    if (res.status === 401) {
      setAuthed(false);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setAppointments(data.appointments || []);
    setLoading(false);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setLoginError(data.error || 'Ошибка входа');
      return;
    }
    setAuthed(true);
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthed(false);
  }

  async function handleCancel(appointmentId) {
    setActionError('');
    const res = await fetch('/api/admin/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(data.error || 'Не удалось отменить запись');
      return;
    }
    loadAppointments();
  }

  if (checkingSession) {
    return <div className="min-h-screen bg-graphite" />;
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-graphite flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="w-full max-w-xs bg-charcoal border border-white/10 rounded-xl p-6 space-y-4">
          <h1 className="text-lg font-bold text-center">BLACK BEARD — Админ</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            className="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-silver"
          />
          {loginError && <div className="text-red-400 text-sm">{loginError}</div>}
          <button type="submit" className="w-full bg-white text-graphite font-bold rounded-xl py-3">
            Войти
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-graphite px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Записи клиентов</h1>
          <button onClick={handleLogout} className="text-sm text-white/50 hover:text-white">
            Выйти
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mb-5">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-charcoal border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
          />
          <select
            value={filterMaster}
            onChange={(e) => setFilterMaster(e.target.value)}
            className="bg-charcoal border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="">Все мастера</option>
            {masters.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <button
            onClick={() => setFilterDate('')}
            className="text-sm text-white/50 hover:text-white px-2"
          >
            Сбросить дату
          </button>
        </div>

        {actionError && <div className="text-red-400 text-sm mb-3">{actionError}</div>}

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-charcoal text-white/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Дата</th>
                <th className="text-left px-3 py-2 font-medium">Время</th>
                <th className="text-left px-3 py-2 font-medium">Клиент</th>
                <th className="text-left px-3 py-2 font-medium">Телефон</th>
                <th className="text-left px-3 py-2 font-medium">Услуга</th>
                <th className="text-left px-3 py-2 font-medium">Мастер</th>
                <th className="text-left px-3 py-2 font-medium">Статус</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-white/40">Загрузка...</td>
                </tr>
              )}
              {!loading && appointments.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-white/40">Записей нет</td>
                </tr>
              )}
              {!loading && appointments.map((a) => (
                <tr key={a.id} className="border-t border-white/5">
                  <td className="px-3 py-2">{a.appointment_date}</td>
                  <td className="px-3 py-2">{String(a.appointment_time).slice(0, 5)}</td>
                  <td className="px-3 py-2">{a.client_name}</td>
                  <td className="px-3 py-2">{a.client_phone}</td>
                  <td className="px-3 py-2">{a.services?.name}</td>
                  <td className="px-3 py-2">{a.masters?.name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        a.status === 'confirmed'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {a.status === 'confirmed' ? 'Активна' : 'Отменена'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {a.status === 'confirmed' && (
                      <button
                        onClick={() => handleCancel(a.id)}
                        className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg px-3 py-1.5"
                      >
                        Отменить запись
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
