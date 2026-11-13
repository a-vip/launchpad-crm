// Proven Outreach, Payment Request, Pre-Flight & Alumni Retention Templates
// Supports {{name}}, {{fullName}}, {{company}}, {{goal}}, {{track}}, {{amount}}, {{payLink}}, {{bookingUrl}}

window.CRM_TEMPLATES = [
  {
    id: "warm-free-help",
    category: "Warm Lead",
    title: "Turn Free-Help Requests Into Paid Bookings",
    body: `Hey {{name}} — happy to walk you through setting that up properly! I stopped doing ad-hoc free walkthroughs because I'm running a focused 2-hour live Agentic Launchpad sprint where we configure Antigravity + Gemini/Claude + GitHub + Vercel/Cloudflare and ship a working multi-file build live.

Founding cohort seats are £79 / $99 (and include my upcoming Prompt Engineering Masterclass free forever), or we can do a private 1-on-1 sprint tailored to {{goal}} for £199 / $249. Want to lock your spot?`
  },
  {
    id: "send-pay-link",
    category: "Closing & Payment",
    title: "Direct Checkout Link ({{amount}} via PayPal / Revolut / Monzo)",
    body: `Hey {{name}} — here is the quick payment link to lock your spot in {{track}} ({{amount}}):
{{payLink}}

Please pop your email in the payment note so I can send your calendar invite and Pre-Flight Checklist immediately. Looking forward to building {{goal}} with you!`
  },
  {
    id: "cold-builder",
    category: "Cold Outreach",
    title: "Cold Outreach — Founder / Consultant / Operator",
    body: `Hi {{name}}, saw your work at {{company}} — quick question: are you still copy-pasting out of browser chatbots, or have you moved your workflow onto agentic multi-file builders yet?

I'm running a small 2-hour live sprint teaching founders and operators how to command Antigravity + CLI + GitHub + Vercel/Cloudflare to build and deploy real tools fast (no fluff, live build included). Happy to send the 1-page overview or pitch deck if useful.`
  },
  {
    id: "day2-followup",
    category: "Follow-Up Cadence",
    title: "Day 2 Value Check-In (After Offer / Deck Sent)",
    body: `Hey {{name}} — checking in briefly after sending over the Agentic Launchpad details. Since you mentioned wanting to build {{goal}}, this 2-hour sprint is scoped specifically so you leave with a live deployed URL rather than theory. Any questions before spots close?`
  },
  {
    id: "day5-followup",
    category: "Follow-Up Cadence",
    title: "Day 5 Direct Lock-In / Alternative Track",
    body: `Hi {{name}}, quick nudge — we have a couple Founding Cohort spots left (£79 / $99, includes the Prompt Engineering Masterclass free). If the group slot doesn't fit your schedule, we can also knock out {{goal}} privately in a 1-on-1 build sprint. Let me know which suits better!`
  },
  {
    id: "day9-breakup",
    category: "Follow-Up Cadence",
    title: "Day 9 Clean Break-Up (Resurrects Ghosted Leads)",
    body: `Hey {{name}}, assuming timing isn't right for Agentic Launchpad this month—totally fine, I'll close your spot note for now so I don't clutter your inbox. If {{goal}} becomes a priority later, reply anytime and I'll send the next sprint dates.`
  },
  {
    id: "preflight-student",
    category: "Active Student",
    title: "24h Pre-Flight Checklist (Before Live Class)",
    body: `Hey {{name}} — excited to build with you! To make sure we start shipping inside the first 10 minutes, please complete these 4 free steps before we jump on:
1. GitHub account (github.com) + Git installed
2. Free Vercel (vercel.com) or Cloudflare account linked to GitHub
3. Antigravity installed + Gemini or Claude access ready
4. Clone our starter repo (link in calendar invite)

Reply if you hit any snag beforehand!`
  },
  {
    id: "alumni-upsell",
    category: "Alumni & Retention",
    title: "48h Post-Sprint Review + 1-on-1 Upsell + B2B Seed",
    body: `Hey {{name}} — awesome watching you ship during the sprint! Two quick things while it's fresh:
1. Could you reply with 2–3 honest sentences on what you built and how the session felt? (I'll make sure your free Prompt Engineering Masterclass bonus access is flagged!)
2. If you want private 1-on-1 help taking {{goal}} further—or if your team/company ever wants a private 2-hour sprint—alumni get the private 1-on-1 sprint for £129 (48h window). Just reply "1on1" or "TEAM"!`
  },
  {
    id: "alumni-90day",
    category: "Alumni & Retention",
    title: "90-Day Alumni Check-In & Referral Prompt",
    body: `Hey {{name}}, hope you're well! Checking in to see how {{goal}} and your agentic workflows are running. I just added new multi-agent templates for alumni—want me to send them over? Also, if anyone in your network is stuck copy-pasting from chatbots, feel free to send them my way!`
  }
];
