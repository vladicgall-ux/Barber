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
