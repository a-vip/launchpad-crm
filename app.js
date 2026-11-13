// Launchpad CRM UI Controller — Upgraded 360° Student & Lead Revenue System
let STATE = { contacts: [], settings: {}, updatedAt: null };
let CURRENT_VIEW = "today";
let ACTIVE_CONTACT_ID = null;
let DRAWER_TAB = "overview";
let DRAG_ID = null;
let PRIVACY_MODE = false;
let CONTACT_FILTERS = { q: "", stage: "all", temp: "all", skill: "all" };

const L = window.CRM_LOGIC;
const STAGES = window.CRM_STAGES;
const LOSS_REASONS = window.LOSS_REASONS || [];

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2600);
}

async function persist(label = "Saved locally") {
  await window.CRM_DB.save(STATE);
  document.getElementById("save-status").textContent =
    `${label} · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  renderAll();
}

function getContact(id) {
  return STATE.contacts.find(c => c.id === id);
}

function togglePrivacyMode() {
  PRIVACY_MODE = !PRIVACY_MODE;
  document.body.classList.toggle("privacy-mode", PRIVACY_MODE);
  const btn = document.getElementById("privacy-btn");
  btn.classList.toggle("btn-active", PRIVACY_MODE);
  btn.textContent = PRIVACY_MODE ? "Privacy: ON" : "Privacy Blur";
}

function renderKPIs() {
  const cs = STATE.contacts;
  const a = L.computeAnalytics(cs, STATE.settings);
  const dueCount = cs.filter(c => L.isDueTodayOrOverdue(c)).length;
  const rotCount = cs.filter(c => L.isRotting(c)).length;

  document.getElementById("kpi-grid").innerHTML = `
    <div class="kpi">
      <div class="kpi-label">Collected Cash</div>
      <div class="kpi-val pii" style="color:var(--emerald);">£${a.totalCollected.toLocaleString()}</div>
      <div class="kpi-sub">${a.paidTotal} paid (${a.conversionPct}% conversion)</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Open Pipeline</div>
      <div class="kpi-val pii" style="color:var(--cyan);">£${a.openPipeline.toLocaleString()}</div>
      <div class="kpi-sub">${cs.filter(c => ["cold", "warm", "offer"].includes(c.stage)).length} active leads · <span class="pii">£${a.totalOutstanding}</span> due</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Cohort #1 Seats</div>
      <div class="kpi-val">${a.cohort1Count} / ${a.cap}</div>
      <div class="progress-track"><div class="progress-fill" style="width:${a.cohort1FillPct}%;"></div></div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Follow-Ups Due</div>
      <div class="kpi-val" style="color:${dueCount ? "var(--amber)" : "var(--text)"};">${dueCount}</div>
      <div class="kpi-sub">${a.upsellReadyCount} alumni ready for 1-on-1 upsell</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Deal Rot Alerts</div>
      <div class="kpi-val" style="color:${rotCount ? "var(--rose)" : "var(--text)"};">${rotCount}</div>
      <div class="kpi-sub">&gt;7 days stale in warm/offer</div>
    </div>
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
    .filter(c => L.isDueTodayOrOverdue(c))
    .sort((a, b) => L.computeScore(b) - L.computeScore(a));
  const rot = STATE.contacts.filter(c => L.isRotting(c));
  const hot = STATE.contacts
    .filter(c => ["cold", "warm", "offer"].includes(c.stage) && L.computeScore(c) >= 65)
    .sort((a, b) => L.computeScore(b) - L.computeScore(a));
  const upsellReady = STATE.contacts.filter(c => c.stage === "alumni" && !c.checklist?.upsellPitched);

  const itemHtml = (c, sub) => `
    <div class="queue-item" onclick="openDrawer('${esc(c.id)}')">
      <div>
        <div style="font-weight:700;"><span class="pii">${esc(c.name)}</span> <span class="pii" style="color:var(--muted);font-weight:400;">· ${esc(c.company || c.email)}</span></div>
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
        <div class="queue-list">${due.length ? due.map(c => itemHtml(c, `Due: ${esc(c.nextFollowUp)} · ${esc(c.stage)} · ${esc(c.goal || c.track)}`)).join("") : '<p style="color:var(--muted);font-size:0.86rem;">Zero overdue follow-ups. Add leads or import your Google Form CSV.</p>'}</div>
      </div>
      <div class="panel">
        <h2><span>Hot Leads, Deal Rot &amp; Revenue Upsells</span><span class="kan-count">${hot.length + rot.length + upsellReady.length}</span></h2>
        <div class="queue-list">
          ${rot.map(c => itemHtml(c, `Stale ${L.daysBetween(c.lastContactAt)}d in "${esc(c.stage)}" — send Day 5/9 check-in`)).join("")}
          ${hot.filter(c => !L.isRotting(c)).map(c => itemHtml(c, `<span class="pii">£${c.dealValue}</span> · ${esc(c.goal || c.track)}`)).join("")}
          ${upsellReady.map(c => itemHtml(c, `Graduated Alumni — pitch £129 1-on-1 upgrade or B2B referral`)).join("")}
          ${(!rot.length && !hot.length && !upsellReady.length) ? '<p style="color:var(--muted);font-size:0.86rem;">No stale deals or hot alerts right now.</p>' : ""}
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
        <div class="kan-head"><span>${esc(st.label)}</span><span class="kan-count">${cards.length} · <span class="pii">£${total}</span></span></div>
        ${cards.map(c => `
          <div class="kan-card" draggable="true" ondragstart="DRAG_ID='${esc(c.id)}'" onclick="openDrawer('${esc(c.id)}')">
            <div class="kan-card-top">
              <span class="kan-name pii">${esc(c.name)}</span>
              ${tempBadge(c)}
            </div>
            <div class="kan-meta pii">${esc(c.company || c.email || "No company")}</div>
            <div class="kan-meta"><span class="pii">£${c.dealValue || 0}</span> · ${esc(c.track)} · ${esc(c.skillLevel || "non-coder")} ${L.isRotting(c) ? '· <span style="color:var(--rose);font-weight:700;">ROT</span>' : ""}</div>
            <select class="kan-move" onclick="event.stopPropagation()" onchange="moveStage('${esc(c.id)}', this.value)">
              ${STAGES.map(opt => `<option value="${opt.id}" ${opt.id === c.stage ? "selected" : ""}>Move: ${esc(opt.label)}</option>`).join("")}
            </select>
          </div>`).join("")}
      </div>`;
  }).join("");

  document.getElementById("view-pipeline").innerHTML = `<div class="kanban-wrap">${cols}</div>`;
}

async function moveStage(id, newStage) {
  const c = getContact(id);
  if (!c || c.stage === newStage) return;
  c.stage = newStage;
  if (newStage === "student" || newStage === "alumni") {
    c.paymentStatus = "paid";
    if (!c.amountPaid) c.amountPaid = Number(c.dealValue || 0);
  }
  c.lastContactAt = L.todayISO();
  c.activities = c.activities || [];
  c.activities.unshift({ at: L.todayISO(), type: "stage", note: `Moved to stage: ${newStage}` });
  await persist("Stage updated");
  showToast(`Moved ${c.name} → ${newStage}`);
}

async function dropCard(e, newStage, colEl) {
  e.preventDefault();
  colEl.classList.remove("drag-over");
  if (!DRAG_ID) return;
  const id = DRAG_ID;
  DRAG_ID = null;
  await moveStage(id, newStage);
}

function ensureContactsScaffold() {
  const container = document.getElementById("view-contacts");
  if (document.getElementById("contacts-tbody")) return;
  container.innerHTML = `
    <div class="toolbar">
      <input class="input" id="flt-search" style="min-width:250px;flex:1;" placeholder="Search name, email, notes, custom answers, AI tools..." />
      <select class="input" id="flt-stage">
        <option value="all">All Stages</option>
        ${STAGES.map(s => `<option value="${s.id}">${esc(s.label)}</option>`).join("")}
      </select>
      <select class="input" id="flt-temp">
        <option value="all">All Temps</option>
        <option value="hot">Hot (≥65)</option>
        <option value="warm">Warm</option>
        <option value="cold">Cold</option>
        <option value="paid">Paid / Alumni</option>
      </select>
      <select class="input" id="flt-skill">
        <option value="all">All Skill Levels</option>
        <option value="non-coder">Non-Coder</option>
        <option value="light-tech">Light Tech</option>
        <option value="developer">Developer</option>
      </select>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Profile</th><th>Temp / Score</th><th>Stage</th><th>Skill &amp; Tools</th><th>Value / Paid</th><th>Next Follow-Up</th><th>Action</th></tr></thead>
        <tbody id="contacts-tbody"></tbody>
      </table>
    </div>
  `;
  document.getElementById("flt-search").addEventListener("input", (e) => { CONTACT_FILTERS.q = e.target.value.toLowerCase(); renderContacts(); });
  document.getElementById("flt-stage").addEventListener("change", (e) => { CONTACT_FILTERS.stage = e.target.value; renderContacts(); });
  document.getElementById("flt-temp").addEventListener("change", (e) => { CONTACT_FILTERS.temp = e.target.value; renderContacts(); });
  document.getElementById("flt-skill").addEventListener("change", (e) => { CONTACT_FILTERS.skill = e.target.value; renderContacts(); });
}

function renderContacts() {
  ensureContactsScaffold();
  const { q, stage, temp, skill } = CONTACT_FILTERS;
  const filtered = STATE.contacts.filter(c => {
    const searchable = [
      c.name, c.email, c.company, c.goal, c.painPoints, c.coachingNotes, c.aiTools,
      JSON.stringify(c.customFields || {}), (c.tags || []).join(" ")
    ].join(" ").toLowerCase();
    const textMatch = !q || searchable.includes(q);
    const stageMatch = stage === "all" || c.stage === stage;
    const tempMatch = temp === "all" || L.temperatureOf(c) === temp;
    const skillMatch = skill === "all" || (c.skillLevel || "non-coder") === skill;
    return textMatch && stageMatch && tempMatch && skillMatch;
  });

  document.getElementById("contacts-tbody").innerHTML = filtered.map(c => `
    <tr style="cursor:pointer;" onclick="openDrawer('${esc(c.id)}')">
      <td>
        <strong class="pii">${esc(c.name)}</strong>
        <div class="pii" style="font-size:0.76rem;color:var(--muted);">${esc(c.email)} · ${esc(c.company || c.timezone || "")}</div>
      </td>
      <td>${tempBadge(c)} ${L.isRotting(c) ? '<span class="badge badge-rot">ROT</span>' : ""}</td>
      <td>${esc(STAGES.find(s => s.id === c.stage)?.label || c.stage)}</td>
      <td>${esc(c.skillLevel || "non-coder")}<div style="font-size:0.75rem;color:var(--muted);">${esc(c.aiTools || "—")}</div></td>
      <td><span class="pii">£${L.collectedOf(c)} / £${c.dealValue || 0}</span><div style="font-size:0.75rem;color:var(--muted);">${esc(c.paymentStatus)} ${c.paymentMethod ? `(${esc(c.paymentMethod)})` : ""}</div></td>
      <td>${esc(c.nextFollowUp || "—")}</td>
      <td><button class="btn btn-sm" onclick="event.stopPropagation();openDrawer('${esc(c.id)}')">Profile</button></td>
    </tr>`).join("") || '<tr><td colspan="7" style="color:var(--muted);text-align:center;padding:24px;">No profiles match this filter.</td></tr>';
}

function renderStudents() {
  const active = STATE.contacts.filter(c => c.stage === "student");
  const alumni = STATE.contacts.filter(c => c.stage === "alumni");

  const cardRow = (c, isAlumni) => `
    <div class="queue-item" onclick="openDrawer('${esc(c.id)}')">
      <div>
        <strong class="pii">${esc(c.name)}</strong>
        <span style="color:var(--muted);">· ${esc(c.cohortBatch || c.track)} · ${esc(c.skillLevel || "non-coder")} (${esc(c.os || "OS?")})</span>
        <div style="font-size:0.78rem;color:#cbd5e1;margin-top:3px;"><strong>Goal:</strong> ${esc(c.goal || "—")}</div>
        <div style="font-size:0.76rem;color:var(--muted);margin-top:3px;">
          Pre-Flight: ${c.checklist?.preflightSent ? "✓" : "○"} ·
          Attended: ${c.checklist?.attendedLive ? "✓" : "○"} ·
          Shipped: ${c.checklist?.projectShipped ? "✓" : "○"} ·
          Review: ${c.checklist?.reviewCaptured ? "✓" : "○"} ·
          ${isAlumni ? `Upsell: ${c.checklist?.upsellPitched ? "✓" : "○"} · B2B: ${c.checklist?.b2bSeeded ? "✓" : "○"}` : `Bonus: ${c.checklist?.bonusGranted ? "✓" : "○"}`}
        </div>
      </div>
      <button class="btn btn-sm">${isAlumni ? "Alumni Profile" : "Open Student"}</button>
    </div>`;

  document.getElementById("view-students").innerHTML = `
    <div class="grid-2">
      <div class="panel">
        <h2>
          <span>Active Students Roster (${active.length})</span>
          ${active.length ? `<button class="btn btn-sm btn-cyan" id="copy-bcc-btn">Copy Emails (BCC)</button>` : ""}
        </h2>
        <div class="queue-list">${active.length ? active.map(c => cardRow(c, false)).join("") : '<p style="color:var(--muted);font-size:0.86rem;">No active students yet.</p>'}</div>
      </div>
      <div class="panel">
        <h2><span>Graduated Alumni (Reviews, 1-on-1 &amp; B2B)</span><span class="kan-count">${alumni.length}</span></h2>
        <div class="queue-list">${alumni.length ? alumni.map(c => cardRow(c, true)).join("") : '<p style="color:var(--muted);font-size:0.86rem;">Graduated students appear here for review &amp; upsell tracking.</p>'}</div>
      </div>
    </div>
  `;

  const bccBtn = document.getElementById("copy-bcc-btn");
  if (bccBtn) {
    bccBtn.addEventListener("click", () => {
      const emails = active.map(c => c.email).filter(Boolean).join(", ");
      copyText(emails || "No emails on active students");
    });
  }
}

function renderAnalytics() {
  const a = L.computeAnalytics(STATE.contacts, STATE.settings);
  document.getElementById("view-analytics").innerHTML = `
    <div class="grid-2">
      <div class="panel">
        <h2><span>Cohort &amp; Offer Economics</span><span class="kan-count">${a.cohorts.length} batches</span></h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Batch / Offer</th><th>People</th><th>Paid</th><th>Collected</th><th>Pending</th></tr></thead>
            <tbody>
              ${a.cohorts.map(b => `<tr><td><strong>${esc(b.name)}</strong></td><td>${b.seats}</td><td>${b.paid}</td><td class="pii" style="color:var(--emerald);">£${b.collected}</td><td class="pii">£${b.pending}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>
      <div class="panel">
        <h2><span>Lead Source ROI (What Converts to Cash)</span><span class="kan-count">${a.sources.length} sources</span></h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Source</th><th>Leads</th><th>Paid</th><th>Conv %</th><th>Revenue</th></tr></thead>
            <tbody>
              ${a.sources.map(s => `<tr><td><strong>${esc(s.name)}</strong></td><td>${s.leads}</td><td>${s.paid}</td><td>${Math.round((s.paid / (s.leads || 1)) * 100)}%</td><td class="pii" style="color:var(--emerald);">£${s.revenue}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderTemplates() {
  document.getElementById("view-templates").innerHTML = `
    <div class="grid-2">
      ${window.CRM_TEMPLATES.map((t, idx) => `
        <div class="panel">
          <h2><span>${esc(t.title)}</span><span class="badge badge-cold">${esc(t.category)}</span></h2>
          <pre style="white-space:pre-wrap;font-family:inherit;font-size:0.83rem;color:#cbd5e1;background:var(--card);padding:12px;border-radius:8px;border:1px solid var(--border);margin-bottom:10px;">${esc(t.body)}</pre>
          <button class="btn btn-sm btn-primary tpl-copy-btn" data-tpl-idx="${idx}">Copy Template</button>
        </div>`).join("")}
    </div>
  `;
  document.querySelectorAll(".tpl-copy-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tpl = window.CRM_TEMPLATES[Number(btn.dataset.tplIdx)];
      if (tpl) copyText(tpl.body);
    });
  });
}

async function copyText(str) {
  try {
    await navigator.clipboard.writeText(str);
    showToast("Copied to clipboard!");
  } catch (_) {
    showToast("Copy failed — select text manually");
  }
}

function openDrawer(id, tab = DRAWER_TAB) {
  ACTIVE_CONTACT_ID = id;
  DRAWER_TAB = tab;
  const c = getContact(id);
  if (!c) return;
  const ck = c.checklist || {};
  const customEntries = Object.entries(c.customFields || {});
  const payUrl = L.buildPaymentLink(c, STATE.settings);
  const waNum = (c.phone || "").replace(/[^0-9]/g, "");

  const tabOverview = `
    <div class="row">
      <div class="field">
        <label>Pipeline Stage</label>
        <select class="input" onchange="updateField('${esc(c.id)}','stage',this.value)">
          ${STAGES.map(s => `<option value="${s.id}" ${c.stage === s.id ? "selected" : ""}>${esc(s.label)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Track / Offer</label>
        <select class="input" onchange="updateField('${esc(c.id)}','track',this.value)">
          <option value="cohort" ${c.track === "cohort" ? "selected" : ""}>Founding 2h Cohort</option>
          <option value="oneOnOne" ${c.track === "oneOnOne" ? "selected" : ""}>Private 1-on-1 Sprint</option>
          <option value="team" ${c.track === "team" ? "selected" : ""}>Team / B2B Workshop</option>
        </select>
      </div>
    </div>

    <div class="row-3">
      <div class="field"><label>Deal Value (£)</label><input type="number" class="input" value="${esc(c.dealValue ?? 0)}" onchange="updateField('${esc(c.id)}','dealValue',Number(this.value))" /></div>
      <div class="field"><label>Amount Paid (£)</label><input type="number" class="input" value="${esc(L.collectedOf(c))}" onchange="updateField('${esc(c.id)}','amountPaid',Number(this.value))" /></div>
      <div class="field"><label>Cohort / Batch</label><input class="input" value="${esc(c.cohortBatch || "")}" onchange="updateField('${esc(c.id)}','cohortBatch',this.value)" /></div>
    </div>

    <div class="row-3">
      <div class="field">
        <label>Payment Status</label>
        <select class="input" onchange="updateField('${esc(c.id)}','paymentStatus',this.value)">
          <option value="unpaid" ${c.paymentStatus === "unpaid" ? "selected" : ""}>Unpaid</option>
          <option value="pending" ${c.paymentStatus === "pending" ? "selected" : ""}>Pending / Link Sent</option>
          <option value="deposit" ${c.paymentStatus === "deposit" ? "selected" : ""}>Deposit Paid</option>
          <option value="paid" ${c.paymentStatus === "paid" ? "selected" : ""}>Paid in Full</option>
        </select>
      </div>
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
      <div class="field"><label>Next Follow-Up</label><input type="date" class="input" value="${esc(c.nextFollowUp || "")}" onchange="updateField('${esc(c.id)}','nextFollowUp',this.value)" /></div>
    </div>

    ${c.stage === "nurture" ? `
      <div class="field">
        <label>Closed-Lost Reason (for analytics)</label>
        <select class="input" onchange="updateField('${esc(c.id)}','lossReason',this.value)">
          ${LOSS_REASONS.map(r => `<option value="${esc(r)}" ${c.lossReason === r ? "selected" : ""}>${esc(r || "Select reason...")}</option>`).join("")}
        </select>
      </div>` : ""}

    <div class="quick-links">
      <button class="btn btn-sm btn-primary" onclick="markPaidAndOnboard('${esc(c.id)}')">Mark Paid &amp; Move to Student</button>
      <button class="btn btn-sm btn-cyan" id="drawer-copy-pay">Copy Pay Link</button>
      <button class="btn btn-sm" onclick="quickBumpFollowUp('${esc(c.id)}', 2)">+2d</button>
      <button class="btn btn-sm" onclick="quickBumpFollowUp('${esc(c.id)}', 5)">+5d</button>
      <button class="btn btn-sm" onclick="quickBumpFollowUp('${esc(c.id)}', 30)">+30d</button>
    </div>

    <div>
      <label style="font-size:0.77rem;color:var(--muted);font-weight:600;display:block;margin-bottom:6px;">1-Click Personalized Message (Auto-fills Name, Goal &amp; Pay Link)</label>
      <div style="display:flex;gap:8px;">
        <select class="input" id="drawer-tpl" style="flex:1;">
          ${window.CRM_TEMPLATES.map(t => `<option value="${esc(t.id)}">${esc(t.category)}: ${esc(t.title)}</option>`).join("")}
        </select>
        <button class="btn btn-primary btn-sm" onclick="copyInterpolated('${esc(c.id)}')">Copy Message</button>
      </div>
    </div>
  `;

  const tabProfile = `
    <div class="row">
      <div class="field"><label>Full Name</label><input class="input" value="${esc(c.name)}" onchange="updateField('${esc(c.id)}','name',this.value)" /></div>
      <div class="field"><label>Email</label><input class="input" value="${esc(c.email || "")}" onchange="updateField('${esc(c.id)}','email',this.value)" /></div>
    </div>
    <div class="row">
      <div class="field"><label>Phone / WhatsApp</label><input class="input" value="${esc(c.phone || "")}" onchange="updateField('${esc(c.id)}','phone',this.value)" /></div>
      <div class="field"><label>Timezone / Location</label><input class="input" value="${esc(c.timezone || "")}" onchange="updateField('${esc(c.id)}','timezone',this.value)" /></div>
    </div>
    <div class="row">
      <div class="field"><label>Company</label><input class="input" value="${esc(c.company || "")}" onchange="updateField('${esc(c.id)}','company',this.value)" /></div>
      <div class="field"><label>Role / LinkedIn URL</label><input class="input" value="${esc(c.linkedin || c.role || "")}" onchange="updateField('${esc(c.id)}','linkedin',this.value)" /></div>
    </div>
    <div class="row-3">
      <div class="field">
        <label>Skill Level</label>
        <select class="input" onchange="updateField('${esc(c.id)}','skillLevel',this.value)">
          <option value="non-coder" ${(c.skillLevel || "non-coder") === "non-coder" ? "selected" : ""}>Non-Coder</option>
          <option value="light-tech" ${c.skillLevel === "light-tech" ? "selected" : ""}>Light Tech / No-Code</option>
          <option value="developer" ${c.skillLevel === "developer" ? "selected" : ""}>Developer</option>
        </select>
      </div>
      <div class="field">
        <label>OS</label>
        <select class="input" onchange="updateField('${esc(c.id)}','os',this.value)">
          <option value="macOS" ${c.os === "macOS" ? "selected" : ""}>macOS</option>
          <option value="Windows" ${c.os === "Windows" ? "selected" : ""}>Windows</option>
          <option value="Linux" ${c.os === "Linux" ? "selected" : ""}>Linux</option>
          <option value="" ${!c.os ? "selected" : ""}>Unknown</option>
        </select>
      </div>
      <div class="field"><label>AI Tools Currently Used</label><input class="input" value="${esc(c.aiTools || "")}" onchange="updateField('${esc(c.id)}','aiTools',this.value)" /></div>
    </div>
    <div class="field"><label>What They Want to Build / Goal</label><textarea class="input" rows="2" onchange="updateField('${esc(c.id)}','goal',this.value)">${esc(c.goal || "")}</textarea></div>
    <div class="field"><label>Pain Points / Frustrations They Mentioned</label><textarea class="input" rows="2" onchange="updateField('${esc(c.id)}','painPoints',this.value)">${esc(c.painPoints || "")}</textarea></div>

    <div>
      <label style="font-size:0.77rem;color:var(--muted);font-weight:600;display:block;margin-bottom:6px;">Form Answers &amp; Extra Student Details (Preserved From Google Forms / Manual Entry)</label>
      <div style="display:grid;gap:6px;margin-bottom:8px;">
        ${customEntries.length ? customEntries.map(([k, v], idx) => `
          <div class="custom-kv">
            <div><strong>${esc(k)}:</strong> <span class="pii">${esc(v)}</span></div>
            <button class="btn btn-sm btn-danger cf-del-btn" data-cf-idx="${idx}">×</button>
          </div>`).join("") : '<p style="font-size:0.8rem;color:var(--muted);">No extra custom fields yet.</p>'}
      </div>
      <div style="display:flex;gap:6px;">
        <input class="input" id="cf-key" placeholder="Field (e.g. GitHub Handle)" style="flex:0.8;" />
        <input class="input" id="cf-val" placeholder="Value" style="flex:1;" />
        <button class="btn btn-sm btn-primary" onclick="addCustomField('${esc(c.id)}')">Add</button>
      </div>
    </div>
  `;

  const tabNotes = `
    <div class="field">
      <label>Instructor &amp; Coaching Notes (Auto-saved on edit)</label>
      <textarea class="input" rows="4" placeholder="Session notes, what clicked, blockers, upsell ideas..." onchange="updateField('${esc(c.id)}','coachingNotes',this.value)">${esc(c.coachingNotes || "")}</textarea>
    </div>
    <div class="row">
      <div class="field"><label>Student GitHub Repo URL</label><input class="input" placeholder="https://github.com/..." value="${esc(c.projectRepoUrl || "")}" onchange="updateField('${esc(c.id)}','projectRepoUrl',this.value)" /></div>
      <div class="field"><label>Live Vercel / Cloudflare URL</label><input class="input" placeholder="https://..." value="${esc(c.liveDeployUrl || "")}" onchange="updateField('${esc(c.id)}','liveDeployUrl',this.value)" /></div>
    </div>
    ${(c.projectRepoUrl || c.liveDeployUrl) ? `
      <div class="quick-links">
        ${c.projectRepoUrl ? `<a class="btn btn-sm" href="${esc(c.projectRepoUrl)}" target="_blank" rel="noopener">Open GitHub Repo ↗</a>` : ""}
        ${c.liveDeployUrl ? `<a class="btn btn-sm btn-cyan" href="${esc(c.liveDeployUrl)}" target="_blank" rel="noopener">Open Live App ↗</a>` : ""}
      </div>` : ""}

    <div>
      <label style="font-size:0.77rem;color:var(--muted);font-weight:600;display:block;margin-bottom:6px;">Behavioral Signals &amp; Student Lifecycle Checklists</label>
      <div class="check-grid">
        <label class="check-item"><input type="checkbox" ${c.viewedDeck ? "checked" : ""} onchange="updateField('${esc(c.id)}','viewedDeck',this.checked)" /> Viewed Deck / Page (+10)</label>
        <label class="check-item"><input type="checkbox" ${c.replied ? "checked" : ""} onchange="updateField('${esc(c.id)}','replied',this.checked)" /> Replied (+15)</label>
        <label class="check-item"><input type="checkbox" ${ck.preflightSent ? "checked" : ""} onchange="updateChecklist('${esc(c.id)}','preflightSent',this.checked)" /> 24h Pre-Flight Sent</label>
        <label class="check-item"><input type="checkbox" ${ck.attendedLive ? "checked" : ""} onchange="updateChecklist('${esc(c.id)}','attendedLive',this.checked)" /> Attended Live Sprint</label>
        <label class="check-item"><input type="checkbox" ${ck.projectShipped ? "checked" : ""} onchange="updateChecklist('${esc(c.id)}','projectShipped',this.checked)" /> Shipped Live URL</label>
        <label class="check-item"><input type="checkbox" ${ck.reviewCaptured ? "checked" : ""} onchange="updateChecklist('${esc(c.id)}','reviewCaptured',this.checked)" /> Testimonial Captured</label>
        <label class="check-item"><input type="checkbox" ${ck.bonusGranted ? "checked" : ""} onchange="updateChecklist('${esc(c.id)}','bonusGranted',this.checked)" /> Masterclass Bonus Sent</label>
        <label class="check-item"><input type="checkbox" ${ck.upsellPitched ? "checked" : ""} onchange="updateChecklist('${esc(c.id)}','upsellPitched',this.checked)" /> 1-on-1 / B2B Upsell Pitched</label>
      </div>
    </div>

    <div>
      <label style="font-size:0.77rem;color:var(--muted);font-weight:600;display:block;margin-bottom:6px;">Activity Timeline</label>
      <div style="display:flex;gap:6px;margin-bottom:8px;">
        <select class="input" id="new-act-type" style="width:120px;">
          <option value="note">Note</option>
          <option value="outreach">DM / Email</option>
          <option value="call">Call</option>
          <option value="payment">Payment</option>
          <option value="delivery">Live Class</option>
        </select>
        <input class="input" id="new-activity-note" style="flex:1;" placeholder="Log interaction..." onkeydown="if(event.key==='Enter'){event.preventDefault();addActivity('${esc(c.id)}');}" />
        <button class="btn btn-sm btn-primary" onclick="addActivity('${esc(c.id)}')">Log</button>
      </div>
      <div class="timeline-list">
        ${(c.activities || []).map(a => `<div class="tl-item"><div class="tl-date">${esc(a.at)} · ${esc(a.type)}</div><div>${esc(a.note)}</div></div>`).join("")}
      </div>
    </div>
  `;

  document.getElementById("contact-drawer").innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
      <div>
        <h2 style="font-size:1.25rem;" class="pii">${esc(c.name)}</h2>
        <p class="pii" style="font-size:0.83rem;color:var(--muted);">${esc(c.email || "No email")} · ${esc(c.company || c.timezone || "Independent")}</p>
        <div class="quick-links">
          ${tempBadge(c)}
          <span class="badge badge-cold">${esc(c.skillLevel || "non-coder")}</span>
          ${c.email ? `<a class="btn btn-sm" href="mailto:${esc(c.email)}">Email</a>` : ""}
          ${waNum ? `<a class="btn btn-sm" href="https://wa.me/${waNum}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
        </div>
      </div>
      <button class="btn btn-sm" onclick="closeDrawer()">Close</button>
    </div>

    <div class="drawer-tabs">
      <button class="d-tab ${DRAWER_TAB === "overview" ? "active" : ""}" onclick="openDrawer('${esc(c.id)}','overview')">Overview &amp; Money</button>
      <button class="d-tab ${DRAWER_TAB === "profile" ? "active" : ""}" onclick="openDrawer('${esc(c.id)}','profile')">Student Profile &amp; Intake</button>
      <button class="d-tab ${DRAWER_TAB === "notes" ? "active" : ""}" onclick="openDrawer('${esc(c.id)}','notes')">Notes, Projects &amp; Log</button>
    </div>

    ${DRAWER_TAB === "overview" ? tabOverview : DRAWER_TAB === "profile" ? tabProfile : tabNotes}

    <div style="display:flex;justify-content:space-between;padding-top:10px;border-top:1px solid var(--border);margin-top:auto;">
      <span style="font-size:0.75rem;color:var(--muted);">Created: ${esc(c.createdAt || "—")} · Last contact: ${esc(c.lastContactAt || "—")}</span>
      <button class="btn btn-sm btn-danger" onclick="deleteContact('${esc(c.id)}')">Delete Profile</button>
    </div>
  `;

  const copyPayBtn = document.getElementById("drawer-copy-pay");
  if (copyPayBtn) copyPayBtn.addEventListener("click", () => copyText(payUrl));
  document.querySelectorAll(".cf-del-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const entry = customEntries[Number(btn.dataset.cfIdx)];
      if (entry) removeCustomField(c.id, entry[0]);
    });
  });

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
  if (field === "stage" && (val === "student" || val === "alumni")) {
    c.paymentStatus = "paid";
    if (!c.amountPaid) c.amountPaid = Number(c.dealValue || 0);
  }
  if (field === "paymentStatus" && val === "paid" && !c.amountPaid) {
    c.amountPaid = Number(c.dealValue || 0);
  }
  c.lastContactAt = L.todayISO();
  await persist();
  if (ACTIVE_CONTACT_ID === id) openDrawer(id, DRAWER_TAB);
}

async function markPaidAndOnboard(id) {
  const c = getContact(id);
  if (!c) return;
  c.paymentStatus = "paid";
  c.amountPaid = Number(c.dealValue || 79);
  if (!["student", "alumni"].includes(c.stage)) c.stage = "student";
  c.lastContactAt = L.todayISO();
  c.activities = c.activities || [];
  c.activities.unshift({ at: L.todayISO(), type: "payment", note: `Marked paid (£${c.amountPaid}) and moved to Active Student.` });
  await persist("Marked Paid");
  openDrawer(id, DRAWER_TAB);
  showToast(`${c.name} marked Paid! Send Pre-Flight Checklist next.`);
}

async function addCustomField(id) {
  const k = document.getElementById("cf-key").value.trim();
  const v = document.getElementById("cf-val").value.trim();
  if (!k) return;
  const c = getContact(id);
  if (!c) return;
  c.customFields = c.customFields || {};
  c.customFields[k] = v;
  await persist("Saved detail");
  openDrawer(id, "profile");
}

async function removeCustomField(id, key) {
  const c = getContact(id);
  if (!c || !c.customFields) return;
  delete c.customFields[key];
  await persist("Removed detail");
  openDrawer(id, "profile");
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
  const type = document.getElementById("new-act-type")?.value || "note";
  const note = inp.value.trim();
  if (!note) return;
  const c = getContact(id);
  if (!c) return;
  c.activities = c.activities || [];
  c.activities.unshift({ at: L.todayISO(), type, note });
  c.lastContactAt = L.todayISO();
  await persist("Logged touchpoint");
  openDrawer(id, "notes");
}

async function quickBumpFollowUp(id, days) {
  const c = getContact(id);
  if (!c) return;
  c.nextFollowUp = L.addDaysISO(days);
  await persist(`Follow-up +${days}d`);
  openDrawer(id, DRAWER_TAB);
}

function copyInterpolated(id) {
  const c = getContact(id);
  const tplId = document.getElementById("drawer-tpl").value;
  const tpl = window.CRM_TEMPLATES.find(t => t.id === tplId);
  if (!c || !tpl) return;
  copyText(L.interpolate(tpl.body, c, STATE.settings));
}

async function deleteContact(id) {
  const c = getContact(id);
  if (!confirm(`Delete profile for ${c?.name || "this contact"}?`)) return;
  STATE.contacts = STATE.contacts.filter(x => x.id !== id);
  closeDrawer();
  await persist("Profile deleted");
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
  const stage = document.getElementById("nl-stage").value;
  const val = Number(document.getElementById("nl-value").value || 0);
  const isPaidStage = ["student", "alumni"].includes(stage);
  const c = {
    id: "c-" + Date.now(),
    isDemo: false,
    name: document.getElementById("nl-name").value.trim(),
    email: document.getElementById("nl-email").value.trim(),
    phone: document.getElementById("nl-phone").value.trim(),
    timezone: document.getElementById("nl-tz").value.trim(),
    linkedin: "",
    company: document.getElementById("nl-company").value.trim(),
    role: document.getElementById("nl-role").value.trim(),
    isDecisionMaker: document.getElementById("nl-dm").checked,
    skillLevel: document.getElementById("nl-skill").value,
    aiTools: document.getElementById("nl-tools").value.trim(),
    os: "",
    source: document.getElementById("nl-source").value,
    stage,
    track: document.getElementById("nl-track").value,
    dealValue: val,
    amountPaid: isPaidStage ? val : 0,
    currency: "GBP",
    paymentStatus: isPaidStage ? "paid" : "unpaid",
    paymentMethod: "",
    lossReason: "",
    goal: document.getElementById("nl-goal").value.trim(),
    painPoints: "",
    coachingNotes: document.getElementById("nl-notes").value.trim(),
    projectRepoUrl: "",
    liveDeployUrl: "",
    customFields: {},
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
  await persist("Profile added");
  showToast(`Added ${c.name}`);
}

function openSettingsModal() {
  const s = STATE.settings || {};
  document.getElementById("set-paypal").value = s.paypalMe || "";
  document.getElementById("set-revolut").value = s.revolutMe || "";
  document.getElementById("set-monzo").value = s.monzoMe || "";
  document.getElementById("set-booking").value = s.bookingUrl || "";
  document.getElementById("set-cap").value = s.defaultCohortCap || 10;
  document.getElementById("set-price").value = s.defaultCohortPrice || 79;
  document.getElementById("settings-modal").classList.add("open");
}
function closeSettingsModal() { document.getElementById("settings-modal").classList.remove("open"); }

async function saveSettingsForm(e) {
  e.preventDefault();
  STATE.settings = {
    ...STATE.settings,
    paypalMe: document.getElementById("set-paypal").value.trim(),
    revolutMe: document.getElementById("set-revolut").value.trim(),
    monzoMe: document.getElementById("set-monzo").value.trim(),
    bookingUrl: document.getElementById("set-booking").value.trim(),
    defaultCohortCap: Number(document.getElementById("set-cap").value || 10),
    defaultCohortPrice: Number(document.getElementById("set-price").value || 79)
  };
  closeSettingsModal();
  await persist("Settings saved");
  showToast("Payment & Cohort settings saved!");
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
  if (!rows.length) return showToast("No valid CSV rows found.");

  let added = 0;
  rows.forEach((r, idx) => {
    const entries = Object.entries(r);
    const findKey = (re) => entries.find(([k]) => re.test(k));
    const usedKeys = new Set();
    const take = (re) => {
      const m = findKey(re);
      if (!m) return "";
      usedKeys.add(m[0]);
      return m[1];
    };

    const name = take(/^(full\s*)?name$/i) || take(/name/i) || take(/email/i) || `Imported Lead ${idx + 1}`;
    const email = take(/email/i);
    if (email && STATE.contacts.some(c => c.email && c.email.toLowerCase() === email.toLowerCase())) return;
    const phone = take(/phone|whatsapp|mobile/i);
    const company = take(/company|org/i);
    const goal = take(/build|goal|automate|project/i);
    const skillRaw = take(/skill|comfort|coding|level/i).toLowerCase();
    const skillLevel = skillRaw.includes("dev") ? "developer" : skillRaw.includes("light") || skillRaw.includes("html") ? "light-tech" : "non-coder";
    const trackRaw = take(/option|track|booking/i).toLowerCase();
    const track = trackRaw.includes("1-on-1") || trackRaw.includes("one") ? "oneOnOne" : trackRaw.includes("team") ? "team" : "cohort";
    const payMethod = take(/payment|method/i);
    const val = track === "oneOnOne" ? 199 : track === "team" ? 750 : Number(STATE.settings?.defaultCohortPrice || 79);

    const customFields = {};
    entries.forEach(([k, v]) => {
      if (!usedKeys.has(k) && v && k.toLowerCase() !== "timestamp") {
        customFields[k] = v;
      }
    });

    STATE.contacts.unshift({
      id: `imp-${Date.now()}-${idx}`,
      isDemo: false,
      name,
      email,
      phone,
      timezone: "",
      linkedin: "",
      company,
      role: "",
      isDecisionMaker: true,
      skillLevel,
      aiTools: "",
      os: "",
      source: "inbound-form",
      stage: "warm",
      track,
      dealValue: val,
      amountPaid: 0,
      currency: "GBP",
      paymentStatus: "pending",
      paymentMethod: payMethod,
      lossReason: "",
      goal,
      painPoints: "",
      coachingNotes: "",
      projectRepoUrl: "",
      liveDeployUrl: "",
      customFields,
      viewedDeck: true,
      replied: false,
      nextFollowUp: L.todayISO(),
      lastContactAt: L.todayISO(),
      createdAt: L.todayISO(),
      cohortBatch: "Cohort #1",
      tags: ["csv-import"],
      checklist: { preflightSent: false, attendedLive: false, projectShipped: false, reviewCaptured: false, bonusGranted: false, upsellPitched: false, b2bSeeded: false },
      activities: [{ at: L.todayISO(), type: "import", note: "Imported via CSV / Google Form (extra columns preserved)." }]
    });
    added++;
  });
  closeImportModal();
  await persist(`Imported ${added} profiles`);
  showToast(`Imported ${added} new profiles`);
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
  const headers = ["Name", "Email", "Phone", "Timezone", "Company", "Stage", "Track", "SkillLevel", "DealValue", "AmountPaid", "PaymentStatus", "PaymentMethod", "NextFollowUp", "Goal", "CoachingNotes", "LiveDeployUrl"];
  const lines = [headers.join(",")];
  STATE.contacts.forEach(c => {
    lines.push([c.name, c.email, c.phone, c.timezone, c.company, c.stage, c.track, c.skillLevel, c.dealValue, L.collectedOf(c), c.paymentStatus, c.paymentMethod, c.nextFollowUp, c.goal, c.coachingNotes, c.liveDeployUrl]
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
  renderAnalytics();
  renderTemplates();
}

document.getElementById("nav-tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab-btn");
  if (!btn) return;
  CURRENT_VIEW = btn.dataset.view;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b === btn));
  ["today", "pipeline", "contacts", "students", "analytics", "templates"].forEach(v => {
    document.getElementById(`view-${v}`).style.display = v === CURRENT_VIEW ? "block" : "none";
  });
});

(async () => {
  STATE = await window.CRM_DB.load();
  renderAll();
})();
