import { supabase } from "@/integrations/supabase/client";
import type { AnalysisResult } from "./seo";

export interface Fix {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  before_code: string;
  after_code: string;
  auto_fixable: boolean;
  selected?: boolean;
  applied?: boolean;
}

export interface RecalculatedScores {
  seo_score: number;
  aeo_score: number;
  ranking_prediction: number;
  resolved_issue_titles: string[];
  updated_meta?: Partial<AnalysisResult["meta"]>;
  aeo?: Partial<AnalysisResult["aeo"]>;
  score_breakdown: string;
}

export async function generateFixes(analysisResult: AnalysisResult): Promise<Fix[]> {
  const { data, error } = await supabase.functions.invoke("generate-fixes", {
    body: { analysisResult },
  });

  if (error) throw new Error(error.message || "Fix generation failed");
  if (!data?.success) throw new Error(data?.error || "Fix generation failed");

  return data.fixes.map((f: Fix) => ({ ...f, selected: true, applied: false }));
}

export async function recalculateScores(
  originalAnalysis: AnalysisResult,
  appliedFixes: Fix[]
): Promise<RecalculatedScores> {
  const { data, error } = await supabase.functions.invoke("recalculate-scores", {
    body: { originalAnalysis, appliedFixes },
  });

  if (error) throw new Error(error.message || "Score recalculation failed");
  if (!data?.success) throw new Error(data?.error || "Score recalculation failed");

  return data.result;
}
