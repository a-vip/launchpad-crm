// Core CRM Best Practices & Analytics Engine:
// - 6-Stage Linear Pipeline
// - Dynamic Fit + Behavioral Lead Scoring (0-100)
// - Deal Rot Detection (>7 days stale in active sales stages)
// - Funnel Metrics, Revenue Tracking (Collected vs Balance Due), & Google Form CSV Mapping

window.CRM_STAGES = [
  { id: "cold", label: "1. Cold / Identified", group: "pipeline" },
  { id: "warm", label: "2. Warm Lead / Inbound", group: "pipeline" },
  { id: "offer", label: "3. Offer / Pay Link Sent", group: "pipeline" },
  { id: "student", label: "4. Active Student (Paid)", group: "delivery" },
  { id: "alumni", label: "5. Graduated / Alumni", group: "retention" },
  { id: "nurture", label: "6. Closed Lost / Nurture", group: "closed" }
];

window.LOSS_REASONS = [
  "",
  "Too Expensive / Budget",
  "Bad Timing / Busy",
  "No Response / Ghosted",
  "DIY / Not Ready for Agents",
  "Not a Fit"
];

window.CRM_LOGIC = {
  daysBetween(dateStr, now = new Date()) {
    if (!dateStr) return 999;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return 999;
    return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  },

  todayISO() {
    return new Date().toISOString().slice(0, 10);
  },

  addDaysISO(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  },

  computeScore(c) {
    if (c.paymentStatus === "paid" || c.stage === "student" || c.stage === "alumni") return 100;
    let score = 0;

    // Static Fit (Max 45)
    if (c.isDecisionMaker) score += 20;
    if (c.track === "team") score += 25;
    else if (c.track === "oneOnOne") score += 20;
    else if (c.track === "cohort") score += 15;

    // Intent & Source (Max 25)
    if (c.source === "referral") score += 25;
    else if (c.source === "free-help-request" || c.source === "inbound-form" || c.source === "scorecard") score += 20;
    else if (c.source === "warm-network") score += 15;
    else if (c.source === "cold-outbound") score += 5;

    // Behavioral Signals (Max 35)
    if (c.viewedDeck) score += 10;
    if (c.replied) score += 15;
    if (c.stage === "offer") score += 15;
    if (c.paymentStatus === "deposit") score += 20;

    return Math.min(100, Math.max(0, score));
  },

  temperatureOf(c) {
    if (c.stage === "student" || c.stage === "alumni" || c.paymentStatus === "paid") return "paid";
    const s = this.computeScore(c);
    if (s >= 65) return "hot";
    if (s >= 35 || c.stage === "warm" || c.stage === "offer") return "warm";
    return "cold";
  },

  isRotting(c) {
    if (!["warm", "offer"].includes(c.stage)) return false;
    return this.daysBetween(c.lastContactAt || c.createdAt) >= 7;
  },

  isDueTodayOrOverdue(c) {
    if (!c.nextFollowUp || c.stage === "nurture") return false;
    return c.nextFollowUp <= this.todayISO();
  },

  collectedOf(c) {
    if (typeof c.amountPaid === "number" && !Number.isNaN(c.amountPaid)) return c.amountPaid;
    return c.paymentStatus === "paid" ? Number(c.dealValue || 0) : 0;
  },

  balanceDueOf(c) {
    return Math.max(0, Number(c.dealValue || 0) - this.collectedOf(c));
  },

  buildPaymentLink(c, settings = {}) {
    const method = (c.paymentMethod || "").toLowerCase();
    const due = this.balanceDueOf(c) || Number(c.dealValue || 79);
    const cleanHandle = (val, base) => {
      const s = (val || "").trim();
      if (!s) return "";
      if (/^https?:\/\//i.test(s)) return s.replace(/\/+$/, "");
      return `${base}/${s.replace(/^@/, "")}`;
    };
    if (method === "invoice") {
      return "Send B2B Invoice (Wise / Revolut Business / Bank Transfer)";
    }
    if (method === "paypal" && settings.paypalMe) {
      return `${cleanHandle(settings.paypalMe, "https://paypal.me")}/${due}${c.currency || "GBP"}`;
    }
    if (method === "revolut" && settings.revolutMe) {
      return cleanHandle(settings.revolutMe, "https://revolut.me");
    }
    if (method === "monzo" && settings.monzoMe) {
      return `${cleanHandle(settings.monzoMe, "https://monzo.me")}/${due}`;
    }
    // Fallback to whichever is configured first
    if (settings.paypalMe) return `${cleanHandle(settings.paypalMe, "https://paypal.me")}/${due}${c.currency || "GBP"}`;
    if (settings.revolutMe) return cleanHandle(settings.revolutMe, "https://revolut.me");
    if (settings.monzoMe) return `${cleanHandle(settings.monzoMe, "https://monzo.me")}/${due}`;
    return "[Add PayPal/Revolut/Monzo handle in Settings]";
  },

  interpolate(body, c, settings = {}) {
    const payLink = this.buildPaymentLink(c, settings);
    const due = this.balanceDueOf(c) || Number(c.dealValue || 79);
    const sym = c.currency === "USD" ? "$" : c.currency === "EUR" ? "€" : "£";
    const trackMap = {
      cohort: "Founding 2-Hour Live Cohort",
      oneOnOne: "Private 1-on-1 Live Build Sprint",
      team: "Team / Company Workshop"
    };
    return (body || "")
      .replace(/\{\{name\}\}/g, (c.name || "there").split(" ")[0])
      .replace(/\{\{fullName\}\}/g, c.name || "there")
      .replace(/\{\{company\}\}/g, c.company || "your project")
      .replace(/\{\{goal\}\}/g, c.goal || "your AI workflow")
      .replace(/\{\{track\}\}/g, trackMap[c.track] || c.track || "Founding Cohort")
      .replace(/\{\{amount\}\}/g, `${sym}${due}`)
      .replace(/\{\{payLink\}\}/g, payLink)
      .replace(/\{\{bookingUrl\}\}/g, settings.bookingUrl || "[Insert booking link]");
  },

  computeAnalytics(contacts, settings = {}) {
    const cohorts = {};
    const sources = {};
    let totalCollected = 0;
    let totalOutstanding = 0;
    let openPipeline = 0;
    let upsellReadyCount = 0;

    contacts.forEach(c => {
      const col = this.collectedOf(c);
      const bal = this.balanceDueOf(c);
      totalCollected += col;
      if (["student", "alumni", "offer"].includes(c.stage)) totalOutstanding += bal;
      if (["cold", "warm", "offer"].includes(c.stage)) openPipeline += Number(c.dealValue || 0);
      if (c.stage === "alumni" && !c.checklist?.upsellPitched) upsellReadyCount++;

      const batch = c.cohortBatch || "Unassigned";
      if (!cohorts[batch]) cohorts[batch] = { name: batch, seats: 0, paid: 0, collected: 0, pending: 0 };
      cohorts[batch].seats++;
      if (c.paymentStatus === "paid" || c.stage === "student" || c.stage === "alumni") cohorts[batch].paid++;
      cohorts[batch].collected += col;
      cohorts[batch].pending += bal;

      const src = c.source || "unknown";
      if (!sources[src]) sources[src] = { name: src, leads: 0, paid: 0, revenue: 0 };
      sources[src].leads++;
      if (c.paymentStatus === "paid" || c.stage === "student" || c.stage === "alumni") sources[src].paid++;
      sources[src].revenue += col;
    });

    const total = contacts.length || 1;
    const paidTotal = contacts.filter(c => c.stage === "student" || c.stage === "alumni" || c.paymentStatus === "paid").length;
    const conversionPct = Math.round((paidTotal / total) * 100);
    const cohort1Count = (cohorts["Cohort #1"]?.paid || 0);
    const cap = Number(settings.defaultCohortCap || 10);

    return {
      totalCollected,
      totalOutstanding,
      openPipeline,
      upsellReadyCount,
      paidTotal,
      conversionPct,
      cohort1FillPct: Math.min(100, Math.round((cohort1Count / cap) * 100)),
      cohort1Count,
      cap,
      cohorts: Object.values(cohorts),
      sources: Object.values(sources).sort((a, b) => b.revenue - a.revenue)
    };
  },

  parseCSV(text) {
    const rows = [];
    let row = [];
    let val = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];
      if (ch === '"' && inQuotes && next === '"') { val += '"'; i++; }
      else if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === "," && !inQuotes) { row.push(val.trim()); val = ""; }
      else if ((ch === "\n" || ch === "\r") && !inQuotes) {
        if (ch === "\r" && next === "\n") i++;
        row.push(val.trim());
        if (row.some(Boolean)) rows.push(row);
        row = []; val = "";
      } else { val += ch; }
    }
    if (val || row.length) {
      row.push(val.trim());
      if (row.some(Boolean)) rows.push(row);
    }
    if (rows.length < 2) return [];
    const rawHeaders = rows[0];
    const headers = rawHeaders.map(h => h.trim());
    return rows.slice(1).map(cols => {
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = cols[idx] || ""; });
      return obj;
    });
  }
};
