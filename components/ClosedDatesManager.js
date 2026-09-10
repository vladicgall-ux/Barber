import { useEffect, useState } from 'react';
import { ALL_SLOTS } from '../lib/timeSlots';

// Lets the admin close a range of dates — either the whole day or just a
// time window on each — for the whole barbershop or just one master.
//
// A master-scoped admin (adminMasterId set) can only close days off for
// their own master — the master picker is locked to that master instead
// of offering "весь барбершоп" or other masters. The server enforces the
// same restriction independently (pages/api/admin/closed-dates.js), so
// this is a convenience, not the only guard.
export default function ClosedDatesManager({ masters, adminMasterId }) {
  const [closedDates, setClosedDates] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [masterId, setMasterId] = useState(adminMasterId || ''); // '' = whole shop
  const [startTime, setStartTime] = useState(''); // '' = whole day
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/closed-dates');
    const data = await res.json();
    if (res.ok) setClosedDates(data.closedDates || []);
    setLoading(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    if (!startDate) return;

    const res = await fetch('/api/admin/closed-dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate,
        endDate: endDate || startDate,
        masterId: masterId || null,
        reason: reason.trim() || null,
        startTime: startTime || null,
        endTime: endTime || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Не удалось закрыть даты');
      return;
    }
    setStartDate('');
    setEndDate('');
    setStartTime('');
    setEndTime('');
    setReason('');
    load();
  }

  async function handleRemove(id) {
    setError('');
    const res = await fetch('/api/admin/closed-dates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Не удалось открыть дату');
      return;
    }
    load();
  }

  return (
    <div className="bg-charcoal border border-white/10 rounded-xl p-4 mb-4">
      <h3 className="font-bold mb-3">Выходные дни</h3>

      <form onSubmit={handleAdd} className="space-y-2 mb-3">
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-xs text-white/40 w-full sm:w-auto">Даты</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="bg-graphite border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
          />
          <span className="text-white/30 text-xs">по (необязательно)</span>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-graphite border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-xs text-white/40 w-full sm:w-auto">Время (пусто = весь день)</label>
          <select
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="bg-graphite border border-white/10 rounded-lg px-2 py-2 text-white text-sm"
          >
            <option value="">Весь день</option>
            {ALL_SLOTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {startTime && (
            <>
              <span className="text-white/30 text-xs">до</span>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-graphite border border-white/10 rounded-lg px-2 py-2 text-white text-sm"
              >
                <option value="">Выберите время</option>
                {ALL_SLOTS.filter((t) => t > startTime).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {adminMasterId ? (
            <div className="bg-graphite border border-white/10 rounded-lg px-3 py-2 text-white/60 text-sm">
              Мастер: {masters.find((m) => m.id === adminMasterId)?.name || '—'}
            </div>
          ) : (
            <select
              value={masterId}
              onChange={(e) => setMasterId(e.target.value)}
              className="bg-graphite border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="">Весь барбершоп</option>
              {masters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Причина (необязательно)"
            className="bg-graphite border border-white/10 rounded-lg px-3 py-2 text-white text-sm flex-1 min-w-[140px]"
          />
          <button type="submit" className="bg-white text-graphite font-bold rounded-lg px-4 py-2 text-sm">
            Закрыть
          </button>
        </div>
      </form>

      {error && <div className="text-red-400 text-sm mb-2">{error}</div>}

      <div className="space-y-1.5">
        {loading && <div className="text-white/40 text-sm">Загрузка...</div>}
        {!loading && closedDates.length === 0 && (
          <div className="text-white/40 text-sm">Выходных дней не назначено</div>
        )}
        {!loading &&
          closedDates.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between bg-graphite border border-white/10 rounded-lg px-3 py-2 text-sm"
            >
              <div>
                <span className="font-medium">{c.date}</span>
                <span className="text-white/40">
                  {' '}
                  · {c.start_time && c.end_time
                    ? `${c.start_time.slice(0, 5)}–${c.end_time.slice(0, 5)}`
                    : 'весь день'}
                </span>
                <span className="text-white/40"> · {c.masters?.name || 'Весь барбершоп'}</span>
                {c.reason && <span className="text-white/30"> · {c.reason}</span>}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(c.id)}
                className="text-xs text-white/50 hover:text-white shrink-0 ml-2"
              >
                Открыть
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
