# Launchpad CRM

Lightweight, persistent CRM built for tracking **cold & warm leads, cohort/1-on-1 enrollments, active students, and graduated alumni**.

## Features
- **Today's Action Queue:** Due/overdue follow-ups, Hot Leads (score ≥65), and Deal Rot alerts (>7 days stale).
- **Drag-and-Drop Kanban Pipeline:** 6 focused stages from Cold Prospect → Warm → Offer Sent → Active Student → Graduated Alumni → Nurture.
- **Dynamic Lead Scoring:** Scores leads 0–100 based on fit + behavioral engagement.
- **1-Click Personalized Templates:** Cold outreach, "turn free-help requests into paid bookings," Day 2/5/9 follow-ups, 24h pre-flight checklist, and alumni upsell/referral scripts.
- **Google Form / CSV Importer + JSON/CSV Backups.**
- **Zero-Cost Cross-Device Persistence:** Auto-saves to browser IndexedDB immediately, plus optional **Private GitHub Gist Sync** to share the same database between your laptop and phone.

## Important Hosting Note (Private Repo + Pages)
- **GitHub Pages note:** On a free GitHub account, GitHub Pages requires a **public** repository (private repo GitHub Pages requires GitHub Pro/Team). A workflow is included at `.github/workflows/pages.yml` if you upgrade or make it public.
- **Free Private Hosting Alternative (Recommended):** Connect this **private** repo (`a-vip/launchpad-crm`) to **Cloudflare Pages** or **Vercel** (zero build command, root `/`)—both deploy private repos for free and give you a private URL accessible from both your laptop and phone!
- *(Keep your repo private if you prefer, and pair it with Private GitHub Gist Sync inside **Cloud Sync & Backup**.)*
