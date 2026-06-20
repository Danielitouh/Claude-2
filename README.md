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
