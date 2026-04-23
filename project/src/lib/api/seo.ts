import { supabase } from "@/integrations/supabase/client";

export interface AnalysisResult {
  url: string;
  seo_score: number;
  aeo_score: number;
  ranking_prediction: number;
  meta: {
    title: string;
    description: string;
    h1: string[];
    h2: string[];
    h3: string[];
    keywords: string[];
    images_without_alt: number;
    total_images: number;
    internal_links: number;
    external_links: number;
    word_count: number;
  };
  issues: Array<{
    severity: "critical" | "warning" | "info" | "success";
    title: string;
    description: string;
    category: string;
  }>;
  suggestions: Array<{
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
    category: string;
  }>;
  aeo: {
    has_faq: boolean;
    conversational_tone: number;
    direct_answers: number;
    featured_snippet_potential: number;
    extracted_questions: string[];
  };
}

export async function analyzeUrl(url: string): Promise<AnalysisResult> {
  const { data, error } = await supabase.functions.invoke("seo-analyze", {
    body: { url },
  });

  if (error) throw new Error(error.message || "Analysis failed");
  if (!data?.success) throw new Error(data?.error || "Analysis failed");

  return data.result;
}
