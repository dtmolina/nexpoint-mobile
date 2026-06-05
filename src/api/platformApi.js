import client from './client';

// Platform endpoints, super-admin only. Used to list businesses a super admin
// can switch between.
export const platformApi = {
  getBusinesses: () => client.get('/platform/businesses'),
};
