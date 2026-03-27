# System Architecture

## Full Flow: URL → Analysis → Fix → Live Update

---

## 1. Web Scraping (Firecrawl API)

- User enters website URL
- Supabase Edge Function (`seo-analyze`) calls Firecrawl API
- Firecrawl fetches:
  - Full HTML
  - Markdown content
  - Metadata
- Handles JavaScript rendering and anti-bot mechanisms
- Returns clean structured content

---

## 2. SEO & AEO Analysis (Lovable AI → Google Gemini)

- Scraped content is sent to Lovable AI Gateway
- Uses Google Gemini (gemini-2.5-flash)

### AI generates:

- SEO Score (0–100)
- AEO Score (0–100)
- Ranking Prediction
- Issues (critical / warning / info)
- Suggestions (actionable improvements)

### Fallback System:
- Rule-based scorer used if AI fails
- Checks:
  - Title length
  - Meta description
  - H1 tags

---

## 3. Fix Generation (Gemini AI)

- `generate-fixes` edge function sends analysis to Gemini
- AI returns:
  - before_code
  - after_code
- Example fixes:
  - Add meta description
  - Fix heading tags
  - Add alt text

---

## 4. Autonomous Fix Modes

### Simulation Mode
- Predicts updated SEO score
- No real changes applied

### Live Mode
- Applies actual changes to website code
- Uses GitHub integration

---

## 5. GitHub Integration (Live Update)

- Uses GitHub REST API
- Steps:
  1. Fetch file from repository
  2. Apply AI-generated fixes
  3. Commit and push updated code

- Authentication via Personal Access Token (PAT)

---

## 6. Live Re-Analysis

- After update, system re-analyzes website
- Updates scores in real-time dashboard

---

## Components

- Frontend: React + TypeScript + Tailwind CSS
- Backend: Supabase Edge Functions
- AI: Lovable AI Gateway + Google Gemini
- Web Scraping: Firecrawl API
- Database: Supabase (PostgreSQL)
- Integration: GitHub REST API