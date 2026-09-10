# Kairos (καιρός)

> A distraction-free, signal-driven minimal countdown and timer application built with SolidJS, Tailwind CSS v4, and Material Design Dynamic Colors.

## 🚀 Features

- **Distraction-Free Countdown**: Large, responsive, smooth animated digit ticker centered on a solid dark background with zero clutter.
- **Signal-Driven Reactive Engine**: Built on SolidJS signals (`createSignal`, `createMemo`, `createEffect`) for high-precision, sub-millisecond DOM updates with zero Virtual DOM overhead.
- **Negative Elapsed Counting**: When a timer expires:
  - If `sound=false`: Continues seamlessly into negative counting (`-00:00:01`, `-00:00:02`) without flashing or interrupting.
  - If `sound=true`: Plays a pleasant synthesized chime and reveals a dismiss button to stop the sound, while continuing negative counting.
- **URL Hash Parameter Protocol**: All countdown configurations are preserved in URL hashes (`/countdown#duration=5m&sound=true`), making every countdown instantly shareable and 100% static CDN friendly.
- **Material You Dynamic Theming**: Full `@material/material-color-utilities` dynamic palette system on the creator landing page, persisting user preferences to `localStorage`.
- **Cloudflare Pages Ready**: Pre-configured with `wrangler.jsonc`, `public/_headers`, and static SPA fallback routing.

---

## 🧭 URL Routing & Hash Format

- **Landing / Creator**: `/` or `/create`
- **Distraction-Free Countdown**: `/countdown#...`

### Supported Hash Parameters

| Parameter | Aliases | Example | Description |
| :--- | :--- | :--- | :--- |
| `duration` | `d` | `5m`, `300s`, `1h30m` | Timer duration |
| `startTime` | `start`, `st` | `2026-09-06T20:30:00Z` | Start timestamp |
| `endTime` | `end`, `et` | `2026-12-31T23:59:59Z` | Target end timestamp |
| `sound` | `snd`, `audio` | `true`, `false` (default `false`) | Sound alert at 00:00:00 |

#### Direct Manual Hash Examples:
- `/countdown#duration=10m`: Relative 10-minute timer starting when page loads
- `/countdown#duration=25m&sound=true`: 25-minute Pomodoro timer with audio chime
- `/countdown#endTime=2026-12-31T23:59:59Z`: Countdown to New Year's Eve

---

## 🛠️ Development & Deployment

```bash
# Install dependencies
pnpm install

# Start local dev server
pnpm dev

# Build for production
pnpm build

# Preview production build locally
pnpm preview

# Deploy to Cloudflare Pages
pnpm deploy
```
