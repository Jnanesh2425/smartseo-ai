import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "AI gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Scrape the page with Firecrawl
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Scraping URL:", formattedUrl);

    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown", "html", "links"],
        onlyMainContent: false,
      }),
    });

    const scrapeData = await scrapeResponse.json();
    if (!scrapeResponse.ok) {
      console.error("Firecrawl error:", scrapeData);
      return new Response(
        JSON.stringify({ success: false, error: scrapeData.error || "Scraping failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = scrapeData.data?.html || scrapeData.html || "";
    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    const links = scrapeData.data?.links || scrapeData.links || [];
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};

    // Step 2: Extract basic SEO data from HTML
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : metadata.title || "";

    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i);
    const description = descMatch ? descMatch[1].trim() : metadata.description || "";

    const h1s = [...html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim());
    const h2s = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim()).slice(0, 10);
    const h3s = [...html.matchAll(/<h3[^>]*>(.*?)<\/h3>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim()).slice(0, 10);

    const allImages = [...html.matchAll(/<img[^>]*>/gi)];
    const imagesWithoutAlt = allImages.filter(img => !img[0].match(/alt=["'][^"']+["']/i)).length;

    const internalLinks = links.filter((l: string) => {
      try { return new URL(l).hostname === new URL(formattedUrl).hostname; } catch { return false; }
    }).length;
    const externalLinks = links.length - internalLinks;

    const words = markdown.split(/\s+/).filter((w: string) => w.length > 0);
    const wordCount = words.length;

    // Extract keywords (simple frequency analysis)
    const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "to", "of", "in", "for", "on", "with", "at", "by", "from", "and", "or", "but", "not", "this", "that", "it", "its", "as", "if", "so", "no", "can", "has", "have", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "shall", "our", "your", "we", "they", "he", "she", "you", "i", "my", "me"]);
    const wordFreq: Record<string, number> = {};
    words.forEach((w: string) => {
      const clean = w.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (clean.length > 3 && !stopWords.has(clean)) {
        wordFreq[clean] = (wordFreq[clean] || 0) + 1;
      }
    });
    const keywords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([w]) => w);

    // Step 3: Calculate SEO issues
    const issues: Array<{ severity: string; title: string; description: string; category: string }> = [];

    if (!title) issues.push({ severity: "critical", title: "Missing page title", description: "The page has no <title> tag. This is crucial for SEO.", category: "Meta" });
    else if (title.length > 60) issues.push({ severity: "warning", title: "Title too long", description: `Title is ${title.length} characters. Keep it under 60 for optimal display.`, category: "Meta" });
    else if (title.length < 30) issues.push({ severity: "info", title: "Title could be longer", description: `Title is only ${title.length} characters. Aim for 50-60 for better CTR.`, category: "Meta" });
    else issues.push({ severity: "success", title: "Good title length", description: `Title is ${title.length} characters — optimal range.`, category: "Meta" });

    if (!description) issues.push({ severity: "critical", title: "Missing meta description", description: "No meta description found. Add one for better CTR in search results.", category: "Meta" });
    else if (description.length > 160) issues.push({ severity: "warning", title: "Meta description too long", description: `Description is ${description.length} characters. Keep under 160.`, category: "Meta" });
    else issues.push({ severity: "success", title: "Good meta description", description: `Description is ${description.length} characters.`, category: "Meta" });

    if (h1s.length === 0) issues.push({ severity: "critical", title: "Missing H1 tag", description: "No H1 heading found. Every page should have exactly one H1.", category: "Headings" });
    else if (h1s.length > 1) issues.push({ severity: "warning", title: "Multiple H1 tags", description: `Found ${h1s.length} H1 tags. Use only one per page.`, category: "Headings" });
    else issues.push({ severity: "success", title: "Single H1 tag", description: "Page has exactly one H1 — good practice.", category: "Headings" });

    if (imagesWithoutAlt > 0) issues.push({ severity: "warning", title: "Images missing alt text", description: `${imagesWithoutAlt} of ${allImages.length} images lack alt attributes.`, category: "Images" });
    else if (allImages.length > 0) issues.push({ severity: "success", title: "All images have alt text", description: "Every image has an alt attribute.", category: "Images" });

    if (wordCount < 300) issues.push({ severity: "warning", title: "Thin content", description: `Only ${wordCount} words. Aim for 1000+ for better rankings.`, category: "Content" });
    else if (wordCount >= 1000) issues.push({ severity: "success", title: "Good content length", description: `${wordCount} words — sufficient content depth.`, category: "Content" });

    if (internalLinks < 3) issues.push({ severity: "warning", title: "Few internal links", description: `Only ${internalLinks} internal links. Add more for better crawlability.`, category: "Links" });

    // Step 4: Use AI for deeper analysis (AEO + suggestions)
    const aiPrompt = `Analyze this webpage content for SEO and AEO (Answer Engine Optimization). Return a JSON object with these exact fields:

{
  "seo_score": <number 0-100 based on overall SEO quality>,
  "aeo_score": <number 0-100 based on how well content answers questions>,
  "ranking_prediction": <number 0-100 ranking probability>,
  "aeo": {
    "has_faq": <boolean>,
    "conversational_tone": <number 0-100>,
    "direct_answers": <number 0-100>,
    "featured_snippet_potential": <number 0-100>,
    "extracted_questions": [<up to 5 questions the content answers or should answer>]
  },
  "suggestions": [
    {
      "title": "<short title>",
      "description": "<actionable suggestion>",
      "impact": "high"|"medium"|"low",
      "category": "<SEO|AEO|Content|Technical>"
    }
  ]
}

Page title: ${title}
Meta description: ${description}
H1: ${h1s.join(", ")}
Word count: ${wordCount}
Keywords: ${keywords.slice(0, 10).join(", ")}
Issues found: ${issues.length}
Internal links: ${internalLinks}
Images without alt: ${imagesWithoutAlt}/${allImages.length}

Content excerpt (first 2000 chars):
${markdown.slice(0, 2000)}`;

    console.log("Calling AI for analysis...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are an expert SEO and AEO analyst. Return only valid JSON, no markdown formatting, no code blocks. Be specific and actionable in suggestions.",
          },
          { role: "user", content: aiPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "seo_analysis",
              description: "Return SEO and AEO analysis results",
              parameters: {
                type: "object",
                properties: {
                  seo_score: { type: "number" },
                  aeo_score: { type: "number" },
                  ranking_prediction: { type: "number" },
                  aeo: {
                    type: "object",
                    properties: {
                      has_faq: { type: "boolean" },
                      conversational_tone: { type: "number" },
                      direct_answers: { type: "number" },
                      featured_snippet_potential: { type: "number" },
                      extracted_questions: { type: "array", items: { type: "string" } },
                    },
                    required: ["has_faq", "conversational_tone", "direct_answers", "featured_snippet_potential", "extracted_questions"],
                  },
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        impact: { type: "string", enum: ["high", "medium", "low"] },
                        category: { type: "string" },
                      },
                      required: ["title", "description", "impact", "category"],
                    },
                  },
                },
                required: ["seo_score", "aeo_score", "ranking_prediction", "aeo", "suggestions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "seo_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Rate limited. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ success: false, error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI error:", status, await aiResponse.text());
      // Fallback to basic scoring
      const basicScore = Math.min(100, Math.max(0, 50 + (title ? 10 : 0) + (description ? 10 : 0) + (h1s.length === 1 ? 10 : 0) + (wordCount > 500 ? 10 : 0) + (imagesWithoutAlt === 0 ? 10 : 0)));
      return new Response(JSON.stringify({
        success: true,
        result: {
          url: formattedUrl,
          seo_score: basicScore,
          aeo_score: Math.round(basicScore * 0.7),
          ranking_prediction: Math.round(basicScore * 0.8),
          meta: { title, description, h1: h1s, h2: h2s, h3: h3s, keywords, images_without_alt: imagesWithoutAlt, total_images: allImages.length, internal_links: internalLinks, external_links: externalLinks, word_count: wordCount },
          issues,
          suggestions: [{ title: "AI analysis unavailable", description: "Basic scoring was used. Try again later for AI insights.", impact: "low", category: "System" }],
          aeo: { has_faq: false, conversational_tone: 50, direct_answers: 50, featured_snippet_potential: 30, extracted_questions: [] },
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    let aiResult;
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        aiResult = JSON.parse(toolCall.function.arguments);
      } else {
        const content = aiData.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        aiResult = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      aiResult = null;
    }

    const result = {
      url: formattedUrl,
      seo_score: aiResult?.seo_score ?? 50,
      aeo_score: aiResult?.aeo_score ?? 40,
      ranking_prediction: aiResult?.ranking_prediction ?? 45,
      meta: {
        title,
        description,
        h1: h1s,
        h2: h2s,
        h3: h3s,
        keywords,
        images_without_alt: imagesWithoutAlt,
        total_images: allImages.length,
        internal_links: internalLinks,
        external_links: externalLinks,
        word_count: wordCount,
      },
      issues,
      suggestions: aiResult?.suggestions ?? [],
      aeo: aiResult?.aeo ?? {
        has_faq: false,
        conversational_tone: 50,
        direct_answers: 50,
        featured_snippet_potential: 30,
        extracted_questions: [],
      },
    };

    console.log("Analysis complete for:", formattedUrl);

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
