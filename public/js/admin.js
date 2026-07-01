let stores = [],
  categories = [],
  wings = [],
  amenities = [],
  events = [];
let editStoreId = null;
async function fetchAll() {
  const [sRes, cRes, wRes, aRes, eRes] = await Promise.all([
    fetch("/api/stores"),
    fetch("/api/categories"),
    fetch("/api/wings"),
    fetch("/api/amenities"),
    fetch("/api/events"),
  ]);
  stores = await sRes.json();
  categories = await cRes.json();
  wings = await wRes.json();
  amenities = await aRes.json();
  events = await eRes.json();
  populateSelects();
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
        `<tr><td>${e.title}</td><td>${e.description || ""}</td><td>${e.store_name || e.wing_name || "Mall-wide"}</td><td>${new Date(e.start_date).toLocaleDateString()} - ${new Date(e.end_date).toLocaleDateString()}</td></tr>`,
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
function escapeHtml(str) {
  return String(str).replace(/[&<>]/g, function (m) {
    if (m === "&") return "&amp;";
    if (m === "<") return "&lt;";
    if (m === ">") return "&gt;";
    return m;
  });
}
fetchAll();
