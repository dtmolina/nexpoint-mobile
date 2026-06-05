import client from './client';

// Mirrors the web auth endpoints. Login returns { token, user, business }.
export const authApi = {
  login: (credentials) => client.post('/auth/login', credentials),
  logout: () => client.post('/auth/logout'),
  me: () => client.get('/auth/me'),
};
