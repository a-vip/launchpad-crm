// 3-Layer Persistence Engine:
// 1) IndexedDB primary store (with localStorage fallback)
// 2) Settings + Full 360-degree Student/Lead Profiles (customFields preserved)
// 3) Optional Private GitHub Gist Cloud Sync (cross-device laptop <-> phone)

window.CRM_DB = (() => {
  const DB_NAME = "agentic_launchpad_crm_v1";
  const STORE_NAME = "state";
  const STATE_KEY = "crm_data";
  const LS_FALLBACK = "launchpad_crm_fallback_v1";
  const SYNC_CFG_KEY = "launchpad_crm_gist_sync_v1";

  function defaultSettings() {
    return {
      currencySymbol: "£",
      defaultCohortCap: 10,
      defaultCohortPrice: 79,
      defaultOneOnOnePrice: 199,
      paypalMe: "",
      revolutMe: "",
      monzoMe: "",
      bookingUrl: ""
    };
  }

  function seedContacts() {
    const today = window.CRM_LOGIC.todayISO();
    const dAgo = (n) => window.CRM_LOGIC.addDaysISO(-n);
    const dAhead = (n) => window.CRM_LOGIC.addDaysISO(n);

    return [
      {
        id: "demo-1",
        isDemo: true,
        name: "Marcus Bennett",
        email: "marcus@example.com",
        phone: "+44 7700 900123",
        linkedin: "https://linkedin.com/in/example",
        timezone: "GMT (London)",
        company: "Bennett Ops Consulting",
        role: "Founder",
        isDecisionMaker: true,
        skillLevel: "light-tech",
        aiTools: "ChatGPT Plus, Notion AI",
        os: "macOS",
        source: "free-help-request",
        stage: "warm",
        track: "cohort",
        dealValue: 79,
        amountPaid: 0,
        currency: "GBP",
        paymentStatus: "unpaid",
        paymentMethod: "PayPal",
        lossReason: "",
        goal: "Automate weekly client reporting & deploy an intake micro-site",
        painPoints: "Spends 4 hours every Sunday copying tables out of ChatGPT into client PDFs.",
        coachingNotes: "Very keen on non-coder workflow. Recommend Individual Build A or C during sprint.",
        projectRepoUrl: "",
        liveDeployUrl: "",
        customFields: { "How did you hear about Avi?": "Asked in WhatsApp group", "Preferred Slot": "UK Evening / Asia Morning" },
        viewedDeck: true,
        replied: true,
        nextFollowUp: today,
        lastContactAt: dAgo(1),
        createdAt: dAgo(2),
        cohortBatch: "Cohort #1",
        tags: ["warm-dm", "consultant"],
        checklist: { preflightSent: false, attendedLive: false, projectShipped: false, reviewCaptured: false, bonusGranted: false, upsellPitched: false, b2bSeeded: false },
        activities: [
          { at: dAgo(2), type: "inbound", note: "Asked in DMs how I wire Antigravity + Vercel so fast." },
          { at: dAgo(1), type: "outreach", note: "Sent Seller Deck + Founding Cohort invite (£79)." }
        ]
      },
      {
        id: "demo-2",
        isDemo: true,
        name: "Elena Rostova",
        email: "elena@rostovalabs.io",
        phone: "",
        linkedin: "https://linkedin.com/in/example-elena",
        timezone: "CET (Berlin)",
        company: "Rostova Legal Tech",
        role: "Managing Partner",
        isDecisionMaker: true,
        skillLevel: "non-coder",
        aiTools: "Claude Pro",
        os: "Windows",
        source: "warm-network",
        stage: "offer",
        track: "oneOnOne",
        dealValue: 199,
        amountPaid: 0,
        currency: "GBP",
        paymentStatus: "pending",
        paymentMethod: "Revolut",
        lossReason: "",
        goal: "Custom multi-agent contract research workflow on Cloudflare",
        painPoints: "Concerned about data hygiene & hallucinated clauses in client memos.",
        coachingNotes: "Strong fit for Meaningful Human Control + 4-Layer Context Spec pitch. Could convert to B2B firm training later.",
        projectRepoUrl: "",
        liveDeployUrl: "",
        customFields: { "Team Size": "8 lawyers" },
        viewedDeck: true,
        replied: true,
        nextFollowUp: dAgo(1),
        lastContactAt: dAgo(8),
        createdAt: dAgo(10),
        cohortBatch: "1-on-1",
        tags: ["legal", "rot-alert-example"],
        checklist: { preflightSent: false, attendedLive: false, projectShipped: false, reviewCaptured: false, bonusGranted: false, upsellPitched: false, b2bSeeded: false },
        activities: [
          { at: dAgo(10), type: "call", note: "Interested in 1-on-1 sprint; wants Revolut link." },
          { at: dAgo(8), type: "outreach", note: "Sent Revolut payment link (£199)." }
        ]
      },
      {
        id: "demo-3",
        isDemo: true,
        name: "Tariq Al-Mansoor",
        email: "tariq@northstarventures.co",
        phone: "",
        linkedin: "",
        timezone: "GST (Dubai)",
        company: "Northstar Ventures",
        role: "Operator",
        isDecisionMaker: true,
        skillLevel: "light-tech",
        aiTools: "Perplexity, ChatGPT",
        os: "macOS",
        source: "cold-outbound",
        stage: "cold",
        track: "team",
        dealValue: 750,
        amountPaid: 0,
        currency: "GBP",
        paymentStatus: "unpaid",
        paymentMethod: "Invoice",
        lossReason: "",
        goal: "Train 6 analysts to stop copy-pasting from ChatGPT",
        painPoints: "Analysts use 6 disjointed AI subscriptions with inconsistent quality.",
        coachingNotes: "Pitch Core-3 Stack + Team Sprint once Cohort #1 reviews are ready.",
        projectRepoUrl: "",
        liveDeployUrl: "",
        customFields: {},
        viewedDeck: false,
        replied: false,
        nextFollowUp: dAhead(1),
        lastContactAt: dAgo(3),
        createdAt: dAgo(3),
        cohortBatch: "B2B Pipeline",
        tags: ["cold", "b2b-prospect"],
        checklist: { preflightSent: false, attendedLive: false, projectShipped: false, reviewCaptured: false, bonusGranted: false, upsellPitched: false, b2bSeeded: false },
        activities: [
          { at: dAgo(3), type: "outreach", note: "Sent short cold LinkedIn message referencing tool sprawl." }
        ]
      },
      {
        id: "demo-4",
        isDemo: true,
        name: "Sophie Chen",
        email: "sophie@chenstudio.uk",
        phone: "+44 7700 900456",
        linkedin: "",
        timezone: "GMT (Manchester)",
        company: "Chen Product Studio",
        role: "Product Lead",
        isDecisionMaker: true,
        skillLevel: "non-coder",
        aiTools: "Figma, Claude, ChatGPT",
        os: "macOS",
        source: "inbound-form",
        stage: "student",
        track: "cohort",
        dealValue: 79,
        amountPaid: 79,
        currency: "GBP",
        paymentStatus: "paid",
        paymentMethod: "Monzo",
        lossReason: "",
        goal: "Build & deploy interactive ROI calculator on Vercel",
        painPoints: "Has zero GitHub experience; worried about breaking terminal commands.",
        coachingNotes: "Keep starter repo dead simple; walk her through GitHub Desktop + Vercel 1-click deploy during 'We Do' block.",
        projectRepoUrl: "https://github.com/example/roi-calc-starter",
        liveDeployUrl: "",
        customFields: { "Hardware": "MacBook Air M2", "Dietary/Notes": "Prefers async recap video" },
        viewedDeck: true,
        replied: true,
        nextFollowUp: dAhead(2),
        lastContactAt: today,
        createdAt: dAgo(4),
        cohortBatch: "Cohort #1",
        tags: ["paid", "non-coder"],
        checklist: { preflightSent: true, attendedLive: false, projectShipped: false, reviewCaptured: false, bonusGranted: true, upsellPitched: false, b2bSeeded: false },
        activities: [
          { at: dAgo(4), type: "payment", note: "Paid £79 via Monzo.me." },
          { at: today, type: "onboarding", note: "Sent Pre-Flight Checklist + Starter Repo link." }
        ]
      },
      {
        id: "demo-5",
        isDemo: true,
        name: "Daniel Okafor",
        email: "daniel@okaforresearch.org",
        phone: "+44 7700 900789",
        linkedin: "",
        timezone: "GMT (London)",
        company: "Okafor Policy Group",
        role: "Director",
        isDecisionMaker: true,
        skillLevel: "developer",
        aiTools: "VS Code, Antigravity, Gemini",
        os: "Linux",
        source: "scorecard",
        stage: "alumni",
        track: "cohort",
        dealValue: 208,
        amountPaid: 208,
        currency: "GBP",
        paymentStatus: "paid",
        paymentMethod: "PayPal",
        lossReason: "",
        goal: "RSS policy monitor + 1-on-1 upgrade",
        painPoints: "Wanted parallel research + coding agents without merge conflicts.",
        coachingNotes: "Shipped live RSS dashboard in 40 mins! Left great review. Ask for referral to other policy directors in 90 days.",
        projectRepoUrl: "https://github.com/example/policy-rss-monitor",
        liveDeployUrl: "https://policy-monitor-demo.pages.dev",
        customFields: { "Testimonial": "Went from copying snippets to deploying a live Cloudflare Pages tracker in 2 hours." },
        viewedDeck: true,
        replied: true,
        nextFollowUp: dAhead(14),
        lastContactAt: dAgo(2),
        createdAt: dAgo(18),
        cohortBatch: "Cohort #0 (Beta)",
        tags: ["alumni", "review-ready", "b2b-warm"],
        checklist: { preflightSent: true, attendedLive: true, projectShipped: true, reviewCaptured: true, bonusGranted: true, upsellPitched: true, b2bSeeded: true },
        activities: [
          { at: dAgo(15), type: "delivery", note: "Shipped live RSS tracker on Cloudflare Pages during 2h sprint." },
          { at: dAgo(12), type: "upsell", note: "Booked £129 alumni 1-on-1 upgrade; left 5-star review." }
        ]
      }
    ];
  }

  function openIDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error("IndexedDB unavailable"));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function normalizeState(raw) {
    const s = raw && typeof raw === "object" ? raw : {};
    return {
      contacts: Array.isArray(s.contacts) ? s.contacts : seedContacts(),
      settings: { ...defaultSettings(), ...(s.settings || {}) },
      updatedAt: s.updatedAt || new Date().toISOString()
    };
  }

  async function load() {
    try {
      const db = await openIDB();
      const data = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const getReq = tx.objectStore(STORE_NAME).get(STATE_KEY);
        getReq.onsuccess = () => resolve(getReq.result);
        getReq.onerror = () => reject(getReq.error);
      });
      if (data && Array.isArray(data.contacts)) return normalizeState(data);
    } catch (_) {}

    try {
      const raw = localStorage.getItem(LS_FALLBACK);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.contacts)) return normalizeState(parsed);
      }
    } catch (_) {}

    const initial = normalizeState({ contacts: seedContacts() });
    await save(initial);
    return initial;
  }

  async function save(state) {
    state.settings = { ...defaultSettings(), ...(state.settings || {}) };
    state.updatedAt = new Date().toISOString();
    try { localStorage.setItem(LS_FALLBACK, JSON.stringify(state)); } catch (_) {}
    try {
      const db = await openIDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(state, STATE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (_) {}
    return state;
  }

  function getSyncConfig() {
    try { return JSON.parse(localStorage.getItem(SYNC_CFG_KEY) || "{}") || {}; }
    catch (_) { return {}; }
  }

  function setSyncConfig(cfg) {
    localStorage.setItem(SYNC_CFG_KEY, JSON.stringify(cfg));
  }

  async function pushToGist(state, token, gistId) {
    const body = {
      description: "Agentic Launchpad CRM Database (Private Sync)",
      public: false,
      files: {
        "launchpad-crm-db.json": { content: JSON.stringify(state, null, 2) }
      }
    };
    const url = gistId ? `https://api.github.com/gists/${gistId}` : "https://api.github.com/gists";
    const method = gistId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(`GitHub Gist sync failed (${res.status}): ${errTxt.slice(0, 140)}`);
    }
    const json = await res.json();
    return json.id;
  }

  async function pullFromGist(token, gistId) {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: { "Authorization": `Bearer ${token}`, "Accept": "application/vnd.github+json" }
    });
    if (!res.ok) throw new Error(`GitHub Gist pull failed (${res.status})`);
    const json = await res.json();
    const file = json.files && json.files["launchpad-crm-db.json"];
    if (!file || !file.content) throw new Error("Gist does not contain launchpad-crm-db.json");
    const parsed = JSON.parse(file.content);
    if (!Array.isArray(parsed.contacts)) throw new Error("Invalid CRM JSON in Gist");
    return normalizeState(parsed);
  }

  return { load, save, defaultSettings, seedContacts, getSyncConfig, setSyncConfig, pushToGist, pullFromGist };
})();
