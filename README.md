# Nexpoint Mobile

Expo (React Native) app for Nexpoint Hub. Talks to the existing Laravel backend
using the same Sanctum token auth as the web frontend. Currently ships two
screens: **Login** and **Bookings List**.

## Setup

```bash
cd mobile
npm install          # or: yarn
cp .env.example .env
```

Edit `.env` and set `EXPO_PUBLIC_API_URL` to a backend URL your device can
reach. `localhost` does **not** work from a phone or most emulators:

| Target            | URL                              |
| ----------------- | -------------------------------- |
| iOS simulator     | `http://localhost:8000/api`      |
| Android emulator  | `http://10.0.2.2:8000/api`       |
| Physical device   | `http://<your-LAN-IP>:8000/api`  |

Find your LAN IP on macOS with `ipconfig getifaddr en0`. The phone must be on
the same Wi-Fi as your machine, and the Laravel server must listen on all
interfaces: `php artisan serve --host=0.0.0.0 --port=8000`.

> If versions drift, run `npx expo install` to align native packages with the
> installed Expo SDK.

## Run

```bash
npm start            # then press i (iOS), a (Android), or scan the QR in Expo Go
```

## Architecture

```
src/
  api/         axios client (Bearer-token interceptor) + endpoint modules
  components/  reusable UI: Button, TextField, StatusBadge
  config/      API URL, brand, storage keys
  hooks/       useAuth — screen-facing wrapper over the auth slice
  navigation/  RootNavigator — auth-gated native stack
  screens/     LoginScreen, BookingsScreen
  store/       Redux Toolkit store + authSlice (persisted to AsyncStorage)
  theme/       colors, spacing, radius, typography tokens
```

Auth state is the single source of truth for routing: a token in the store shows
the signed-in stack, its absence shows Login. A `401` from any request clears the
token and bounces back to Login automatically.

### Adding a screen

1. Create it under `src/screens/`.
2. Add an endpoint module in `src/api/` if it needs new data.
3. Register it in `src/navigation/RootNavigator.js` (inside the signed-in group).
