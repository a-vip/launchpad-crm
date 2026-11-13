# Launchpad CRM

Client-side, zero-server CRM designed for **live AI cohorts, 1-on-1 builds, and B2B workshops**—with rich 360° student profiles, revenue tracking, and cross-device Private Gist sync.

> **Privacy Architecture:** This public repository ships only the client-side interface and 5 fictional demo contacts. All real leads, student notes, payment handles, and API tokens stay strictly inside your own browser (`IndexedDB`) and your **private** GitHub Gist—never committed to this repository.

## Key Capabilities
- **Today's Action Queue:** Due/overdue follow-ups, Hot Leads (≥65), Deal Rot alerts (>7 days stale), and graduated alumni ready for 1-on-1 upsells.
- **Pipeline (Kanban + Mobile Move):** Drag-and-drop on desktop plus instant dropdown move on mobile.
- **360° Student & Lead Profiles (3-Tab Drawer):**
  - *Overview & Money:* Stage, track, deal value vs. amount paid, payment rail (`PayPal` / `Revolut` / `Monzo` / `Invoice`), 1-click tailored payment link generator, 1-click **Mark Paid & Move to Student**, closed-lost reason tracking, and snooze buttons.
  - *Student Profile & Intake:* Email (`mailto:`), Phone/WhatsApp (`wa.me`), timezone, skill level (`Non-Coder` / `Light Tech` / `Developer`), OS, AI tools currently used, pain points, goals, plus **all extra Google Form CSV columns preserved automatically** under Custom Fields.
  - *Notes, Projects & Log:* Long-form Instructor Coaching Notes, Student GitHub Repo & Live Vercel/Cloudflare Deploy URLs, lifecycle checklists, and categorized timeline log.
- **Students & Alumni Roster:** Pre-class overview of every student's skill level, OS, and goal + 1-click **Copy Emails (BCC)** before live sprints.
- **Revenue & Cohort Analytics:** Seat-fill meter, collected vs. pending revenue by cohort/offer, and Lead Source ROI table showing which channels convert to cash.
- **Privacy Blur Toggle:** Blurs names, emails, and £ figures in 1 click for safe screen-sharing during live cohorts.

## Cross-Device Persistence ($0)
1. Click **Sync & Backup** → paste a fine-grained GitHub PAT with **Gists (Read & Write)** permission only.
2. Click **Push to Private Gist** once from your laptop; paste the same token + Gist ID on your phone and click **Pull** anytime.
