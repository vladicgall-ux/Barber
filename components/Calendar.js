import { useMemo, useState } from 'react';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function Calendar({ selectedDate, onSelect, closedDates = [] }) {
  const closedSet = useMemo(() => new Set(closedDates), [closedDates]);
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const days = useMemo(() => {
    const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const startWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < startWeekday; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) {
      cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
    }
    return cells;
  }, [viewMonth]);

  const maxBookingDate = useMemo(() => {
    const max = new Date(today);
    max.setDate(max.getDate() + 60);
    return max;
  }, [today]);

  function changeMonth(delta) {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  return (
    <div className="bg-charcoal border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="w-8 h-8 rounded-lg bg-steel flex items-center justify-center text-white/70 hover:text-white"
          aria-label="Предыдущий месяц"
        >
          ‹
        </button>
        <div className="font-semibold">
          {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </div>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="w-8 h-8 rounded-lg bg-steel flex items-center justify-center text-white/70 hover:text-white"
          aria-label="Следующий месяц"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-white/40 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;

          const iso = toISODate(day);
          const isPast = day < today;
          const isTooFar = day > maxBookingDate;
          const isClosed = closedSet.has(iso);
          const disabled = isPast || isTooFar || isClosed;
          const isSelected = selectedDate === iso;
          const isToday = toISODate(today) === iso;

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(iso)}
              title={isClosed ? 'Барбершоп не работает в этот день' : undefined}
              className={`aspect-square rounded-lg text-sm flex items-center justify-center transition-all ${
                isClosed
                  ? 'text-red-400/40 line-through cursor-not-allowed'
                  : disabled
                  ? 'text-white/20 cursor-not-allowed'
                  : isSelected
                  ? 'bg-white text-graphite font-bold'
                  : isToday
                  ? 'border border-silver text-white hover:bg-steel'
                  : 'text-white/80 hover:bg-steel'
              }`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
