// Working hours 08:00 - 20:00, 30-minute steps.
export const ALL_SLOTS = (() => {
  const slots = [];
  for (let h = 8; h <= 19; h += 1) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  slots.push('20:00');
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
