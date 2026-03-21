# System Architecture

## Workflow

1. User inputs website URL
2. Frontend sends request to backend
3. Backend fetches webpage data using web scraping
4. AI module analyzes:

   * Keywords
   * Meta tags
   * Content structure
5. System calculates SEO score
6. AI generates optimization suggestions
7. Results are sent back to frontend
8. Dashboard displays analysis and recommendations

## Components

* Frontend (React)
* Backend (Node.js, Express)
* AI Module (GenAI / NLP)
* Web Scraper (Cheerio / Puppeteer)
* Database (MongoDB)
