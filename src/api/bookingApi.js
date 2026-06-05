import client from './client';

// Business-scoped admin booking endpoints. The slug comes from the business
// returned at login, so callers pass it in rather than hardcoding.
export const bookingApi = {
  getBookings: (slug, params = {}) =>
    client.get(`/admin/${slug}/bookings`, { params }),
  getBooking: (slug, id) => client.get(`/admin/${slug}/bookings/${id}`),

  // Status transitions. Backend gates these behind the Approvals permission and
  // returns 422 if the transition is invalid, 403 if the user lacks access.
  confirmBooking: (slug, id) => client.patch(`/admin/${slug}/bookings/${id}/confirm`),
  completeBooking: (slug, id) => client.patch(`/admin/${slug}/bookings/${id}/complete`),
  cancelBooking: (slug, id, reason = '') =>
    client.patch(`/admin/${slug}/bookings/${id}/cancel`, { reason }),

  updateNotes: (slug, id, adminNotes) =>
    client.patch(`/admin/${slug}/bookings/${id}/notes`, { admin_notes: adminNotes }),
};
