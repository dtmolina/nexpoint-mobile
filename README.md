# Nexpoint Mobile

Expo (React Native) app for Nexpoint Hub. Talks to the existing Laravel backend
using the same Sanctum token auth as the web frontend. Currently ships four
screens: **Login**, **Business Picker**, **Bookings List**, and
**Booking Details**.

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
interfaces. Run it with worker processes so it can handle concurrent requests:

```bash
PHP_CLI_SERVER_WORKERS=4 php artisan serve --host=0.0.0.0 --port=8000 --no-reload
```

Plain `php artisan serve` is single-threaded: a second request that arrives
while the first connection is still closing gets reset, which surfaces as a
"Network Error" in the app (for example, opening a Booking Details screen right
after the bookings list loads). `--no-reload` is required for Laravel to respect
`PHP_CLI_SERVER_WORKERS`; without it the variable is ignored and only one worker
starts.

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
  screens/     LoginScreen, BusinessPickerScreen, BookingsScreen, BookingDetailsScreen
  store/       Redux Toolkit store + authSlice (persisted to AsyncStorage)
  theme/       colors, spacing, radius, typography tokens
```

Auth state is the single source of truth for routing: a token in the store shows
the signed-in stack, its absence shows Login. A `401` from any request clears the
token and bounces back to Login automatically.

Super admins have no fixed business, so their stack also includes the Business
Picker. It is the entry point until a business is chosen, and stays reachable
from the Bookings header to switch. Regular users go straight to their business.

### Adding a screen

1. Create it under `src/screens/`.
2. Add an endpoint module in `src/api/` if it needs new data.
3. Register it in `src/navigation/RootNavigator.js` (inside the signed-in group).
