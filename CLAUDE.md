# DobzEye — Telescope Altitude-Azimuth Tracker

A mobile web app for amateur astronomers that uses the phone's DeviceOrientation sensors to display real-time altitude and azimuth of a Dobsonian telescope. The phone is taped **parallel** to the telescope tube (flat against the side), so when the tube is horizontal, beta = 0° = altitude 0°.

## Stack

- **Angular 20** + **Ionic 8** (Angular modules, not standalone)
- **Capacitor 8** (for future native builds)
- TypeScript 5.9, SCSS, RxJS 7.8

## Dev Commands

```bash
# Start dev server (default port 4200)
npm start

# Start on specific port, accessible externally (e.g. via Cloudflare Tunnel)
npx ng serve --port 3004 --host 0.0.0.0 --disable-host-check --no-open

# Production build → /www
npm run build

# Run tests
npm test

# Lint
npm run lint
```

> `--disable-host-check` is required when accessing via reverse proxy or tunnel (e.g. Cloudflare Tunnel) — without it Angular dev server rejects the external Host header.

## Key Files

| File | Purpose |
|------|---------|
| `src/app/home/home.page.ts` | All sensor logic: DeviceOrientationEvent handler, azimuth/altitude calculation, smoothing buffers |
| `src/app/home/home.page.html` | UI: SVG compass rose, altitude arc, coordinate cards, starfield |
| `src/app/home/home.page.scss` | Dark space theme, glassmorphism cards |
| `capacitor.config.ts` | Capacitor config (appId: `io.ionic.starter`, webDir: `www`) |
| `ionic.config.json` | Ionic project config (type: `angular`) |

## Sensor & Orientation Logic

All sensor handling is in `home.page.ts` via the `DeviceOrientationEvent` API:

- **`alpha`** → azimuth (compass heading, 0–360°) — circular mean to handle 359°→0° wrap
- **`beta`** → altitude (elevation) — **phone mounted parallel to tube**, so `altitude = beta` directly
- **`gamma`** → roll indicator

Smoothing: 8-sample moving average buffer for both azimuth and altitude.

### Phone Mounting

Phone is taped **parallel** (flat along) the telescope tube:
- Tube at horizon → phone flat → `beta ≈ 0°` → altitude = 0°
- Tube at zenith → phone upright → `beta ≈ 90°` → altitude = 90°

This is why the altitude formula is `alt = beta` (not `beta - 90`, which would be for perpendicular/upright mounting).

## Browser Requirements

- **DeviceOrientationEvent API** — requires a real mobile device with gyroscope/accelerometer
- **HTTPS** required in production for sensor access (iOS Safari enforces this)
- iOS 13+: triggers a permission prompt (`DeviceOrientationEvent.requestPermission()`)

## Build Output

Production builds go to `/www`. This is also the Capacitor web directory for native app packaging.
