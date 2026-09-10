// Working hours 08:00 - 20:00, 1-hour steps.
export const ALL_SLOTS = (() => {
  const slots = [];
  for (let h = 8; h <= 20; h += 1) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
  }
  return slots;
})();

export const SLOT_BLOCKS = {
  'Утро': (t) => t >= '08:00' && t < '12:00',
  'День': (t) => t >= '12:00' && t < '17:00',
  'Вечер': (t) => t >= '17:00' && t <= '20:00',
};

export function groupSlotsByBlock(slots) {
  const blocks = {};
  Object.keys(SLOT_BLOCKS).forEach((label) => {
    blocks[label] = slots.filter((t) => SLOT_BLOCKS[label](t));
  });
  return blocks;
}

// The barbershop is in Kunashak (Chelyabinsk region), which uses the same
// clock as Yekaterinburg (UTC+5) — used so "is this slot already past"
// doesn't depend on the server's own timezone.
const SHOP_TIMEZONE = 'Asia/Yekaterinburg';

// Returns { date: 'YYYY-MM-DD', time: 'HH:MM' } for the current moment in
// the barbershop's local timezone.
export function getShopNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHOP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type) => parts.find((p) => p.type === type)?.value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}
