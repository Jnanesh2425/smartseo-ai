# AI On-Page SEO Optimizer
Optimize your website for search engines and AI — instantly.


A tool that analyzes and improves your website’s on-page SEO with actionable suggestions and optional one-click fixes.

On-page SEO refers to optimizing elements within your webpage — such as headings, meta tags, and content — to make it easier for search engines to understand and rank your page.

Understanding on-page SEO is important because it directly controls how your content is interpreted and displayed in search results. Well-structured headings, relevant meta tags, and clear content help search engines accurately understand your page without relying on external factors. This improves visibility, ensures your content matches user intent, and creates a strong foundation for ranking — even before considering off-page or technical SEO.

It is important because:

* It directly impacts how your page appears in search results
* It improves content clarity for both users and search engines
* It forms the foundation for any successful SEO strategy

This project focuses strictly on traditional on-page SEO, helping you identify issues and fix them quickly without going through complex audits.



## Overview

This project takes a live website URL, crawls the page, extracts key on-page SEO elements, and uses AI to generate improvements.

Along with suggestions, it also provides:

* An SEO score based on traditional on-page factors
* An AEO score (Answer Engine Optimization) to evaluate how well your content is structured for AI-generated answers



## Features

- Crawls live websites using Firecrawl to extract real content, headings, and metadata  
- Analyzes on-page SEO elements like H1 structure, meta tags, and content quality  
- Focuses only on traditional on-page SEO (no off-page or technical SEO)  
- Generates an SEO score based on on-page factors  
- Provides clear AI-based suggestions for headings, meta tags, and content  
- Keeps suggestions aligned with your existing content instead of rewriting everything
- Real-time preview of suggested changes before applying   
- Supports one-click fix to apply changes directly to your repository

### One-Click Fix Disclaimer 
- Limited to on-page elements (content, headings, meta tags)  
- Review changes before deploying  
- Compatible with static and content-driven pages

## Key Feature

One-click fix allows you to automatically apply (On-Page SEO) improvements directly to your codebase, reducing manual effort.


## Tech Stack

| Layer / Component | Technology Used        |
|-------------------|------------------------|
| Frontend UI       | React (Vite)           |
| Backend Services  | Supabase               |
| Crawling Engine   | Firecrawl              |
| AI Processing     | Gemini                 |

## How It Works

1. Enter a website URL  
2. The page is crawled using Firecrawl  
3. SEO elements are extracted (headings, meta tags, content)  
4. Gemini analyzes the data  
5. SEO and AEO scores are generated  
6. Suggestions are provided  
7. Optional one-click fix updates your repository


## Demo (Screenshots)
 Enter URL <br>
<img width="1280" height="627" alt="image" src="https://github.com/user-attachments/assets/d4496903-bd86-4715-8eab-9ad24690323a" />
<br>
 SEO Dashboard (Scores Overview)<br>
<img width="1280" height="625" alt="image" src="https://github.com/user-attachments/assets/fa82f2f4-0a0f-42f8-9b9c-22629f00b34f" />
<br>
 Suggestions + One-Click Fix<br>
<img width="1280" height="632" alt="image" src="https://github.com/user-attachments/assets/c8984a01-a778-41a4-97a4-9202946d1364" />
<br>



## Running Locally

Follow these steps to run the project on your local machine.

1. Clone the repository  
   Copy your repository link and clone it using Git, then open the project folder.

2. Install dependencies  
   Run `npm install` in your project directory.

3. Set up environment variables  
   Create a `.env` file in the root folder and add:

   VITE_FIRECRAWL_API_KEY=your_key  
   VITE_GEMINI_API_KEY=your_key  
   SUPABASE_URL=your_url  
   SUPABASE_ANON_KEY=your_key  
   GITHUB_TOKEN=your_token  

4. Start the development server  
   Run `npm run dev`

5. Open in browser  
   Go to: http://localhost:5173
   

## Future Enhancements

- Multi-page SEO analysis for full website optimization  
- More advanced SEO and AEO scoring with detailed insights 
- Built-in AI assistant for SEO guidance and quick fixes  
