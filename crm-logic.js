// Core CRM Best Practices Engine:
// - 6-Stage Linear Pipeline
// - Dynamic Fit + Behavioral Lead Scoring (0-100)
// - Deal Rot Detection (>7 days stale in active sales stages)
// - Follow-Up Cadence Suggestions & CSV Import Parser

window.CRM_STAGES = [
  { id: "cold", label: "1. Cold / Identified", group: "pipeline" },
  { id: "warm", label: "2. Warm Lead / Inbound", group: "pipeline" },
  { id: "offer", label: "3. Offer / Pay Link Sent", group: "pipeline" },
  { id: "student", label: "4. Active Student (Paid)", group: "delivery" },
  { id: "alumni", label: "5. Graduated / Alumni", group: "retention" },
  { id: "nurture", label: "6. Closed Lost / Nurture", group: "closed" }
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

  // Dynamic Lead Scoring (Best practice: static fit + dynamic engagement)
  computeScore(c) {
    let score = 0;
    // Static Fit (Max 45)
    if (c.isDecisionMaker) score += 20;
    if (c.track === "team") score += 25;
    else if (c.track === "oneOnOne") score += 20;
    else if (c.track === "cohort") score += 15;

    // Temperature & Source Intent (Max 25)
    if (c.source === "free-help-request" || c.source === "inbound-form" || c.source === "scorecard") score += 20;
    else if (c.source === "referral") score += 25;
    else if (c.source === "warm-network") score += 15;
    else if (c.source === "cold-outbound") score += 5;

    // Dynamic Engagement (Max 35)
    if (c.viewedDeck) score += 10;
    if (c.replied) score += 15;
    if (c.stage === "offer") score += 15;
    if (c.paymentStatus === "paid" || c.stage === "student" || c.stage === "alumni") score = 100;

    return Math.min(100, Math.max(0, score));
  },

  temperatureOf(c) {
    if (c.stage === "student" || c.stage === "alumni") return "paid";
    const s = this.computeScore(c);
    if (s >= 65) return "hot";
    if (s >= 35 || c.stage === "warm" || c.stage === "offer") return "warm";
    return "cold";
  },

  // Deal Rot Alert: active sales stages sitting >7 days without a touchpoint
  isRotting(c) {
    if (!["warm", "offer"].includes(c.stage)) return false;
    return this.daysBetween(c.lastContactAt || c.createdAt) >= 7;
  },

  isDueTodayOrOverdue(c) {
    if (!c.nextFollowUp) return false;
    return c.nextFollowUp <= this.todayISO();
  },

  interpolate(body, c) {
    return (body || "")
      .replace(/\{\{name\}\}/g, (c.name || "there").split(" ")[0])
      .replace(/\{\{company\}\}/g, c.company || "your project")
      .replace(/\{\{goal\}\}/g, c.goal || "your AI workflow")
      .replace(/\{\{track\}\}/g, c.track || "Founding Cohort");
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
    const headers = rows[0].map(h => h.toLowerCase());
    return rows.slice(1).map(cols => {
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = cols[idx] || ""; });
      return obj;
    });
  }
};
