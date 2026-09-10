import { useEffect, useState } from 'react';
import Image from 'next/image';
import ServiceList from '../components/ServiceList';
import MasterSelect from '../components/MasterSelect';
import Calendar from '../components/Calendar';
import TimeSlotGrid from '../components/TimeSlotGrid';
import BookingForm from '../components/BookingForm';
import AuthGate from '../components/AuthGate';
import AdminPanel from '../components/AdminPanel';
import { initPlatform, hapticSuccess } from '../lib/platform';
import { useAuth } from '../lib/useAuth';

const STEPS = [
  { key: 'service', label: 'Услуга' },
  { key: 'master', label: 'Мастер' },
  { key: 'datetime', label: 'Дата и время' },
  { key: 'contact', label: 'Контакты' },
];

export default function Home() {
  const [step, setStep] = useState(0);
  const [platform, setPlatform] = useState('web');

  const [services, setServices] = useState([]);
  const [masters, setMasters] = useState([]);
  const [service, setService] = useState(null);
  const [master, setMaster] = useState(null);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [closedDates, setClosedDates] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { ok: true } | { ok: false, error }
  const [showAdmin, setShowAdmin] = useState(false);

  const { user, codeState, requestLoginCode, vkDebug } = useAuth();

  useEffect(() => {
    const p = initPlatform();
    if (p) setPlatform(p);

    fetch('/api/services').then((r) => r.json()).then((d) => setServices(d.services || []));
    fetch('/api/masters').then((r) => r.json()).then((d) => setMasters(d.masters || []));
  }, []);

  useEffect(() => {
    if (!master) {
      setClosedDates([]);
      return;
    }
    fetch(`/api/closed-dates?masterId=${master.id}`)
      .then((r) => r.json())
      .then((d) => setClosedDates(d.dates || []));
  }, [master]);

  useEffect(() => {
    if (!master || !date) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    setTime(null);
    fetch(`/api/availability?masterId=${master.id}&date=${date}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots || []))
      .finally(() => setSlotsLoading(false));
  }, [master, date]);

  function goTo(index) {
    setStep(Math.max(0, Math.min(STEPS.length - 1, index)));
  }

  async function handleBookingSubmit({ name, phone }) {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterId: master.id,
          serviceId: service.id,
          date,
          time,
          clientName: name,
          clientPhone: phone,
          source: platform,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, error: data.error || 'Не удалось создать запись' });
        return;
      }
      hapticSuccess();
      setResult({ ok: true });
    } catch (e) {
      setResult({ ok: false, error: 'Ошибка сети. Попробуйте ещё раз.' });
    } finally {
      setSubmitting(false);
    }
  }

  if (result?.ok) {
    return (
      <Shell platform={platform}>
        <div className="flex flex-col items-center justify-center text-center py-16 gap-4">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl">✓</div>
          <h2 className="text-xl font-bold">Вы записаны!</h2>
          <p className="text-white/60 max-w-xs">
            {service?.name} у мастера {master?.name} — {date}, {time}
          </p>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setService(null);
              setMaster(null);
              setDate(null);
              setTime(null);
              setStep(0);
            }}
            className="mt-4 bg-white text-graphite font-bold rounded-xl px-6 py-3"
          >
            Новая запись
          </button>
        </div>
      </Shell>
    );
  }

  if (showAdmin) {
    return (
      <Shell platform={platform} isAdmin={user?.isAdmin} onOpenAdmin={() => setShowAdmin(true)}>
        <AdminPanel masters={masters} currentUser={user} onClose={() => setShowAdmin(false)} />
      </Shell>
    );
  }

  return (
    <Shell platform={platform} isAdmin={user?.isAdmin} onOpenAdmin={() => setShowAdmin(true)}>
      <Stepper steps={STEPS} current={step} onSelect={goTo} />

      <div className="mt-5">
        {step === 0 && (
          <ServiceList
            services={services}
            selectedId={service?.id}
            onSelect={(s) => {
              setService(s);
              goTo(1);
            }}
          />
        )}

        {step === 1 && (
          <MasterSelect
            masters={masters}
            selectedId={master?.id}
            onSelect={(m) => {
              setMaster(m);
              goTo(2);
            }}
          />
        )}

        {step === 2 && (
          <div className="space-y-5">
            <Calendar selectedDate={date} onSelect={setDate} closedDates={closedDates} />
            <TimeSlotGrid slots={slots} selectedTime={time} onSelect={setTime} loading={slotsLoading} />
            <button
              type="button"
              disabled={!date || !time}
              onClick={() => goTo(3)}
              className="w-full bg-white text-graphite font-bold rounded-xl py-3 disabled:opacity-30"
            >
              Продолжить
            </button>
          </div>
        )}

        {step === 3 && (
          <div>
            {user?.active ? (
              <BookingForm
                submitting={submitting}
                onSubmit={handleBookingSubmit}
                summary={{
                  serviceName: service?.name,
                  masterName: master?.name,
                  date,
                  time,
                  price: service?.price,
                }}
              />
            ) : (
              <AuthGate user={user} codeState={codeState} onRequestCode={requestLoginCode} vkDebug={vkDebug} />
            )}
            {result && !result.ok && (
              <div className="mt-3 text-red-400 text-sm text-center">{result.error}</div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children, isAdmin, onOpenAdmin }) {
  return (
    <div className="min-h-screen bg-graphite pb-10">
      <header className="relative h-56 sm:h-64 overflow-hidden border-b border-white/5">
        <Image
          src="/images/hero.png"
          alt="BLACK BEARD"
          fill
          priority
          sizes="100vw"
          className="object-cover object-top opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-graphite via-graphite/70 to-graphite/10" />
        <div className="relative h-full flex flex-col items-center justify-end pb-5 text-center">
          <h1 className="text-2xl font-extrabold tracking-wide drop-shadow-lg">BLACK BEARD</h1>
          <p className="text-white/60 text-sm mt-1">Барбершоп · Кунашак</p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={onOpenAdmin}
            className="absolute top-4 right-4 bg-black/40 backdrop-blur border border-white/20 rounded-lg px-3 py-1.5 text-xs font-medium text-white hover:bg-black/60"
          >
            Админ-панель
          </button>
        )}
      </header>
      <main className="px-4 pt-5 max-w-md mx-auto">{children}</main>
    </div>
  );
}

function Stepper({ steps, current, onSelect }) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((s, idx) => {
        const active = idx === current;
        const done = idx < current;
        return (
          <button
            key={s.key}
            type="button"
            disabled={idx > current}
            onClick={() => onSelect(idx)}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                active
                  ? 'bg-white text-graphite'
                  : done
                  ? 'bg-silver/60 text-graphite'
                  : 'bg-steel text-white/40'
              }`}
            >
              {idx + 1}
            </div>
            <span className={`text-[10px] ${active ? 'text-white' : 'text-white/30'}`}>{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}
