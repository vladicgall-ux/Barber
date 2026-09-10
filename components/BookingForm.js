import { useState } from 'react';

export default function BookingForm({ onSubmit, submitting, summary }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (name.trim().length < 2) {
      setError('Введите ваше имя');
      return;
    }
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Введите корректный номер телефона');
      return;
    }

    onSubmit({ name: name.trim(), phone: phone.trim() });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {summary && (
        <div className="bg-charcoal border border-white/10 rounded-xl p-4 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-white/50">Услуга</span>
            <span className="font-medium">{summary.serviceName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Мастер</span>
            <span className="font-medium">{summary.masterName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Дата и время</span>
            <span className="font-medium">{summary.date}, {summary.time}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-white/10">
            <span className="text-white/50">Стоимость</span>
            <span className="font-semibold text-silver">{summary.price}₽</span>
          </div>
        </div>
      )}

      <div>
        <label className="text-xs text-white/50 mb-1 block">Ваше имя</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Иван"
          className="w-full bg-charcoal border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-silver"
        />
      </div>

      <div>
        <label className="text-xs text-white/50 mb-1 block">Телефон</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+7 900 000 00 00"
          inputMode="tel"
          className="w-full bg-charcoal border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-silver"
        />
      </div>

      {error && <div className="text-red-400 text-sm">{error}</div>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-white text-graphite font-bold rounded-xl py-3 disabled:opacity-50 transition-opacity"
      >
        {submitting ? 'Записываем...' : 'Записаться'}
      </button>
    </form>
  );
}
