import { useEffect, useState } from 'react';

// Embedded directly in the main app — no separate route, no password.
// Only ever rendered when the caller has already confirmed user.isAdmin.
export default function AdminPanel({ masters, onClose }) {
  const [appointments, setAppointments] = useState([]);
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterMaster, setFilterMaster] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDate, filterMaster]);

  async function loadAppointments() {
    setLoading(true);
    setActionError('');
    const params = new URLSearchParams();
    if (filterDate) params.set('date', filterDate);
    if (filterMaster) params.set('masterId', filterMaster);

    const res = await fetch(`/api/admin/appointments?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) {
      setActionError(data.error || 'Не удалось загрузить записи');
      setAppointments([]);
    } else {
      setAppointments(data.appointments || []);
    }
    setLoading(false);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Записи клиентов</h2>
        <button type="button" onClick={onClose} className="text-sm text-white/50 hover:text-white">
          Закрыть
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
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
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setFilterDate('')} className="text-sm text-white/50 hover:text-white px-2">
          Сбросить дату
        </button>
      </div>

      {actionError && <div className="text-red-400 text-sm mb-3">{actionError}</div>}

      <div className="space-y-3">
        {loading && <div className="text-center py-6 text-white/40 text-sm">Загрузка...</div>}
        {!loading && appointments.length === 0 && (
          <div className="text-center py-6 text-white/40 text-sm">Записей нет</div>
        )}
        {!loading &&
          appointments.map((a) => (
            <div key={a.id} className="bg-charcoal border border-white/10 rounded-xl p-4 text-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">
                  {a.appointment_date} · {String(a.appointment_time).slice(0, 5)}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    a.status === 'confirmed' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  {a.status === 'confirmed' ? 'Активна' : 'Отменена'}
                </span>
              </div>
              <div className="text-white/70 space-y-0.5">
                <div>{a.client_name} · {a.client_phone}</div>
                <div className="text-white/40">
                  {a.services?.name} — {a.masters?.name}
                </div>
              </div>
              {a.status === 'confirmed' && (
                <button
                  type="button"
                  onClick={() => handleCancel(a.id)}
                  className="mt-3 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg px-3 py-1.5"
                >
                  Отменить запись
                </button>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
