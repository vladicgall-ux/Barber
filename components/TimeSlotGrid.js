import { groupSlotsByBlock } from '../lib/timeSlots';

export default function TimeSlotGrid({ slots, selectedTime, onSelect, loading }) {
  if (loading) {
    return <div className="text-white/40 text-sm py-6 text-center">Загрузка расписания...</div>;
  }

  if (!slots || slots.length === 0) {
    return <div className="text-white/40 text-sm py-6 text-center">Выберите дату</div>;
  }

  const blocks = groupSlotsByBlock(slots.map((s) => s.time));
  const slotMap = Object.fromEntries(slots.map((s) => [s.time, s.available]));

  return (
    <div className="space-y-4">
      {Object.entries(blocks).map(([label, times]) => {
        if (times.length === 0) return null;
        return (
          <div key={label}>
            <div className="text-xs uppercase tracking-wide text-white/40 mb-2">{label}</div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {times.map((time) => {
                const available = slotMap[time];
                const isSelected = selectedTime === time;
                return (
                  <button
                    key={time}
                    type="button"
                    disabled={!available}
                    onClick={() => onSelect(time)}
                    className={`py-2 rounded-lg text-sm font-medium transition-all border ${
                      !available
                        ? 'border-white/5 bg-black/20 text-white/20 line-through cursor-not-allowed'
                        : isSelected
                        ? 'bg-white text-graphite border-white'
                        : 'border-white/10 bg-charcoal text-white/80 hover:border-white/30'
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
