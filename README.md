# Kairos (καιρός)

Minimal countdown and timer built with SolidJS, Tailwind CSS, and Material Design Dynamic Colors.

## Features

- **Timer & Countdown**: Supports relative duration timers and absolute target countdowns.
- **Negative Counting**: Continues counting into negatives past zero (`-00:00:01`, `-00:00:02`).
- **Audio Alert**: Optional audio chime on completion with dismiss button.
- **Shareable URLs**: Configurations encoded in URL hash parameters.
- **Dynamic Theming**: Material Design Dynamic Colors with custom seeds, dark mode, and contrast settings.

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
