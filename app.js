"use strict";

/* ------------------------------------------------------------------ *
 * Can my Wi-Fi do that?
 * A static, no-backend connection checker. It measures download speed,
 * upload speed, latency and jitter directly in the browser using
 * Cloudflare's public speed endpoints, then translates the numbers into
 * plain-English verdicts. An optional panel shows the hard details.
 * ------------------------------------------------------------------ */

const DOWN_URL = "https://speed.cloudflare.com/__down?bytes=";
const UP_URL = "https://speed.cloudflare.com/__up";

const els = {
  startBtn: document.getElementById("startBtn"),
  retestBtn: document.getElementById("retestBtn"),
  speedValue: document.getElementById("speedValue"),
  dial: document.getElementById("dial"),
  dialSub: document.getElementById("dialSub"),
  progressWrap: document.getElementById("progressWrap"),
  progressBar: document.getElementById("progressBar"),
  statusLine: document.getElementById("statusLine"),
  results: document.getElementById("results"),
  tester: document.querySelector(".tester"),
  headlineCard: document.getElementById("headlineCard"),
  headlineEmoji: document.getElementById("headlineEmoji"),
  headlineTitle: document.getElementById("headlineTitle"),
  headlineText: document.getElementById("headlineText"),
  activities: document.getElementById("activities"),
  techToggle: document.getElementById("techToggle"),
  techPanel: document.getElementById("techPanel"),
  mDown: document.getElementById("mDown"),
  mUp: document.getElementById("mUp"),
  mPing: document.getElementById("mPing"),
  mJitter: document.getElementById("mJitter"),
  techTableBody: document.getElementById("techTableBody"),
  navInfo: document.getElementById("navInfo"),
};

/* ------------------------------------------------------------------ *
 * Activity definitions
 * down  = download Mbps recommended for a good experience
 * up    = upload Mbps recommended (0 if not really relevant)
 * ping  = max latency (ms) for it to feel right (Infinity if latency
 *         barely matters)
 * The verdict copy is written so it reads like a friend explaining it.
 * ------------------------------------------------------------------ */
const ACTIVITIES = [
  {
    id: "browse",
    icon: "🌐",
    title: "Browsing, email & social",
    req: { down: 3, up: 1, ping: Infinity },
    yes: "Web pages, email and scrolling feel snappy.",
    maybe: "Basic browsing works, but heavier pages will feel sluggish.",
    no: "Even loading web pages will feel slow and frustrating.",
  },
  {
    id: "sd",
    icon: "📺",
    title: "Standard-def streaming (1 show)",
    req: { down: 3, up: 0, ping: Infinity },
    yes: "You can stream a show in standard definition without buffering.",
    maybe: "SD streaming will mostly work but may buffer at busy times.",
    no: "You wouldn't reliably stream even a standard-def show on this connection.",
  },
  {
    id: "hd",
    icon: "🎬",
    title: "HD (1080p) streaming",
    req: { down: 8, up: 0, ping: Infinity },
    yes: "Netflix, YouTube and Disney+ in full HD will play smoothly.",
    maybe: "HD will play but might drop to a lower quality when things get busy.",
    no: "You wouldn't get reliable Full-HD streaming with this connection.",
  },
  {
    id: "uhd",
    icon: "🍿",
    title: "4K / Ultra-HD streaming",
    req: { down: 25, up: 0, ping: Infinity },
    yes: "You can stream in crisp 4K — even on a big TV.",
    maybe: "4K may start, but expect it to drop to HD when the connection dips.",
    no: "You wouldn't be able to stream in 4K with this connection.",
  },
  {
    id: "call",
    icon: "🎥",
    title: "HD video calls (Zoom / FaceTime)",
    req: { down: 4, up: 4, ping: 150 },
    yes: "One-on-one and group video calls will look clear and stay in sync.",
    maybe: "Calls will connect, but expect occasional freezing or pixelation.",
    no: "You'd struggle to hold a smooth HD video call on this connection.",
  },
  {
    id: "homeoffice",
    icon: "💼",
    title: "A busy household / work-from-home",
    req: { down: 50, up: 10, ping: 100 },
    yes: "Several people can stream, call and browse at the same time.",
    maybe: "It'll cope until two or three heavy things happen at once.",
    no: "This connection will struggle when several people use it together.",
  },
  {
    id: "onlinegame",
    icon: "🎮",
    title: "Online gaming (game runs on your console)",
    req: { down: 15, up: 3, ping: 80 },
    yes: "Online multiplayer should feel responsive and lag-free.",
    maybe: "You can play, but expect some lag spikes in fast-paced matches.",
    no: "Competitive online gaming would feel laggy on this connection.",
  },
  {
    id: "cloud1080",
    icon: "☁️",
    title: "Cloud gaming at 1080p (PS Plus Premium, GeForce Now, Xbox)",
    req: { down: 15, up: 3, ping: 60 },
    yes: "You can stream PS5 / cloud games at 1080p and they'll feel responsive.",
    maybe: "Cloud gaming will work, but expect occasional blur or input lag.",
    no: "You wouldn't be able to cloud-game (PS Plus Premium) smoothly at 1080p with this connection.",
  },
  {
    id: "cloud4k",
    icon: "🚀",
    title: "Cloud gaming at 4K (PS Plus Premium / GeForce Now Ultimate)",
    req: { down: 40, up: 5, ping: 40 },
    yes: "You've got the speed and the low ping for 4K cloud gaming.",
    maybe: "4K cloud gaming may run, but ping is borderline — expect it to drop to 1080p.",
    no: "You wouldn't be able to stream cloud games in 4K (PS Plus Premium) with this connection.",
  },
];

/* ----------------------------- helpers ---------------------------- */

function fmt(n, digits = 0) {
  if (!isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function evaluate(activity, r) {
  const okDown = r.down >= activity.req.down;
  const halfDown = r.down >= activity.req.down * 0.7;
  const okUp = activity.req.up === 0 || r.up >= activity.req.up;
  const halfUp = activity.req.up === 0 || r.up >= activity.req.up * 0.7;
  const okPing = r.ping <= activity.req.ping;
  const halfPing = r.ping <= activity.req.ping * 1.6;

  if (okDown && okUp && okPing) return "yes";
  if (halfDown && halfUp && halfPing) return "maybe";
  return "no";
}

/* ------------------------- measurement ---------------------------- */

async function measureLatency(samples = 12) {
  const times = [];
  // Warm up the connection / DNS / TLS first; discard that sample.
  try {
    await fetch(DOWN_URL + "0&warm=" + Date.now(), { cache: "no-store" });
  } catch (_) {}

  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    try {
      await fetch(DOWN_URL + "0&n=" + i + "-" + Date.now(), { cache: "no-store" });
    } catch (_) {
      continue;
    }
    times.push(performance.now() - start);
  }
  if (times.length === 0) return { ping: NaN, jitter: NaN };

  const sorted = [...times].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  // Jitter = average absolute change between consecutive samples.
  let jitterSum = 0;
  for (let i = 1; i < times.length; i++) jitterSum += Math.abs(times[i] - times[i - 1]);
  const jitter = times.length > 1 ? jitterSum / (times.length - 1) : 0;

  return { ping: median, jitter };
}

async function measureDownload(onProgress, durationMs = 9000) {
  const start = performance.now();
  const warmupMs = 1500;
  const chunkBytes = 12 * 1024 * 1024; // 12 MB requests, looped
  let totalBytes = 0; // everything, for the live readout
  let countedBytes = 0; // post-warmup, for the final number
  let countStart = null;
  let live = 0;

  while (performance.now() - start < durationMs) {
    let resp;
    try {
      resp = await fetch(DOWN_URL + chunkBytes + "&t=" + Date.now(), { cache: "no-store" });
    } catch (e) {
      if (totalBytes === 0) throw e; // total failure on first request
      break;
    }
    const reader = resp.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const elapsed = performance.now() - start;
      totalBytes += value.length;

      if (elapsed >= warmupMs) {
        if (countStart === null) {
          countStart = performance.now();
          countedBytes = 0;
        }
        countedBytes += value.length;
        const countElapsed = (performance.now() - countStart) / 1000;
        if (countElapsed > 0) live = (countedBytes * 8) / countElapsed / 1e6;
      } else {
        live = (totalBytes * 8) / (elapsed / 1000) / 1e6;
      }
      onProgress(live, Math.min(1, elapsed / durationMs));
      if (elapsed >= durationMs) break;
    }
  }

  const countElapsed = countStart ? (performance.now() - countStart) / 1000 : 0;
  if (countElapsed > 0.4 && countedBytes > 0) return (countedBytes * 8) / countElapsed / 1e6;
  // Fell back: not enough post-warmup data, use the whole thing.
  const elapsed = (performance.now() - start) / 1000;
  return elapsed > 0 ? (totalBytes * 8) / elapsed / 1e6 : NaN;
}

async function measureUpload(durationMs = 6000) {
  const start = performance.now();
  const blobSize = 4 * 1024 * 1024;
  const payload = new Uint8Array(blobSize);
  // Fill with non-zero data so it can't be trivially compressed.
  for (let i = 0; i < blobSize; i += 4096) payload[i] = (i * 31) & 0xff;

  let totalBytes = 0;
  let firstDone = false;
  let countStart = null;
  let countedBytes = 0;

  while (performance.now() - start < durationMs) {
    try {
      await fetch(UP_URL, { method: "POST", body: payload, cache: "no-store" });
    } catch (e) {
      if (totalBytes === 0) return NaN;
      break;
    }
    totalBytes += blobSize;
    if (!firstDone) {
      // Discard the first round as warm-up.
      firstDone = true;
      countStart = performance.now();
      countedBytes = 0;
      continue;
    }
    countedBytes += blobSize;
  }
  const countElapsed = countStart ? (performance.now() - countStart) / 1000 : 0;
  if (countElapsed > 0.4 && countedBytes > 0) return (countedBytes * 8) / countElapsed / 1e6;
  const elapsed = (performance.now() - start) / 1000;
  return elapsed > 0 ? (totalBytes * 8) / elapsed / 1e6 : NaN;
}

/* --------------------------- the run ------------------------------ */

let running = false;

async function runTest() {
  if (running) return;
  running = true;

  els.startBtn.disabled = true;
  els.startBtn.textContent = "Testing…";
  els.results.hidden = true;
  els.progressWrap.hidden = false;
  els.dial.classList.remove("idle");
  els.dial.classList.add("testing");
  els.statusLine.textContent = "Hang tight — measuring your connection.";

  const setProgress = (live, pct) => {
    els.speedValue.textContent = isFinite(live) ? fmt(live, live < 100 ? 1 : 0) : "—";
    els.progressBar.style.width = Math.round(pct * 100) + "%";
    const dialPct = Math.min(100, (live / 200) * 100); // 200 Mbps fills the dial
    els.dial.style.setProperty("--pct", dialPct.toFixed(0));
  };

  try {
    els.dialSub.textContent = "Checking responsiveness…";
    els.progressBar.style.width = "8%";
    const latency = await measureLatency();

    els.dialSub.textContent = "Measuring download…";
    const down = await measureDownload((live, pct) =>
      setProgress(live, 0.1 + pct * 0.6)
    );

    els.dialSub.textContent = "Measuring upload…";
    els.progressBar.style.width = "75%";
    const up = await measureUpload((live, pct) => {});
    els.progressBar.style.width = "100%";

    const result = { down, up, ping: latency.ping, jitter: latency.jitter };
    showResults(result);
  } catch (e) {
    showError();
  } finally {
    els.dial.classList.remove("testing");
    els.startBtn.disabled = false;
    els.startBtn.textContent = "Test my connection";
    els.progressWrap.hidden = true;
    running = false;
  }
}

/* --------------------------- rendering ---------------------------- */

function overallHeadline(r) {
  // A simple, friendly grade based on download speed and ping.
  const d = r.down;
  const p = isFinite(r.ping) ? r.ping : 999;

  if (d >= 100 && p <= 40)
    return { cls: "good", emoji: "🚀", title: "Excellent connection",
      text: "Fast and responsive — this handles just about anything, including 4K cloud gaming." };
  if (d >= 40 && p <= 60)
    return { cls: "good", emoji: "✅", title: "Strong connection",
      text: "Great for 4K streaming, busy households and most cloud gaming at 1080p." };
  if (d >= 15 && p <= 90)
    return { cls: "ok", emoji: "👍", title: "Solid everyday connection",
      text: "Comfortable for HD streaming and video calls; cloud gaming will work at 1080p." };
  if (d >= 5)
    return { cls: "ok", emoji: "🙂", title: "Basic connection",
      text: "Fine for one person browsing and HD streaming, but it'll feel stretched under load." };
  return { cls: "bad", emoji: "🐢", title: "Weak connection",
    text: "Good enough for browsing and standard-def video, but heavier tasks will struggle." };
}

function showResults(r) {
  const h = overallHeadline(r);
  els.headlineCard.className = "verdict-headline card " + h.cls;
  els.headlineEmoji.textContent = h.emoji;
  els.headlineTitle.textContent = h.title;
  els.headlineText.textContent = h.text;

  // Big number settles on the final download speed.
  els.speedValue.textContent = fmt(r.down, r.down < 100 ? 1 : 0);
  els.dial.style.setProperty("--pct", Math.min(100, (r.down / 200) * 100).toFixed(0));
  els.dialSub.textContent = "Download speed";

  // Activity cards
  els.activities.innerHTML = "";
  const labels = { yes: "Yes", maybe: "Maybe", no: "No" };
  for (const a of ACTIVITIES) {
    const verdict = evaluate(a, r);
    const div = document.createElement("div");
    div.className = "activity " + verdict;
    div.innerHTML = `
      <div class="activity-icon">${a.icon}</div>
      <div class="activity-body">
        <div class="activity-title">${a.title}
          <span class="badge ${verdict}">${labels[verdict]}</span>
        </div>
        <div class="activity-verdict">${a[verdict]}</div>
      </div>`;
    els.activities.appendChild(div);
  }

  // Tech metrics
  els.mDown.textContent = fmt(r.down, r.down < 100 ? 1 : 0);
  els.mUp.textContent = fmt(r.up, r.up < 100 ? 1 : 0);
  els.mPing.textContent = fmt(r.ping, 0);
  els.mJitter.textContent = fmt(r.jitter, 0);

  // Tech threshold table
  els.techTableBody.innerHTML = "";
  const pillLabel = { yes: "Pass", maybe: "Borderline", no: "Falls short" };
  for (const a of ACTIVITIES) {
    const verdict = evaluate(a, r);
    const tr = document.createElement("tr");
    const pingReq = a.req.ping === Infinity ? "any" : "≤ " + a.req.ping + " ms";
    tr.innerHTML = `
      <td>${a.title}</td>
      <td>≥ ${a.req.down} Mbps</td>
      <td>${pingReq}</td>
      <td><span class="pill ${verdict}">${pillLabel[verdict]}</span></td>`;
    els.techTableBody.appendChild(tr);
  }

  // Browser-reported network info, if available
  const c = navigator.connection || navigator.webkitConnection;
  if (c && (c.effectiveType || c.downlink)) {
    const parts = [];
    if (c.effectiveType) parts.push(`effective type "${c.effectiveType}"`);
    if (c.downlink) parts.push(`browser estimate ~${c.downlink} Mbps`);
    if (c.rtt) parts.push(`reported round-trip ~${c.rtt} ms`);
    if (c.saveData) parts.push(`Data Saver is ON`);
    els.navInfo.textContent = "Your browser also reports: " + parts.join(", ") + ".";
  } else {
    els.navInfo.textContent = "";
  }

  els.results.hidden = false;
  els.results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showError() {
  els.headlineCard.className = "verdict-headline card bad";
  els.headlineEmoji.textContent = "⚠️";
  els.headlineTitle.textContent = "Couldn't run the test";
  els.headlineText.textContent =
    "The speed test couldn't reach the measurement servers. This usually means you're " +
    "offline, behind a strict firewall/VPN, or an extension is blocking requests. " +
    "Check your connection and try again.";
  els.activities.innerHTML = "";
  els.techPanel.hidden = true;
  els.techToggle.setAttribute("aria-expanded", "false");
  els.techToggle.textContent = "Show the technical details ▾";
  els.speedValue.textContent = "—";
  els.dialSub.textContent = "No result";
  els.results.hidden = false;
}

/* ----------------------------- wiring ----------------------------- */

els.startBtn.addEventListener("click", runTest);
els.retestBtn.addEventListener("click", () => {
  els.dialSub.textContent = "Ready when you are";
  runTest();
});

els.techToggle.addEventListener("click", () => {
  const open = els.techPanel.hidden;
  els.techPanel.hidden = !open;
  els.techToggle.setAttribute("aria-expanded", String(open));
  els.techToggle.textContent = open
    ? "Hide the technical details ▴"
    : "Show the technical details ▾";
});
