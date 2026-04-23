import { supabase } from "@/integrations/supabase/client";
import type { Fix } from "./fixes";
import type { GitHubConfig } from "@/components/GitHubSettings";

export interface PushResult {
  success: boolean;
  error?: string;
  commit?: {
    sha: string;
    url: string;
    message: string;
  };
  appliedFixes: string[];
  skippedFixes: string[];
}

export async function pushFixesToGitHub(
  github: GitHubConfig,
  fixes: Fix[]
): Promise<PushResult> {
  const { data, error } = await supabase.functions.invoke("github-push-fixes", {
    body: { github, fixes },
  });

  if (error) throw new Error(error.message || "GitHub push failed");
  if (!data?.success) throw new Error(data?.error || "GitHub push failed");

  return data;
}
