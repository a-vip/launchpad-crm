// Launchpad CRM UI Controller
let STATE = { contacts: [], updatedAt: null };
let CURRENT_VIEW = "today";
let ACTIVE_CONTACT_ID = null;
let DRAG_ID = null;

const L = window.CRM_LOGIC;
const STAGES = window.CRM_STAGES;

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2600);
}

async function persist(label = "Saved locally") {
  await window.CRM_DB.save(STATE);
  document.getElementById("save-status").textContent = `${label} · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  renderAll();
}

function getContact(id) {
  return STATE.contacts.find(c => c.id === id);
}

function renderKPIs() {
  const cs = STATE.contacts;
  const openPipelineVal = cs
    .filter(c => ["cold", "warm", "offer"].includes(c.stage))
    .reduce((sum, c) => sum + Number(c.dealValue || 0), 0);
  const collected = cs
    .filter(c => c.paymentStatus === "paid")
    .reduce((sum, c) => sum + Number(c.dealValue || 0), 0);
  const students = cs.filter(c => c.stage === "student").length;
  const alumni = cs.filter(c => c.stage === "alumni").length;
  const dueCount = cs.filter(c => !["nurture", "alumni"].includes(c.stage) && L.isDueTodayOrOverdue(c)).length;
  const rotCount = cs.filter(c => L.isRotting(c)).length;

  document.getElementById("kpi-grid").innerHTML = `
    <div class="kpi"><div class="kpi-label">Collected Cash</div><div class="kpi-val" style="color:var(--emerald);">£${collected.toLocaleString()}</div><div class="kpi-sub">${students + alumni} paid enrollments</div></div>
    <div class="kpi"><div class="kpi-label">Open Pipeline</div><div class="kpi-val" style="color:var(--cyan);">£${openPipelineVal.toLocaleString()}</div><div class="kpi-sub">${cs.filter(c => ["cold", "warm", "offer"].includes(c.stage)).length} active leads</div></div>
    <div class="kpi"><div class="kpi-label">Active Students</div><div class="kpi-val">${students}</div><div class="kpi-sub">${alumni} graduated alumni</div></div>
    <div class="kpi"><div class="kpi-label">Follow-Ups Due</div><div class="kpi-val" style="color:${dueCount ? "var(--amber)" : "var(--text)"};">${dueCount}</div><div class="kpi-sub">Today or overdue</div></div>
    <div class="kpi"><div class="kpi-label">Deal Rot Alerts</div><div class="kpi-val" style="color:${rotCount ? "var(--rose)" : "var(--text)"};">${rotCount}</div><div class="kpi-sub">&gt;7 days stale in warm/offer</div></div>
  `;
}

function tempBadge(c) {
  const t = L.temperatureOf(c);
  if (t === "paid") return `<span class="badge badge-paid">PAID</span>`;
  if (t === "hot") return `<span class="badge badge-hot">HOT · ${L.computeScore(c)}</span>`;
  if (t === "warm") return `<span class="badge badge-warm">WARM · ${L.computeScore(c)}</span>`;
  return `<span class="badge badge-cold">COLD · ${L.computeScore(c)}</span>`;
}

function renderToday() {
  const due = STATE.contacts
    .filter(c => !["nurture"].includes(c.stage) && L.isDueTodayOrOverdue(c))
    .sort((a, b) => L.computeScore(b) - L.computeScore(a));
  const rot = STATE.contacts.filter(c => L.isRotting(c));
  const hot = STATE.contacts
    .filter(c => ["cold", "warm", "offer"].includes(c.stage) && L.computeScore(c) >= 65)
    .sort((a, b) => L.computeScore(b) - L.computeScore(a));

  const itemHtml = (c, sub) => `
    <div class="queue-item" onclick="openDrawer('${esc(c.id)}')">
      <div>
        <div style="font-weight:700;">${esc(c.name)} <span style="color:var(--muted);font-weight:400;">· ${esc(c.company || c.email)}</span></div>
        <div style="font-size:0.78rem;color:var(--muted);">${sub}</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;">
        ${L.isRotting(c) ? '<span class="badge badge-rot">ROT</span>' : ""}
        ${tempBadge(c)}
      </div>
    </div>`;

  document.getElementById("view-today").innerHTML = `
    <div class="grid-2">
      <div class="panel">
        <h2><span>Today &amp; Overdue Follow-Ups</span><span class="kan-count">${due.length}</span></h2>
        <div class="queue-list">${due.length ? due.map(c => itemHtml(c, `Due: ${esc(c.nextFollowUp)} · Stage: ${esc(c.stage)}`)).join("") : '<p style="color:var(--muted);font-size:0.86rem;">Zero overdue follow-ups. Add leads or pull from warm contacts.</p>'}</div>
      </div>
      <div class="panel">
        <h2><span>Hot Leads &amp; Deal Rot Alerts</span><span class="kan-count">${hot.length + rot.length}</span></h2>
        <div class="queue-list">
          ${rot.map(c => itemHtml(c, `Stale ${L.daysBetween(c.lastContactAt)}d in "${esc(c.stage)}" — send Day 5/9 check-in`)).join("")}
          ${hot.filter(c => !L.isRotting(c)).map(c => itemHtml(c, `£${c.dealValue} · ${esc(c.goal || c.track)}`)).join("")}
          ${(!rot.length && !hot.length) ? '<p style="color:var(--muted);font-size:0.86rem;">No stale deals or hot alerts right now.</p>' : ""}
        </div>
      </div>
    </div>
  `;
}

function renderPipeline() {
  const cols = STAGES.map(st => {
    const cards = STATE.contacts
      .filter(c => c.stage === st.id)
      .sort((a, b) => L.computeScore(b) - L.computeScore(a));
    const total = cards.reduce((s, c) => s + Number(c.dealValue || 0), 0);
    return `
      <div class="kan-col" ondragover="event.preventDefault();this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="dropCard(event,'${st.id}',this)">
        <div class="kan-head"><span>${esc(st.label)}</span><span class="kan-count">${cards.length} · £${total}</span></div>
        ${cards.map(c => `
          <div class="kan-card" draggable="true" ondragstart="DRAG_ID='${esc(c.id)}'" onclick="openDrawer('${esc(c.id)}')">
            <div class="kan-card-top">
              <span class="kan-name">${esc(c.name)}</span>
              ${tempBadge(c)}
            </div>
            <div class="kan-meta">${esc(c.company || c.email || "No company")}</div>
            <div class="kan-meta">£${c.dealValue || 0} · ${esc(c.track)} ${L.isRotting(c) ? '· <span style="color:var(--rose);font-weight:700;">ROT</span>' : ""}</div>
          </div>`).join("")}
      </div>`;
  }).join("");

  document.getElementById("view-pipeline").innerHTML = `<div class="kanban-wrap">${cols}</div>`;
}

async function dropCard(e, newStage, colEl) {
  e.preventDefault();
  colEl.classList.remove("drag-over");
  if (!DRAG_ID) return;
  const c = getContact(DRAG_ID);
  DRAG_ID = null;
  if (!c || c.stage === newStage) return;
  c.stage = newStage;
  if (newStage === "student" || newStage === "alumni") c.paymentStatus = "paid";
  c.lastContactAt = L.todayISO();
  c.activities.unshift({ at: L.todayISO(), type: "stage", note: `Moved to stage: ${newStage}` });
  await persist("Stage updated");
  showToast(`Moved ${c.name} → ${newStage}`);
}

function renderContacts() {
  const q = (document.getElementById("flt-search")?.value || "").toLowerCase();
  const stageF = document.getElementById("flt-stage")?.value || "all";
  const tempF = document.getElementById("flt-temp")?.value || "all";

  const filtered = STATE.contacts.filter(c => {
    const textMatch = !q || [c.name, c.email, c.company, c.goal, (c.tags || []).join(" ")].join(" ").toLowerCase().includes(q);
    const stageMatch = stageF === "all" || c.stage === stageF;
    const tempMatch = tempF === "all" || L.temperatureOf(c) === tempF;
    return textMatch && stageMatch && tempMatch;
  });

  document.getElementById("view-contacts").innerHTML = `
    <div class="toolbar">
      <input class="input" id="flt-search" style="min-width:240px;flex:1;" placeholder="Search name, email, company, goal, tags..." value="${esc(q)}" oninput="renderContacts()" />
      <select class="input" id="flt-stage" onchange="renderContacts()">
        <option value="all" ${stageF === "all" ? "selected" : ""}>All Stages</option>
        ${STAGES.map(s => `<option value="${s.id}" ${stageF === s.id ? "selected" : ""}>${esc(s.label)}</option>`).join("")}
      </select>
      <select class="input" id="flt-temp" onchange="renderContacts()">
        <option value="all" ${tempF === "all" ? "selected" : ""}>All Temps</option>
        <option value="hot" ${tempF === "hot" ? "selected" : ""}>Hot (≥65)</option>
        <option value="warm" ${tempF === "warm" ? "selected" : ""}>Warm</option>
        <option value="cold" ${tempF === "cold" ? "selected" : ""}>Cold</option>
        <option value="paid" ${tempF === "paid" ? "selected" : ""}>Paid / Alumni</option>
      </select>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Contact</th><th>Temp / Score</th><th>Stage</th><th>Track &amp; Value</th><th>Payment</th><th>Next Follow-Up</th><th>Actions</th></tr></thead>
        <tbody>
          ${filtered.map(c => `
            <tr style="cursor:pointer;" onclick="openDrawer('${esc(c.id)}')">
              <td><strong>${esc(c.name)}</strong><div style="font-size:0.77rem;color:var(--muted);">${esc(c.email)} · ${esc(c.company)}</div></td>
              <td>${tempBadge(c)} ${L.isRotting(c) ? '<span class="badge badge-rot">ROT</span>' : ""}</td>
              <td>${esc(STAGES.find(s => s.id === c.stage)?.label || c.stage)}</td>
              <td>£${c.dealValue || 0} · ${esc(c.track)}</td>
              <td>${esc(c.paymentStatus)} ${c.paymentMethod ? `(${esc(c.paymentMethod)})` : ""}</td>
              <td>${esc(c.nextFollowUp || "—")}</td>
              <td><button class="btn btn-sm" onclick="event.stopPropagation();openDrawer('${esc(c.id)}')">Open</button></td>
            </tr>`).join("") || '<tr><td colspan="7" style="color:var(--muted);text-align:center;padding:24px;">No contacts match filter.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function renderStudents() {
  const active = STATE.contacts.filter(c => c.stage === "student");
  const alumni = STATE.contacts.filter(c => c.stage === "alumni");

  const cardRow = (c, isAlumni) => `
    <div class="queue-item" onclick="openDrawer('${esc(c.id)}')">
      <div>
        <strong>${esc(c.name)}</strong> <span style="color:var(--muted);">· ${esc(c.cohortBatch || c.track)} (£${c.dealValue || 0})</span>
        <div style="font-size:0.78rem;color:var(--muted);margin-top:3px;">
          Pre-Flight: ${c.checklist?.preflightSent ? "✓" : "○"} ·
          Attended: ${c.checklist?.attendedLive ? "✓" : "○"} ·
          Shipped: ${c.checklist?.projectShipped ? "✓" : "○"} ·
          Review: ${c.checklist?.reviewCaptured ? "✓" : "○"} ·
          ${isAlumni ? `1-on-1 Upsell: ${c.checklist?.upsellPitched ? "✓" : "○"} · B2B Seed: ${c.checklist?.b2bSeeded ? "✓" : "○"}` : `Bonus Granted: ${c.checklist?.bonusGranted ? "✓" : "○"}`}
        </div>
      </div>
      <button class="btn btn-sm">${isAlumni ? "Retention & Upsell" : "Delivery Checklist"}</button>
    </div>`;

  document.getElementById("view-students").innerHTML = `
    <div class="grid-2">
      <div class="panel">
        <h2><span>Active Students (Delivery &amp; Onboarding)</span><span class="kan-count">${active.length}</span></h2>
        <div class="queue-list">${active.length ? active.map(c => cardRow(c, false)).join("") : '<p style="color:var(--muted);font-size:0.86rem;">No active students yet.</p>'}</div>
      </div>
      <div class="panel">
        <h2><span>Graduated Alumni (Reviews, 1-on-1 &amp; B2B)</span><span class="kan-count">${alumni.length}</span></h2>
        <div class="queue-list">${alumni.length ? alumni.map(c => cardRow(c, true)).join("") : '<p style="color:var(--muted);font-size:0.86rem;">Graduated students appear here for review &amp; upsell tracking.</p>'}</div>
      </div>
    </div>
  `;
}

function renderTemplates() {
  document.getElementById("view-templates").innerHTML = `
    <div class="grid-2">
      ${window.CRM_TEMPLATES.map(t => `
        <div class="panel">
          <h2><span>${esc(t.title)}</span><span class="badge badge-cold">${esc(t.category)}</span></h2>
          <pre style="white-space:pre-wrap;font-family:inherit;font-size:0.84rem;color:#cbd5e1;background:var(--card);padding:12px;border-radius:8px;border:1px solid var(--border);margin-bottom:10px;">${esc(t.body)}</pre>
          <button class="btn btn-sm btn-primary" onclick="copyText(${JSON.stringify(t.body)})">Copy Template</button>
        </div>`).join("")}
    </div>
  `;
}

async function copyText(str) {
  try {
    await navigator.clipboard.writeText(str);
    showToast("Copied to clipboard!");
  } catch (_) {
    showToast("Copy failed — select text manually");
  }
}

function openDrawer(id) {
  ACTIVE_CONTACT_ID = id;
  const c = getContact(id);
  if (!c) return;
  const ck = c.checklist || {};
  document.getElementById("contact-drawer").innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
      <div>
        <h2 style="font-size:1.25rem;">${esc(c.name)}</h2>
        <p style="font-size:0.84rem;color:var(--muted);">${esc(c.email)} · ${esc(c.company || "Independent")}</p>
        <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">${tempBadge(c)} <span class="badge badge-cold">${esc(c.cohortBatch || c.track)}</span></div>
      </div>
      <button class="btn btn-sm" onclick="closeDrawer()">Close</button>
    </div>

    <div class="row">
      <div class="field">
        <label>Pipeline Stage</label>
        <select class="input" onchange="updateField('${esc(c.id)}','stage',this.value)">
          ${STAGES.map(s => `<option value="${s.id}" ${c.stage === s.id ? "selected" : ""}>${esc(s.label)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Payment Status</label>
        <select class="input" onchange="updateField('${esc(c.id)}','paymentStatus',this.value)">
          <option value="unpaid" ${c.paymentStatus === "unpaid" ? "selected" : ""}>Unpaid</option>
          <option value="pending" ${c.paymentStatus === "pending" ? "selected" : ""}>Pending / Link Sent</option>
          <option value="paid" ${c.paymentStatus === "paid" ? "selected" : ""}>Paid</option>
        </select>
      </div>
    </div>

    <div class="row">
      <div class="field">
        <label>Payment Rail</label>
        <select class="input" onchange="updateField('${esc(c.id)}','paymentMethod',this.value)">
          <option value="" ${!c.paymentMethod ? "selected" : ""}>Not chosen</option>
          <option value="PayPal" ${c.paymentMethod === "PayPal" ? "selected" : ""}>PayPal</option>
          <option value="Revolut" ${c.paymentMethod === "Revolut" ? "selected" : ""}>Revolut</option>
          <option value="Monzo" ${c.paymentMethod === "Monzo" ? "selected" : ""}>Monzo</option>
          <option value="Invoice" ${c.paymentMethod === "Invoice" ? "selected" : ""}>B2B Invoice</option>
        </select>
      </div>
      <div class="field">
        <label>Next Follow-Up Date</label>
        <input type="date" class="input" value="${esc(c.nextFollowUp || "")}" onchange="updateField('${esc(c.id)}','nextFollowUp',this.value)" />
      </div>
    </div>

    <div class="field">
      <label>Goal / Project Note</label>
      <textarea class="input" rows="2" onchange="updateField('${esc(c.id)}','goal',this.value)">${esc(c.goal || "")}</textarea>
    </div>

    <div>
      <label style="font-size:0.78rem;color:var(--muted);font-weight:600;display:block;margin-bottom:6px;">Behavioral Signals &amp; Student/Alumni Lifecycle</label>
      <div class="check-grid">
        <label class="check-item"><input type="checkbox" ${c.viewedDeck ? "checked" : ""} onchange="updateField('${esc(c.id)}','viewedDeck',this.checked)" /> Viewed Deck / Page (+10)</label>
        <label class="check-item"><input type="checkbox" ${c.replied ? "checked" : ""} onchange="updateField('${esc(c.id)}','replied',this.checked)" /> Replied to Message (+15)</label>
        <label class="check-item"><input type="checkbox" ${ck.preflightSent ? "checked" : ""} onchange="updateChecklist('${esc(c.id)}','preflightSent',this.checked)" /> Pre-Flight Checklist Sent</label>
        <label class="check-item"><input type="checkbox" ${ck.attendedLive ? "checked" : ""} onchange="updateChecklist('${esc(c.id)}','attendedLive',this.checked)" /> Attended Live Sprint</label>
        <label class="check-item"><input type="checkbox" ${ck.projectShipped ? "checked" : ""} onchange="updateChecklist('${esc(c.id)}','projectShipped',this.checked)" /> Shipped Live Project</label>
        <label class="check-item"><input type="checkbox" ${ck.reviewCaptured ? "checked" : ""} onchange="updateChecklist('${esc(c.id)}','reviewCaptured',this.checked)" /> Review Captured</label>
        <label class="check-item"><input type="checkbox" ${ck.bonusGranted ? "checked" : ""} onchange="updateChecklist('${esc(c.id)}','bonusGranted',this.checked)" /> Masterclass Bonus Granted</label>
        <label class="check-item"><input type="checkbox" ${ck.upsellPitched ? "checked" : ""} onchange="updateChecklist('${esc(c.id)}','upsellPitched',this.checked)" /> 1-on-1 / B2B Upsell Pitched</label>
      </div>
    </div>

    <div>
      <label style="font-size:0.78rem;color:var(--muted);font-weight:600;display:block;margin-bottom:6px;">1-Click Personalized Message (Auto-fills Name &amp; Goal)</label>
      <div style="display:flex;gap:8px;">
        <select class="input" id="drawer-tpl" style="flex:1;">
          ${window.CRM_TEMPLATES.map(t => `<option value="${esc(t.id)}">${esc(t.category)}: ${esc(t.title)}</option>`).join("")}
        </select>
        <button class="btn btn-primary btn-sm" onclick="copyInterpolated('${esc(c.id)}')">Copy Message</button>
      </div>
    </div>

    <div>
      <label style="font-size:0.78rem;color:var(--muted);font-weight:600;display:block;margin-bottom:6px;">Log Touchpoint / Activity</label>
      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <input class="input" id="new-activity-note" style="flex:1;" placeholder="Sent PayPal link, replied on LinkedIn, etc." />
        <button class="btn btn-sm btn-primary" onclick="addActivity('${esc(c.id)}')">Log</button>
      </div>
      <div class="timeline-list">
        ${(c.activities || []).map(a => `<div class="tl-item"><div class="tl-date">${esc(a.at)} · ${esc(a.type)}</div><div>${esc(a.note)}</div></div>`).join("")}
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid var(--border);">
      <button class="btn btn-sm" onclick="quickBumpFollowUp('${esc(c.id)}', 3)">Snooze Follow-Up +3d</button>
      <button class="btn btn-sm btn-danger" onclick="deleteContact('${esc(c.id)}')">Delete Contact</button>
    </div>
  `;
  document.getElementById("drawer-backdrop").classList.add("open");
}

function closeDrawer() {
  ACTIVE_CONTACT_ID = null;
  document.getElementById("drawer-backdrop").classList.remove("open");
}

async function updateField(id, field, val) {
  const c = getContact(id);
  if (!c) return;
  c[field] = val;
  if (field === "stage" && (val === "student" || val === "alumni")) c.paymentStatus = "paid";
  c.lastContactAt = L.todayISO();
  await persist();
  if (ACTIVE_CONTACT_ID === id) openDrawer(id);
}

async function updateChecklist(id, key, val) {
  const c = getContact(id);
  if (!c) return;
  c.checklist = c.checklist || {};
  c.checklist[key] = val;
  await persist();
}

async function addActivity(id) {
  const inp = document.getElementById("new-activity-note");
  const note = inp.value.trim();
  if (!note) return;
  const c = getContact(id);
  if (!c) return;
  c.activities = c.activities || [];
  c.activities.unshift({ at: L.todayISO(), type: "note", note });
  c.lastContactAt = L.todayISO();
  await persist("Logged touchpoint");
  openDrawer(id);
}

async function quickBumpFollowUp(id, days) {
  const c = getContact(id);
  if (!c) return;
  c.nextFollowUp = L.addDaysISO(days);
  await persist(`Follow-up set +${days}d`);
  openDrawer(id);
}

function copyInterpolated(id) {
  const c = getContact(id);
  const tplId = document.getElementById("drawer-tpl").value;
  const tpl = window.CRM_TEMPLATES.find(t => t.id === tplId);
  if (!c || !tpl) return;
  copyText(L.interpolate(tpl.body, c));
}

async function deleteContact(id) {
  STATE.contacts = STATE.contacts.filter(c => c.id !== id);
  closeDrawer();
  await persist("Contact deleted");
}

async function clearDemoData() {
  STATE.contacts = STATE.contacts.filter(c => !c.isDemo);
  await persist("Demo data cleared");
  showToast("Demo records removed.");
}

function openNewModal() {
  document.getElementById("nl-stage").innerHTML = STAGES.map(s => `<option value="${s.id}">${esc(s.label)}</option>`).join("");
  document.getElementById("nl-stage").value = "warm";
  document.getElementById("nl-followup").value = L.addDaysISO(2);
  document.getElementById("lead-modal").classList.add("open");
}
function closeLeadModal() { document.getElementById("lead-modal").classList.remove("open"); }

async function saveNewLead(e) {
  e.preventDefault();
  const c = {
    id: "c-" + Date.now(),
    isDemo: false,
    name: document.getElementById("nl-name").value.trim(),
    email: document.getElementById("nl-email").value.trim(),
    company: document.getElementById("nl-company").value.trim(),
    role: document.getElementById("nl-role").value.trim(),
    isDecisionMaker: document.getElementById("nl-dm").checked,
    source: document.getElementById("nl-source").value,
    stage: document.getElementById("nl-stage").value,
    track: document.getElementById("nl-track").value,
    dealValue: Number(document.getElementById("nl-value").value || 0),
    currency: "GBP",
    paymentStatus: ["student", "alumni"].includes(document.getElementById("nl-stage").value) ? "paid" : "unpaid",
    paymentMethod: "",
    goal: document.getElementById("nl-goal").value.trim(),
    viewedDeck: false,
    replied: false,
    nextFollowUp: document.getElementById("nl-followup").value || L.addDaysISO(2),
    lastContactAt: L.todayISO(),
    createdAt: L.todayISO(),
    cohortBatch: document.getElementById("nl-batch").value.trim() || "Cohort #1",
    tags: [],
    checklist: { preflightSent: false, attendedLive: false, projectShipped: false, reviewCaptured: false, bonusGranted: false, upsellPitched: false, b2bSeeded: false },
    activities: [{ at: L.todayISO(), type: "created", note: "Added to Launchpad CRM." }]
  };
  STATE.contacts.unshift(c);
  document.getElementById("lead-form").reset();
  closeLeadModal();
  await persist("Lead added");
  showToast(`Added ${c.name}`);
}

function openImportModal() { document.getElementById("import-modal").classList.add("open"); }
function closeImportModal() { document.getElementById("import-modal").classList.remove("open"); }

async function runCSVImport() {
  const fileInp = document.getElementById("csv-file-input");
  let text = document.getElementById("csv-paste").value.trim();
  if (!text && fileInp.files[0]) {
    text = await fileInp.files[0].text();
  }
  const rows = L.parseCSV(text);
  if (!rows.length) {
    showToast("No valid CSV rows found.");
    return;
  }
  let added = 0;
  rows.forEach((r, idx) => {
    const keys = Object.keys(r);
    const find = (re) => {
      const k = keys.find(key => re.test(key));
      return k ? r[k] : "";
    };
    const name = find(/name/i) || find(/email/i) || `Imported Lead ${idx + 1}`;
    const email = find(/email/i);
    if (email && STATE.contacts.some(c => c.email && c.email.toLowerCase() === email.toLowerCase())) return;
    const goal = find(/build|goal|automate|project/i);
    const trackRaw = find(/option|track|booking/i).toLowerCase();
    const track = trackRaw.includes("1-on-1") || trackRaw.includes("one") ? "oneOnOne" : trackRaw.includes("team") ? "team" : "cohort";
    const val = track === "oneOnOne" ? 199 : track === "team" ? 750 : 79;
    STATE.contacts.unshift({
      id: `imp-${Date.now()}-${idx}`,
      isDemo: false,
      name,
      email,
      company: find(/company|org/i),
      role: "",
      isDecisionMaker: true,
      source: "inbound-form",
      stage: "warm",
      track,
      dealValue: val,
      currency: "GBP",
      paymentStatus: "pending",
      paymentMethod: find(/payment|method/i),
      goal,
      viewedDeck: true,
      replied: false,
      nextFollowUp: L.todayISO(),
      lastContactAt: L.todayISO(),
      createdAt: L.todayISO(),
      cohortBatch: "Cohort #1",
      tags: ["csv-import"],
      checklist: {},
      activities: [{ at: L.todayISO(), type: "import", note: "Imported via CSV / Google Form." }]
    });
    added++;
  });
  closeImportModal();
  await persist(`Imported ${added} leads`);
  showToast(`Imported ${added} new contacts`);
}

function openSyncModal() {
  const cfg = window.CRM_DB.getSyncConfig();
  document.getElementById("sync-token").value = cfg.token || "";
  document.getElementById("sync-gist-id").value = cfg.gistId || "";
  document.getElementById("sync-modal").classList.add("open");
}
function closeSyncModal() { document.getElementById("sync-modal").classList.remove("open"); }

async function pushGistSync() {
  const token = document.getElementById("sync-token").value.trim();
  let gistId = document.getElementById("sync-gist-id").value.trim();
  if (!token) return showToast("Paste a GitHub Gist token first.");
  try {
    gistId = await window.CRM_DB.pushToGist(STATE, token, gistId);
    window.CRM_DB.setSyncConfig({ token, gistId });
    document.getElementById("sync-gist-id").value = gistId;
    document.getElementById("save-status").textContent = "Synced to Private Gist";
    showToast("Pushed to Private GitHub Gist!");
  } catch (err) {
    showToast(err.message);
  }
}

async function pullGistSync() {
  const token = document.getElementById("sync-token").value.trim();
  const gistId = document.getElementById("sync-gist-id").value.trim();
  if (!token || !gistId) return showToast("Need both Token and Gist ID to pull.");
  try {
    const remote = await window.CRM_DB.pullFromGist(token, gistId);
    window.CRM_DB.setSyncConfig({ token, gistId });
    STATE = remote;
    await persist("Pulled from Private Gist");
    closeSyncModal();
    showToast("Pulled latest CRM data!");
  } catch (err) {
    showToast(err.message);
  }
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function exportJSON() {
  downloadFile(`launchpad-crm-${L.todayISO()}.json`, JSON.stringify(STATE, null, 2), "application/json");
}

function exportCSV() {
  const headers = ["Name", "Email", "Company", "Stage", "Track", "DealValue", "PaymentStatus", "PaymentMethod", "NextFollowUp", "Goal"];
  const lines = [headers.join(",")];
  STATE.contacts.forEach(c => {
    lines.push([c.name, c.email, c.company, c.stage, c.track, c.dealValue, c.paymentStatus, c.paymentMethod, c.nextFollowUp, c.goal]
      .map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
  });
  downloadFile(`launchpad-crm-${L.todayISO()}.csv`, lines.join("\n"), "text/csv");
}

async function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!Array.isArray(parsed.contacts)) throw new Error("Invalid backup file");
    STATE = parsed;
    await persist("Restored JSON backup");
    closeSyncModal();
    showToast("Backup restored!");
  } catch (err) {
    showToast(err.message);
  }
}

function renderAll() {
  const hasDemo = STATE.contacts.some(c => c.isDemo);
  document.getElementById("demo-banner").style.display = hasDemo ? "flex" : "none";
  renderKPIs();
  renderToday();
  renderPipeline();
  renderContacts();
  renderStudents();
  renderTemplates();
}

document.getElementById("nav-tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab-btn");
  if (!btn) return;
  CURRENT_VIEW = btn.dataset.view;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b === btn));
  ["today", "pipeline", "contacts", "students", "templates"].forEach(v => {
    document.getElementById(`view-${v}`).style.display = v === CURRENT_VIEW ? "block" : "none";
  });
});

(async () => {
  STATE = await window.CRM_DB.load();
  renderAll();
})();
