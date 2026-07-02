let stores = [],
  categories = [],
  wings = [],
  amenities = [],
  events = [];
let editStoreId = null;
let editEventId = null;

async function fetchAll() {
  const [sRes, cRes, wRes, aRes, eRes] = await Promise.all([
    fetch("/api/stores"),
    fetch("/api/categories"),
    fetch("/api/wings"),
    fetch("/api/amenities"),
    fetch("/api/events?all=1"), // admin sees past events too, not just upcoming
  ]);
  stores = await sRes.json();
  categories = await cRes.json();
  wings = await wRes.json();
  amenities = await aRes.json();
  events = await eRes.json();
  populateSelects();
  populateEventTargetSelect();
  renderStores();
  renderCategories();
  renderWings();
  renderAmenities();
  renderEvents();
}

function populateSelects() {
  const catSel = document.getElementById("category_id");
  catSel.innerHTML =
    '<option value="">Select</option>' +
    categories
      .map((c) => `<option value="${c.id}">${c.icon || ""} ${c.name}</option>`)
      .join("");
  const wingSel = document.getElementById("wing_id");
  wingSel.innerHTML =
    '<option value="">Select</option>' +
    wings
      .map((w) => `<option value="${w.id}">${w.name} (L${w.level_id})</option>`)
      .join("");
}

// Single dropdown for "what is this event tied to": a specific store, a
// wing, or nothing (mall-wide). Encodes the choice as "store:<id>" /
// "wing:<id>" so the submit handler can split it back into store_id/wing_id.
function populateEventTargetSelect() {
  const sel = document.getElementById("event_target");
  const storeOptions = stores
    .map((s) => `<option value="store:${s.id}">🏬 ${s.name}</option>`)
    .join("");
  const wingOptions = wings
    .map((w) => `<option value="wing:${w.id}">🧭 ${w.name}</option>`)
    .join("");
  sel.innerHTML = `<option value="">Mall-wide</option>${storeOptions}${wingOptions}`;
}

function renderStores() {
  const searchTerm = document.getElementById("searchStore").value.toLowerCase();
  const filtered = stores.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm) ||
      s.id.toLowerCase().includes(searchTerm),
  );
  const tbody = document.querySelector("#storesTable tbody");
  tbody.innerHTML = filtered
    .map(
      (s) =>
        `<tr><td>${escapeHtml(s.id)}</td><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.category_name)}</td><td>${s.level_id}</td><td>${escapeHtml(s.wing_name)}</td><td>${s.emoji}</td><td class="actions"><button class="edit-btn" onclick="editStore('${s.id}')">Edit</button><button class="delete-btn" onclick="deleteStore('${s.id}')">Delete</button></td></tr>`,
    )
    .join("");
}

function renderCategories() {
  document.querySelector("#categoriesTable tbody").innerHTML = categories
    .map(
      (c) =>
        `<tr><td>${c.id}</td><td>${c.name}</td><td>${c.icon || ""}</td><td>${c.color_class || ""}</td></tr>`,
    )
    .join("");
}

function renderWings() {
  document.querySelector("#wingsTable tbody").innerHTML = wings
    .map(
      (w) =>
        `<tr><td>${w.id}</td><td>${w.name}</td><td>L${w.level_id}</td><td>${w.description || ""}</td></tr>`,
    )
    .join("");
}

function renderAmenities() {
  document.querySelector("#amenitiesTable tbody").innerHTML = amenities
    .map(
      (a) =>
        `<tr><td>${a.name}</td><td>${a.icon || ""}</td><td>${a.wing_name || ""}</td><td>L${a.level_id}</td><td>${a.description || ""}</td></tr>`,
    )
    .join("");
}

function renderEvents() {
  document.querySelector("#eventsTable tbody").innerHTML = events
    .map(
      (e) =>
        `<tr><td>${escapeHtml(e.title)}</td><td>${escapeHtml(e.description || "")}</td><td>${escapeHtml(e.store_name || e.wing_name || "Mall-wide")}</td><td>${new Date(e.start_date).toLocaleDateString()} - ${new Date(e.end_date).toLocaleDateString()}</td><td class="actions"><button class="edit-btn" onclick="editEvent(${e.id})">Edit</button><button class="delete-btn" onclick="deleteEvent(${e.id})">Delete</button></td></tr>`,
    )
    .join("");
}

function showTab(tab) {
  document
    .querySelectorAll(".tab-content")
    .forEach((el) => el.classList.remove("active"));
  document
    .querySelectorAll(".tab")
    .forEach((el) => el.classList.remove("active"));
  document.getElementById(`${tab}-tab`).classList.add("active");
  event.target.classList.add("active");
}

// --- Stores ---

document.getElementById("storeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    id: document.getElementById("store_id").value.trim(),
    name: document.getElementById("store_name").value.trim(),
    category_id: parseInt(document.getElementById("category_id").value),
    level_id: parseInt(document.getElementById("level_id").value),
    wing_id: document.getElementById("wing_id").value,
    emoji: document.getElementById("emoji").value.trim(),
    cc: document.getElementById("cc").value,
    ibg: document.getElementById("ibg").value,
    description: document.getElementById("store_description").value,
  };
  const url = editStoreId ? `/api/stores/${editStoreId}` : "/api/stores";
  const method = editStoreId ? "PUT" : "POST";
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.ok) {
    alert("Saved");
    window.location.reload();
  } else alert("Error saving store");
});

async function editStore(id) {
  const s = stores.find((x) => x.id === id);
  if (!s) return;
  editStoreId = id;
  document.getElementById("store_id").value = s.id;
  document.getElementById("store_id").disabled = true;
  document.getElementById("store_name").value = s.name;
  document.getElementById("category_id").value = s.category_id;
  document.getElementById("level_id").value = s.level_id;
  document.getElementById("wing_id").value = s.wing_id;
  document.getElementById("emoji").value = s.emoji;
  document.getElementById("cc").value = s.cc || "";
  document.getElementById("ibg").value = s.ibg || "#FDF8EE";
  document.getElementById("store_description").value = s.description || "";
  document.getElementById("cancelStoreEdit").style.display = "inline-block";
}

document.getElementById("cancelStoreEdit").addEventListener("click", () => {
  editStoreId = null;
  document.getElementById("store_id").disabled = false;
  document.getElementById("storeForm").reset();
  document.getElementById("cancelStoreEdit").style.display = "none";
});

async function deleteStore(id) {
  if (confirm("Delete store?")) {
    await fetch(`/api/stores/${id}`, { method: "DELETE" });
    window.location.reload();
  }
}

document.getElementById("searchStore").addEventListener("input", renderStores);

// --- Events ---

document.getElementById("eventForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const targetVal = document.getElementById("event_target").value;
  let store_id = null,
    wing_id = null;
  if (targetVal.startsWith("store:")) store_id = targetVal.slice(6);
  else if (targetVal.startsWith("wing:")) wing_id = targetVal.slice(5);

  const payload = {
    title: document.getElementById("event_title").value.trim(),
    description: document.getElementById("event_description").value.trim(),
    start_date: document.getElementById("event_start").value,
    end_date: document.getElementById("event_end").value,
    store_id,
    wing_id,
    image_url: document.getElementById("event_image").value.trim() || null,
  };

  if (new Date(payload.end_date) < new Date(payload.start_date)) {
    alert("End date can't be before start date");
    return;
  }

  const url = editEventId ? `/api/events/${editEventId}` : "/api/events";
  const method = editEventId ? "PUT" : "POST";
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.ok) {
    alert("Saved");
    window.location.reload();
  } else {
    const body = await res.json().catch(() => ({}));
    alert(`Error saving event${body.error ? `: ${body.error}` : ""}`);
  }
});

function editEvent(id) {
  const ev = events.find((x) => x.id === id);
  if (!ev) return;
  editEventId = id;
  document.getElementById("event_title").value = ev.title;
  document.getElementById("event_description").value = ev.description || "";
  document.getElementById("event_start").value = toDateInputValue(
    ev.start_date,
  );
  document.getElementById("event_end").value = toDateInputValue(ev.end_date);
  document.getElementById("event_target").value = ev.store_id
    ? `store:${ev.store_id}`
    : ev.wing_id
      ? `wing:${ev.wing_id}`
      : "";
  document.getElementById("event_image").value = ev.image_url || "";
  document.getElementById("cancelEventEdit").style.display = "inline-block";
}

document.getElementById("cancelEventEdit").addEventListener("click", () => {
  editEventId = null;
  document.getElementById("eventForm").reset();
  document.getElementById("cancelEventEdit").style.display = "none";
});

async function deleteEvent(id) {
  if (confirm("Delete event?")) {
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    window.location.reload();
  }
}

// Postgres returns full timestamps (e.g. "2026-07-09T00:00:00.000Z");
// <input type="date"> needs just the "YYYY-MM-DD" portion.
function toDateInputValue(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>]/g, function (m) {
    if (m === "&") return "&amp;";
    if (m === "<") return "&lt;";
    if (m === ">") return "&gt;";
    return m;
  });
}

fetchAll();
