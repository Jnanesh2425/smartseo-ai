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
    const { originalAnalysis, appliedFixes } = await req.json();
    if (!originalAnalysis || !appliedFixes?.length) {
      return new Response(
        JSON.stringify({ success: false, error: "Original analysis and applied fixes are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "AI gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { meta, issues, seo_score, aeo_score, ranking_prediction, aeo } = originalAnalysis;

    const fixesSummary = appliedFixes.map((f: any) =>
      `[${f.category}] ${f.title} (impact: ${f.impact})\nBefore: ${f.before_code || "(new)"}\nAfter: ${f.after_code}`
    ).join("\n\n");

    const prompt = `You are re-scoring a webpage after SEO fixes were applied. 

ORIGINAL SCORES:
- SEO Score: ${seo_score}/100
- AEO Score: ${aeo_score}/100
- Ranking Prediction: ${ranking_prediction}/100

ORIGINAL PAGE DATA:
- Title: "${meta.title}"
- Meta Description: "${meta.description}"
- H1 tags: ${JSON.stringify(meta.h1)}
- Word count: ${meta.word_count}
- Images without alt: ${meta.images_without_alt}/${meta.total_images}
- Internal links: ${meta.internal_links}
- Has FAQ: ${aeo?.has_faq}

ORIGINAL ISSUES (${issues.length} total):
${issues.map((i: any) => `- [${i.severity}] ${i.title}: ${i.description}`).join("\n")}

FIXES APPLIED (${appliedFixes.length}):
${fixesSummary}

Based on these fixes, calculate NEW scores. The fixes should logically improve the scores. 
- Each high-impact fix should improve relevant scores by 5-15 points
- Each medium-impact fix by 3-8 points  
- Each low-impact fix by 1-4 points
- Scores must not exceed 100
- Also determine which original issues are now resolved by the fixes
- Generate updated meta data reflecting the fixes (e.g., if title was fixed, show new title)`;

    console.log(`Re-scoring after ${appliedFixes.length} fixes applied...`);

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
            content: "You are an expert SEO analyst. Re-score a webpage after fixes were applied. Be realistic but show meaningful improvement.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "recalculated_scores",
              description: "Return updated scores and analysis after fixes",
              parameters: {
                type: "object",
                properties: {
                  seo_score: { type: "number", description: "Updated SEO score 0-100" },
                  aeo_score: { type: "number", description: "Updated AEO score 0-100" },
                  ranking_prediction: { type: "number", description: "Updated ranking prediction 0-100" },
                  resolved_issue_titles: {
                    type: "array",
                    items: { type: "string" },
                    description: "Titles of original issues that are now resolved",
                  },
                  updated_meta: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      h1: { type: "array", items: { type: "string" } },
                      images_without_alt: { type: "number" },
                    },
                  },
                  aeo: {
                    type: "object",
                    properties: {
                      has_faq: { type: "boolean" },
                      conversational_tone: { type: "number" },
                      direct_answers: { type: "number" },
                      featured_snippet_potential: { type: "number" },
                      extracted_questions: { type: "array", items: { type: "string" } },
                    },
                  },
                  score_breakdown: {
                    type: "string",
                    description: "Brief explanation of how scores changed",
                  },
                },
                required: ["seo_score", "aeo_score", "ranking_prediction", "resolved_issue_titles", "score_breakdown"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "recalculated_scores" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      console.error("AI re-score error:", status);
      // Fallback: calculate improvement heuristically
      const highCount = appliedFixes.filter((f: any) => f.impact === "high").length;
      const medCount = appliedFixes.filter((f: any) => f.impact === "medium").length;
      const lowCount = appliedFixes.filter((f: any) => f.impact === "low").length;
      const boost = Math.min(highCount * 10 + medCount * 5 + lowCount * 2, 40);

      return new Response(JSON.stringify({
        success: true,
        result: {
          seo_score: Math.min(100, seo_score + boost),
          aeo_score: Math.min(100, aeo_score + Math.round(boost * 0.7)),
          ranking_prediction: Math.min(100, ranking_prediction + Math.round(boost * 0.8)),
          resolved_issue_titles: [],
          score_breakdown: `Heuristic: +${boost} from ${appliedFixes.length} fixes`,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    let recalculated;
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        recalculated = JSON.parse(toolCall.function.arguments);
      }
    } catch (e) {
      console.error("Failed to parse recalculation:", e);
    }

    if (!recalculated) {
      // Fallback
      const boost = Math.min(appliedFixes.length * 5, 30);
      recalculated = {
        seo_score: Math.min(100, seo_score + boost),
        aeo_score: Math.min(100, aeo_score + Math.round(boost * 0.7)),
        ranking_prediction: Math.min(100, ranking_prediction + Math.round(boost * 0.8)),
        resolved_issue_titles: [],
        score_breakdown: `Estimated +${boost} improvement`,
      };
    }

    console.log(`Re-score complete: SEO ${seo_score}→${recalculated.seo_score}, AEO ${aeo_score}→${recalculated.aeo_score}`);

    return new Response(JSON.stringify({ success: true, result: recalculated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Recalculation error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
