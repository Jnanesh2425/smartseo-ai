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
    const { analysisResult } = await req.json();
    if (!analysisResult) {
      return new Response(JSON.stringify({ success: false, error: "Analysis result is required" }), {
        status: 400,
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

    const { meta, issues, suggestions, seo_score, aeo_score, aeo } = analysisResult;

    const prompt = `Based on the following SEO analysis, generate concrete code fixes. For each fix, provide the exact HTML code to replace or add.

Current page data:
- Title: "${meta.title}"
- Meta Description: "${meta.description}"
- H1 tags: ${JSON.stringify(meta.h1)}
- H2 tags: ${JSON.stringify(meta.h2)}
- H3 tags: ${JSON.stringify(meta.h3)}
- Keywords: ${JSON.stringify(meta.keywords)}
- Word count: ${meta.word_count}
- Images without alt: ${meta.images_without_alt}/${meta.total_images}
- Internal links: ${meta.internal_links}
- SEO Score: ${seo_score}
- AEO Score: ${aeo_score}
- Has FAQ: ${aeo?.has_faq}
- Issues: ${JSON.stringify(issues.filter((i: any) => i.severity !== "success").map((i: any) => i.title))}
- Suggestions: ${JSON.stringify(suggestions.map((s: any) => s.title))}

Generate fixes grouped by category. Each fix should have before/after code.`;

    console.log("Generating fixes...");

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
            content: "You are an expert SEO engineer. Generate concrete, implementable code fixes for websites. Be specific with HTML code.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_fixes",
              description: "Return grouped code fixes for SEO issues",
              parameters: {
                type: "object",
                properties: {
                  fixes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Unique fix ID like fix-1" },
                        category: { type: "string", enum: ["Meta Tags", "Headings", "Content", "Schema Markup", "Images", "Links", "AEO"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        impact: { type: "string", enum: ["high", "medium", "low"] },
                        before_code: { type: "string", description: "Current HTML code (or empty if adding new)" },
                        after_code: { type: "string", description: "Fixed/new HTML code to use" },
                        auto_fixable: { type: "boolean", description: "Whether this can be auto-applied" },
                      },
                      required: ["id", "category", "title", "description", "impact", "before_code", "after_code", "auto_fixable"],
                    },
                  },
                },
                required: ["fixes"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_fixes" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ success: false, error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI error:", status);
      return new Response(JSON.stringify({ success: false, error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let fixes;
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        fixes = JSON.parse(toolCall.function.arguments).fixes;
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      fixes = [];
    }

    console.log(`Generated ${fixes?.length || 0} fixes`);

    return new Response(JSON.stringify({ success: true, fixes: fixes || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fix generation error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
