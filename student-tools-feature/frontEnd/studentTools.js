const tabs = document.querySelectorAll(".tool-tab");
const panels = document.querySelectorAll(".tool-panel");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.remove("active"));
    panels.forEach((panel) => panel.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`#tab-${tab.dataset.tab}`).classList.add("active");
  });
});

const cvForm = document.querySelector("#cvForm");
const applicationForm = document.querySelector("#applicationForm");
const vaultForm = document.querySelector("#vaultForm");
const alertsForm = document.querySelector("#alertsForm");
const forumForm = document.querySelector("#forumForm");

if (cvForm) cvForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const result = await postJson("/api/student-tools/cv", formToObject(cvForm));
  document.querySelector("#cvOutput").textContent = result.cv || "Could not generate CV.";
  renderList("#cvTips", result.tips || [], (tip) => `<li>${escapeHtml(tip)}</li>`);
});

if (applicationForm) applicationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await postJson("/api/student-tools/applications", formToObject(applicationForm));
  applicationForm.reset();
  await loadApplications();
});

if (vaultForm) vaultForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = formToObject(vaultForm);
  const file = document.querySelector("#vaultFile").files[0];

  if (file) {
    data.fileName = file.name;
    data.fileType = file.type;
    data.fileSize = file.size;
  }

  await postJson("/api/student-tools/vault", data);
  vaultForm.reset();
  await loadVault();
});

if (alertsForm) alertsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const params = new URLSearchParams(formToObject(alertsForm));
  const response = await fetch(`/api/student-tools/alerts?${params.toString()}`);
  const result = await response.json();
  renderAlerts(result.alerts || []);
});

if (forumForm) forumForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await postJson("/api/student-tools/forum", formToObject(forumForm));
  forumForm.reset();
  await loadForum();
});

async function loadApplications() {
  const response = await fetch("/api/student-tools/applications");
  const result = await response.json();
  renderApplications(result.applications || []);
}

async function loadVault() {
  const response = await fetch("/api/student-tools/vault");
  const result = await response.json();
  renderVault(result.documents || []);
}

async function loadForum() {
  const response = await fetch("/api/student-tools/forum");
  const result = await response.json();
  renderForum(result.posts || []);
}

function renderApplications(applications) {
  renderStack("#applicationsList", applications, (item) => `
    <article class="stack-item">
      <div class="item-meta">
        <span>${escapeHtml(item.type)}</span>
        <span>${escapeHtml(item.status)}</span>
        <span>${item.deadline ? escapeHtml(item.deadline) : "No deadline"}</span>
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.organization)}</p>
      <p>${escapeHtml(item.notes || "No notes added yet.")}</p>
    </article>
  `);
}

function renderVault(documents) {
  renderStack("#vaultList", documents, (item) => `
    <article class="stack-item">
      <div class="item-meta">
        <span>${escapeHtml(item.category)}</span>
        <span>${escapeHtml(item.status)}</span>
      </div>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.fileName)}${item.fileSize ? ` · ${Math.round(item.fileSize / 1024)} KB` : ""}</p>
    </article>
  `);
}

function renderAlerts(alerts) {
  renderStack("#alertsList", alerts, (item) => `
    <article class="stack-item">
      <div class="item-meta">
        <span>${escapeHtml(item.province)}</span>
        <span>${escapeHtml(item.grade)}</span>
        <span>${escapeHtml(item.careerPath)}</span>
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.reason)}</p>
    </article>
  `);
}

function renderForum(posts) {
  renderStack("#forumList", posts, (item) => `
    <article class="stack-item">
      <div class="item-meta">
        <span>${escapeHtml(item.category)}</span>
        <span>${escapeHtml(item.author)}</span>
        <span>${new Date(item.createdAt).toLocaleDateString()}</span>
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.body)}</p>
    </article>
  `);
}

function renderStack(selector, items, template) {
  const element = document.querySelector(selector);
  if (!items.length) {
    element.innerHTML = `<div class="stack-item"><p>Nothing here yet.</p></div>`;
    return;
  }
  element.innerHTML = items.map(template).join("");
}

function renderList(selector, items, template) {
  document.querySelector(selector).innerHTML = items.map(template).join("");
}

function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function postJson(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Request failed.");
  }

  return result;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

if (document.querySelector("#applicationsList")) loadApplications();
if (document.querySelector("#vaultList")) loadVault();
if (document.querySelector("#forumList")) loadForum();
