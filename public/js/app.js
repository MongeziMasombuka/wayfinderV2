const QR_PREFIX = "GRAND_ATRIUM:";
let stores = [];
let fromId = null,
  toId = null,
  activeField = null;
let camStream = null,
  camScanInterval = null,
  camField = "from";
let dataLoaded = false;

const TIPS = {
  "north-1": "Look for the large glass storefronts along the North side.",
  "south-1": "Head toward the Cinema end — South Wing stores line both sides.",
  "east-1": "Follow the East Corridor signs past the escalators.",
  "west-1": "West Wing is quieter — great for a relaxed browse.",
  "center-1": "Lost? The fountain is always your compass.",
  "north-2": "Follow the Gold Bridge — it leads to Fashion & Wellness.",
  "south-2": "Take the Blue Bridge for Gaming & Entertainment.",
  "east-2": "The East Wing on Level 2 has great bar and art stops.",
  "west-2": "West Wing Level 2 is perfect for health and nutrition.",
  rooftop: "Arrive before sunset for the best views over the city!",
};

async function loadAll() {
  try {
    const res = await fetch("/api/stores");
    if (!res.ok) throw new Error(`Stores API returned ${res.status}`);
    stores = await res.json();
    dataLoaded = true;

    document.getElementById("store-count").textContent =
      stores.length + " stores";
    console.log("[loadAll] stores loaded:", stores.length);
  } catch (error) {
    console.error("Failed to load data:", error);
  }
}

function getStore(id) {
  return stores.find((s) => s.id === id);
}

// --- Camera / QR Scanning Logic ---
function openCamera(field) {
  camField = field || "from";
  updateCamFieldBtns();
  document.getElementById("cam-overlay").classList.add("open");
  startCamera();
}

function closeCamera() {
  document.getElementById("cam-overlay").classList.remove("open");
  stopCamera();
}

function setCamField(f) {
  camField = f;
  updateCamFieldBtns();
}

function updateCamFieldBtns() {
  document
    .getElementById("field-btn-from")
    .classList.toggle("sel", camField === "from");
  document
    .getElementById("field-btn-to")
    .classList.toggle("sel", camField === "to");
}

async function startCamera() {
  stopCamera();
  const statusEl = document.getElementById("cam-status");
  const isSecure =
    location.protocol === "https:" ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";

  if (!isSecure) {
    statusEl.textContent =
      "Camera requires HTTPS. Open this page over https:// (or localhost) to scan.";
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    statusEl.textContent = "Camera API not supported in this browser.";
    return;
  }

  try {
    camStream = await getCameraStream();
  } catch (err) {
    console.error("[camera] failed to acquire stream", err);
    statusEl.textContent = cameraErrorMessage(err);
    return;
  }

  const video = document.getElementById("cam-video");
  video.srcObject = camStream;
  await new Promise((resolve) => {
    if (video.readyState >= 1) return resolve();
    video.onloadedmetadata = () => resolve();
  });
  await video.play();
  camScanInterval = setInterval(scanFrame, 200);
}

async function getCameraStream() {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
    });
  } catch (err) {
    if (err.name === "OverconstrainedError" || err.name === "NotFoundError") {
      return await navigator.mediaDevices.getUserMedia({ video: true });
    }
    throw err;
  }
}

function cameraErrorMessage(err) {
  switch (err.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Camera permission denied. Allow camera access in your browser settings and try again.";
    case "NotFoundError":
      return "No camera found on this device.";
    case "NotReadableError":
      return "Camera is already in use by another app.";
    case "OverconstrainedError":
      return "No camera matches the requested settings.";
    default:
      return `Camera error: ${err.message || err.name}`;
  }
}

function stopCamera() {
  if (camScanInterval) {
    clearInterval(camScanInterval);
    camScanInterval = null;
  }
  if (camStream) {
    camStream.getTracks().forEach((t) => t.stop());
    camStream = null;
  }
}

function scanFrame() {
  const video = document.getElementById("cam-video");
  const canvas = document.getElementById("cam-canvas");
  if (!video.videoWidth) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  let code;
  try {
    code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });
  } catch (e) {
    return;
  }

  if (!code) return;

  let raw = code.data.trim();
  let storeId = raw.startsWith(QR_PREFIX)
    ? raw.slice(QR_PREFIX.length).trim().toLowerCase()
    : raw.toLowerCase();
  const found = getStore(storeId);
  const statusEl = document.getElementById("cam-status");

  if (found) {
    statusEl.textContent = `✓ Found: ${found.emoji} ${found.name}`;
    stopCamera();
    setTimeout(() => {
      closeCamera();
      setField(camField, found.id);
      showToast(
        `${found.emoji} ${found.name} set as ${camField === "from" ? "origin" : "destination"}`,
      );
      if (fromId && toId) getDirections();
    }, 700);
  } else {
    statusEl.innerHTML = `Raw: "${escapeHtml(raw)}"<br>Parsed ID: "${escapeHtml(storeId)}"<br>No match in ${stores.length} stores`;
  }
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  if (window.toastTimer) clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}

// --- Store Selection Sheet ---
function openSheet(field) {
  if (!dataLoaded) return;
  activeField = field;
  document.getElementById("sheet-dot").style.background =
    field === "from" ? "#1A1612" : "#C9A84C";
  document.getElementById("sheet-input").placeholder =
    field === "from" ? "Where are you?" : "Where to?";
  document.getElementById("overlay").classList.add("open");
  document.getElementById("sheet-input").value = "";
  renderList("");
  setTimeout(() => document.getElementById("sheet-input").focus(), 80);
}

function closeSheet() {
  document.getElementById("overlay").classList.remove("open");
  activeField = null;
}

function filterSheet() {
  renderList(document.getElementById("sheet-input").value.trim());
}

function hl(text, q) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    text.slice(0, i) +
    '<span class="hl">' +
    text.slice(i, i + q.length) +
    "</span>" +
    text.slice(i + q.length)
  );
}

function renderList(q) {
  const other = activeField === "from" ? toId : fromId;
  const matched = stores.filter(
    (s) =>
      !q ||
      [s.name, s.category_name, s.wing_name, s.id].some((v) =>
        v.toLowerCase().includes(q.toLowerCase()),
      ),
  );

  if (!matched.length) {
    document.getElementById("sheet-list").innerHTML =
      '<div style="padding:28px;text-align:center;color:#9A9088;">No stores found</div>';
    return;
  }

  const l1 = matched.filter((s) => s.level_id === 1),
    l2 = matched.filter((s) => s.level_id === 2);
  const row = (s) =>
    `<div class="store-row${s.id === other ? " dis" : ""}" onclick="pickStore('${s.id}')"><div class="s-icon" style="background:${s.ibg}">${s.emoji}</div><div class="s-body"><div class="s-name">${hl(escapeHtml(s.name), q)}</div><div class="s-meta"><span class="chip chip-lv">L${s.level_id}</span><span class="chip ${s.color_class}">${hl(s.category_name, q)}</span><span class="chip chip-id">${hl(s.id, q)}</span></div><div class="s-wing">${hl(s.wing_name, q)}</div></div></div>`;

  let html = "";
  if (l1.length)
    html +=
      `<div class="list-sec">Level 1 — ${l1.length} stores</div>` +
      l1.map(row).join("");
  if (l2.length)
    html +=
      `<div class="list-sec">Level 2 — ${l2.length} stores</div>` +
      l2.map(row).join("");
  document.getElementById("sheet-list").innerHTML = html;
}

function pickStore(id) {
  setField(activeField, id);
  closeSheet();
  if (activeField === "from" && !toId) setTimeout(() => openSheet("to"), 140);
  else if (activeField === "to" && !fromId)
    setTimeout(() => openSheet("from"), 140);
}

function setField(field, id) {
  const s = getStore(id);
  if (!s) return;
  if (field === "from") {
    fromId = id;
    document.getElementById("disp-from").innerHTML = s.emoji + "  " + s.name;
    document.getElementById("disp-from").classList.remove("ph");
    document.getElementById("clear-from").classList.add("vis");
  } else {
    toId = id;
    document.getElementById("disp-to").innerHTML = s.emoji + "  " + s.name;
    document.getElementById("disp-to").classList.remove("ph");
    document.getElementById("clear-to").classList.add("vis");
  }
  document.getElementById("go-btn").disabled = !(fromId && toId);
}

function clearField(field, e) {
  e.stopPropagation();
  if (field === "from") {
    fromId = null;
    document.getElementById("disp-from").innerHTML = "Where are you?";
    document.getElementById("disp-from").classList.add("ph");
    document.getElementById("clear-from").classList.remove("vis");
  } else {
    toId = null;
    document.getElementById("disp-to").innerHTML = "Where to?";
    document.getElementById("disp-to").classList.add("ph");
    document.getElementById("clear-to").classList.remove("vis");
  }
  document.getElementById("result-area").innerHTML = "";
  document.getElementById("go-btn").disabled = true;
}

function swapFields() {
  let temp = fromId;
  fromId = toId;
  toId = temp;
  const df = document.getElementById("disp-from"),
    dt = document.getElementById("disp-to");
  const tf = df.innerHTML,
    tt = dt.innerHTML;
  df.innerHTML = tt;
  dt.innerHTML = tf;
  if (fromId) df.classList.remove("ph");
  else df.classList.add("ph");
  if (toId) dt.classList.remove("ph");
  else dt.classList.add("ph");
  document.getElementById("clear-from").classList.toggle("vis", !!fromId);
  document.getElementById("clear-to").classList.toggle("vis", !!toId);
  document.getElementById("go-btn").disabled = !(fromId && toId);
  if (fromId && toId) getDirections();
}

// --- Directions Logic ---
function buildDirections(from, to) {
  if (from.id === to.id) return null;
  let steps = [];
  if (from.level_id === to.level_id) {
    if (from.wing_id !== to.wing_id) {
      if (from.wing_id === "center")
        steps.push(`Walk from Center Court toward the ${to.wing_name}.`);
      else if (to.wing_id === "center")
        steps.push(`Walk from the ${from.wing_name} toward Center Court.`);
      else
        steps.push(
          `Walk from the ${from.wing_name} through Center Court into the ${to.wing_name}.`,
        );
    }
  } else {
    steps.push(
      `Take the elevator or escalator from Level ${from.level_id} to Level ${to.level_id}.`,
    );
    if (from.wing_id !== to.wing_id) {
      if (to.wing_id === "rooftop")
        steps.push("Follow the signs to the Rooftop Terrace at the West exit.");
      else steps.push(`Then go to the ${to.wing_name}.`);
    }
  }
  steps.push(
    `${to.name} is located in the ${to.wing_name}, Level ${to.level_id}.`,
  );
  const tipKey =
    to.wing_id === "rooftop" ? "rooftop" : `${to.wing_id}-${to.level_id}`;
  return { steps, tip: TIPS[tipKey] || null };
}

function getDirections() {
  const from = getStore(fromId),
    to = getStore(toId);
  if (!from || !to) return;

  if (from.id === to.id) {
    document.getElementById("result-area").innerHTML =
      `<div class="result-card" style="padding:28px;text-align:center;"><div style="font-size:36px;">${from.emoji}</div><div>You're already at ${from.name}!</div></div>`;
    return;
  }

  const dir = buildDirections(from, to);
  if (!dir || !dir.steps.length) return;

  const stepsHtml = dir.steps
    .map(
      (t, i) =>
        `<div class="step"><div class="step-l"><div class="step-n">${i + 1}</div>${i < dir.steps.length - 1 ? '<div class="step-ln"></div>' : ""}</div><div class="step-t">${escapeHtml(t)}</div></div>`,
    )
    .join("");

  document.getElementById("result-area").innerHTML =
    `<div class="result-card"><div class="result-hero"><div class="rh-side"><div class="rh-emoji">${from.emoji}</div><div class="rh-name">${escapeHtml(from.name)}</div><div class="rh-sub">L${from.level_id} · ${escapeHtml(from.wing_name)}</div></div><div class="rh-arrow">→</div><div class="rh-side rh-to"><div class="rh-emoji">${to.emoji}</div><div class="rh-name">${escapeHtml(to.name)}</div><div class="rh-sub">L${to.level_id} · ${escapeHtml(to.wing_name)}</div></div></div><div class="steps-wrap">${stepsHtml}</div>${dir.tip ? `<div class="tip-box">💡 ${escapeHtml(dir.tip)}</div>` : ""}</div>`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>]/g, function (m) {
    if (m === "&") return "&amp;";
    if (m === "<") return "&lt;";
    if (m === ">") return "&gt;";
    return m;
  });
}

loadAll();
