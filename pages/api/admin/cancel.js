import { requireAdmin } from '../../../lib/auth/requireAdmin';
import { cancelAppointment } from '../../../lib/appointments/cancelAppointment';

// POST /api/admin/cancel { appointmentId }
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const admin = await requireAdmin(req);
  if (!admin) {
    return res.status(403).json({ error: 'Доступно только администратору' });
  }

  const { appointmentId } = req.body || {};
  if (!appointmentId) {
    return res.status(400).json({ error: 'appointmentId is required' });
  }

  let appointment;
  try {
    appointment = await cancelAppointment(appointmentId, admin.admin_master_id || null);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
  if (!appointment) return res.status(404).json({ error: 'Запись не найдена или уже отменена' });

  return res.status(200).json({ appointment });
}
