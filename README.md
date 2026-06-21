# Can my Wi-Fi do that? 📶

A tiny, no-backend website that tests your internet connection and tells you — **in plain
English** — what it's actually good for. Instead of leaving you to interpret raw numbers,
it says things like:

> ☁️ **Cloud gaming at 1080p (PS Plus Premium)** — *No.*
> You wouldn't be able to cloud-game smoothly at 1080p with this connection.

…and if you want the hard details, one click reveals download/upload speeds, latency,
jitter, the exact thresholds used, and how the measurement works.

The entire site is a **single self-contained `index.html`** (HTML, CSS and JS inlined), so
it runs anywhere — open it straight from disk, host it, or view it through a simple HTML
preview, with nothing extra to load.

## How to use it

Open `index.html` in any modern browser and click **Test my connection**. No build step,
no server, no install.

To serve it locally (optional):

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## What it measures

| Metric | Plain meaning |
| --- | --- |
| **Download** | How fast data comes *to* you — video quality, page loads, simultaneous streams. |
| **Upload** | How fast data goes *from* you — video calls, posting, backups. |
| **Latency (ping)** | The delay before data moves. The make-or-break number for online & cloud gaming. |
| **Jitter** | How much your ping wobbles. Spiky jitter causes stutter even when averages look fine. |

It then checks those numbers against everyday activities — browsing, HD & 4K streaming,
video calls, a busy work-from-home household, online gaming, and **cloud gaming at 1080p
and 4K** (PS Plus Premium, GeForce Now, Xbox Cloud) — and grades each one **Yes / Maybe /
No** with a one-line explanation.

## Devices on your Wi-Fi

A **Devices** panel lets you keep a list of what's on your network (e.g. "iPhone 13",
"Living room TV") and pick what each one is doing. It adds up the bandwidth they need and
compares it to your measured speed, telling you in plain English whether your connection
can keep everyone happy at once.

> **Why is it manual?** For privacy, browsers are not allowed to scan a network and
> enumerate other devices — that ability is reserved for your router's admin page or a
> native app. So you add devices yourself; the list is saved only on your device (via
> `localStorage`) and never leaves it. The app *does* auto-detect the current device using
> the browser's user-agent hints — it fills in the model where the platform exposes it
> (Android/Chromebook), while iPhone/iPad only report as "iPhone"/"iPad", which you can
> rename.

## Wi-Fi walk test (movement tracking)

Walk around your home with the page open and the live signal meter updates as you move. Tap
**Capture spot** in each room to log it, and the app ranks every spot from strongest to
weakest, tells you what each can handle (4K, HD, browsing, or dead zone), and points out
where an extender or mesh node would help most. Spots are saved on your device.

> Note: this is signal-strength mapping as you move — not radar-style "motion sensing."
> Detecting people moving through Wi-Fi interference needs raw radio data from special
> hardware and isn't possible in a browser.

## Connection stability check

A live 20-second ping graph that shows how *steady* your connection is — drawing each ping,
tracking jitter and dropped responses, and grading the result in plain English ("rock
solid", "mostly stable", or "unstable"). Stability is what makes or breaks video calls and
online games even when raw speed looks fine.

## How the test works

The measurement runs entirely in your browser using Cloudflare's public speed endpoints
(`speed.cloudflare.com`), the same technique speed-test sites use:

- **Download / upload:** transfers timed test data and measures throughput, discarding the
  first moments as "warm-up" so the result reflects steady-state speed.
- **Latency:** times many tiny requests and takes the median.
- **Jitter:** the average wobble between those latency samples.

Nothing is sent to or stored by this site — there is no backend.

## Notes & limitations

- Results estimate your connection *at this moment, from this device*. Wi-Fi varies room to
  room — for the truest picture, test next to your router and again where you actually sit.
- A strict firewall, VPN, or request-blocking browser extension can prevent the test from
  reaching the measurement servers; you'll get a clear message if that happens.
- Thresholds are sensible real-world recommendations, not official guarantees from any
  streaming or gaming provider.
