// Shared logic for interpreting closed_dates rows — used by both
// /api/availability (building the slot grid) and /api/appointments/create
// (rejecting a booking server-side even if the client's grid was stale).
//
// A row with start_time/end_time both null closes the entire day. A row
// with both set only blocks that time window, leaving the rest of the day
// bookable as usual.

export function isWholeDayClosed(closures) {
  return (closures || []).some((c) => !c.start_time && !c.end_time);
}

export function isTimeClosed(time, closures) {
  return (closures || []).some((c) => {
    if (!c.start_time || !c.end_time) return false;
    return time >= c.start_time.slice(0, 5) && time < c.end_time.slice(0, 5);
  });
}
