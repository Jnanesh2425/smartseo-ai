import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { generateFixes, recalculateScores, type Fix } from "@/lib/api/fixes";
import { pushFixesToGitHub } from "@/lib/api/github";
import { analyzeUrl, type AnalysisResult } from "@/lib/api/seo";
import { useGitHubConfig, GitHubSettings } from "@/components/GitHubSettings";
import {
  Wand2, Copy, Check, Undo2, Eye, Download,
  Zap, AlertTriangle, Info, Loader2, RefreshCw,
  Github, Globe, Monitor,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

const impactIcons = {
  high: <Zap className="h-3.5 w-3.5" />,
  medium: <AlertTriangle className="h-3.5 w-3.5" />,
  low: <Info className="h-3.5 w-3.5" />,
};

const impactColors = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-info/10 text-info border-info/20",
};

type FixMode = "simulation" | "live";

type DeployStatus = "idle" | "pushing" | "deployed" | "re-analyzing" | "complete" | "error";

interface AutonomousFixProps {
  analysisResult: AnalysisResult;
  onResultUpdate?: (updated: AnalysisResult) => void;
}

export function AutonomousFix({ analysisResult, onResultUpdate }: AutonomousFixProps) {
  const [fixes, setFixes] = useState<Fix[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [appliedFixes, setAppliedFixes] = useState<Fix[]>([]);
  const [previewFix, setPreviewFix] = useState<Fix | null>(null);
  const [changeLog, setChangeLog] = useState<Array<{ fix: Fix; timestamp: Date; action: string }>>([]);
  const [scoreBreakdown, setScoreBreakdown] = useState<string | null>(null);
  const [previousScores, setPreviousScores] = useState<{ seo: number; aeo: number; ranking: number } | null>(null);
  const [mode, setMode] = useState<FixMode>("simulation");
  const [deployStatus, setDeployStatus] = useState<DeployStatus>("idle");
  const [commitInfo, setCommitInfo] = useState<{ sha: string; url: string } | null>(null);
  const [showGitHubSettings, setShowGitHubSettings] = useState(false);
  const { config: githubConfig, isConnected: isGitHubConnected } = useGitHubConfig();
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateFixes(analysisResult);
      setFixes(result);
      toast({ title: "Fixes generated", description: `${result.length} fixes ready to apply.` });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleFix = (id: string) => {
    setFixes(prev => prev.map(f => f.id === id ? { ...f, selected: !f.selected } : f));
  };

  const selectAll = () => setFixes(prev => prev.map(f => ({ ...f, selected: true })));
  const deselectAll = () => setFixes(prev => prev.map(f => ({ ...f, selected: false })));

  const applySelected = async () => {
    const selected = fixes.filter(f => f.selected && !f.applied);
    if (selected.length === 0) return;

    setIsApplying(true);

    // In live mode, push to GitHub first
    if (mode === "live") {
      if (!githubConfig) {
        setShowGitHubSettings(true);
        setIsApplying(false);
        toast({ title: "GitHub not connected", description: "Connect your repository to use Live Mode.", variant: "destructive" });
        return;
      }

      setDeployStatus("pushing");
      try {
        const pushResult = await pushFixesToGitHub(githubConfig, selected);
        setCommitInfo({ sha: pushResult.commit!.sha, url: pushResult.commit!.url });
        setDeployStatus("deployed");

        setChangeLog(prev => [...prev, ...selected.map(f => ({
          fix: f, timestamp: new Date(), action: `Pushed to GitHub (${pushResult.commit!.sha.slice(0, 7)})`,
        }))]);

        toast({ title: "Pushed to GitHub! 🚀", description: `${pushResult.appliedFixes.length} fixes committed.` });

        if (pushResult.skippedFixes.length > 0) {
          toast({ title: "Some fixes skipped", description: pushResult.skippedFixes.join(", "), variant: "destructive" });
        }
      } catch (err: any) {
        setDeployStatus("error");
        setIsApplying(false);
        toast({ title: "GitHub push failed", description: err.message, variant: "destructive" });
        return;
      }
    }

    // Mark fixes as applied
    const newApplied = selected.map(f => ({ ...f, applied: true }));
    setAppliedFixes(prev => [...prev, ...newApplied]);
    if (mode === "simulation") {
      setChangeLog(prev => [...prev, ...selected.map(f => ({ fix: f, timestamp: new Date(), action: "Applied (Simulation)" }))]);
    }
    setFixes(prev => prev.map(f => f.selected ? { ...f, applied: true } : f));
    setIsApplying(false);

    // Recalculate scores
    if (mode === "live") {
      // In live mode: wait for deployment, then re-crawl the live site
      setDeployStatus("re-analyzing");
      toast({ title: "Re-analyzing live site…", description: "Waiting for changes to propagate, then re-crawling." });

      try {
        // Brief wait for GitHub Pages / CDN to update
        await new Promise(r => setTimeout(r, 5000));

        const freshResult = await analyzeUrl(analysisResult.url);

        setPreviousScores({
          seo: analysisResult.seo_score,
          aeo: analysisResult.aeo_score,
          ranking: analysisResult.ranking_prediction,
        });

        setScoreBreakdown(
          `Live re-analysis complete. SEO: ${analysisResult.seo_score} → ${freshResult.seo_score}, AEO: ${analysisResult.aeo_score} → ${freshResult.aeo_score}`
        );

        onResultUpdate?.(freshResult);
        setDeployStatus("complete");

        toast({
          title: "Live scores updated! 🎉",
          description: `SEO: ${freshResult.seo_score} | AEO: ${freshResult.aeo_score} | Ranking: ${freshResult.ranking_prediction}`,
        });
      } catch (err: any) {
        setDeployStatus("error");
        toast({ title: "Live re-analysis failed", description: err.message, variant: "destructive" });
      }
    } else {
      // Simulation mode: use AI recalculation
      setIsRecalculating(true);
      setPreviousScores({
        seo: analysisResult.seo_score,
        aeo: analysisResult.aeo_score,
        ranking: analysisResult.ranking_prediction,
      });

      try {
        const allApplied = [...appliedFixes, ...newApplied];
        const recalculated = await recalculateScores(analysisResult, allApplied);

        const updatedResult: AnalysisResult = {
          ...analysisResult,
          seo_score: recalculated.seo_score,
          aeo_score: recalculated.aeo_score,
          ranking_prediction: recalculated.ranking_prediction,
          issues: analysisResult.issues.map(issue => {
            if (recalculated.resolved_issue_titles?.includes(issue.title)) {
              return { ...issue, severity: "success" as const };
            }
            return issue;
          }),
          meta: { ...analysisResult.meta, ...(recalculated.updated_meta || {}) },
          aeo: { ...analysisResult.aeo, ...(recalculated.aeo || {}) },
        };

        setScoreBreakdown(recalculated.score_breakdown);
        onResultUpdate?.(updatedResult);

        const seoDiff = recalculated.seo_score - analysisResult.seo_score;
        const aeoDiff = recalculated.aeo_score - analysisResult.aeo_score;
        toast({
          title: "Scores updated! 🎉",
          description: `SEO: ${seoDiff >= 0 ? "+" : ""}${seoDiff} → ${recalculated.seo_score} | AEO: ${aeoDiff >= 0 ? "+" : ""}${aeoDiff} → ${recalculated.aeo_score}`,
        });
      } catch (err: any) {
        toast({ title: "Score recalculation failed", description: err.message, variant: "destructive" });
      } finally {
        setIsRecalculating(false);
      }
    }
  };

  const undoFix = (id: string) => {
    setFixes(prev => prev.map(f => f.id === id ? { ...f, applied: false } : f));
    setAppliedFixes(prev => prev.filter(f => f.id !== id));
    setChangeLog(prev => [...prev, {
      fix: { ...fixes.find(f => f.id === id)!, applied: false },
      timestamp: new Date(),
      action: "Reverted",
    }]);
    toast({ title: "Fix reverted", description: "Change has been undone." });
  };

  const copyAllFixes = () => {
    const selected = fixes.filter(f => f.selected);
    const code = selected.map(f => `<!-- ${f.category}: ${f.title} -->\n${f.after_code}`).join("\n\n");
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: `${selected.length} fixes copied to clipboard.` });
  };

  const exportFixes = () => {
    const selected = fixes.filter(f => f.selected);
    const report = `# Autonomous Fix Report\n## URL: ${analysisResult.url}\n## Generated: ${new Date().toLocaleString()}\n## Mode: ${mode === "live" ? "🟢 Live" : "🔵 Simulation"}\n\n${previousScores ? `## Score Changes\n| Metric | Before | After | Change |\n|--------|--------|-------|--------|\n| SEO Score | ${previousScores.seo} | ${analysisResult.seo_score} | +${analysisResult.seo_score - previousScores.seo} |\n| AEO Score | ${previousScores.aeo} | ${analysisResult.aeo_score} | +${analysisResult.aeo_score - previousScores.aeo} |\n| Ranking | ${previousScores.ranking} | ${analysisResult.ranking_prediction} | +${analysisResult.ranking_prediction - previousScores.ranking} |\n\n` : ""}${selected.map(f =>
      `### ${f.category}: ${f.title}\n**Impact:** ${f.impact}\n**Description:** ${f.description}\n\n**Before:**\n\`\`\`html\n${f.before_code || "(new addition)"}\n\`\`\`\n\n**After:**\n\`\`\`html\n${f.after_code}\n\`\`\`\n`
    ).join("\n---\n\n")}`;
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seo-fixes-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categories = [...new Set(fixes.map(f => f.category))];
  const selectedCount = fixes.filter(f => f.selected).length;
  const appliedCount = fixes.filter(f => f.applied).length;

  const deployStatusConfig: Record<DeployStatus, { label: string; color: string; icon: React.ReactNode }> = {
    idle: { label: "", color: "", icon: null },
    pushing: { label: "Pushing to GitHub…", color: "border-primary/40 bg-primary/5", icon: <Loader2 className="h-5 w-5 text-primary animate-spin" /> },
    deployed: { label: "Changes deployed to GitHub ✅", color: "border-success/40 bg-success/5", icon: <Github className="h-5 w-5 text-success" /> },
    "re-analyzing": { label: "Re-analyzing live website…", color: "border-primary/40 bg-primary/5", icon: <Globe className="h-5 w-5 text-primary animate-pulse" /> },
    complete: { label: "Live website updated & re-analyzed ✅", color: "border-success/40 bg-success/5", icon: <Check className="h-5 w-5 text-success" /> },
    error: { label: "Deployment failed", color: "border-destructive/40 bg-destructive/5", icon: <AlertTriangle className="h-5 w-5 text-destructive" /> },
  };

  if (fixes.length === 0) {
    return (
      <div className="space-y-4">
        {/* Mode Toggle */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Fix Mode</p>
                  <p className="text-xs text-muted-foreground">
                    {mode === "simulation" ? "Simulate fixes & preview score changes" : "Push fixes to your live website via GitHub"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="mode-toggle" className="text-xs text-muted-foreground">Simulation</Label>
                <Switch
                  id="mode-toggle"
                  checked={mode === "live"}
                  onCheckedChange={(checked) => setMode(checked ? "live" : "simulation")}
                />
                <Label htmlFor="mode-toggle" className="text-xs font-semibold">Live</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GitHub Settings (show when Live mode and not connected) */}
        {mode === "live" && !isGitHubConnected && <GitHubSettings />}

        {mode === "live" && isGitHubConnected && (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="py-3 flex items-center gap-3">
              <Github className="h-5 w-5 text-success" />
              <div className="flex-1">
                <p className="text-sm font-medium text-success">GitHub Connected</p>
                <p className="text-xs text-muted-foreground font-mono">{githubConfig!.owner}/{githubConfig!.repo} → {githubConfig!.filePath}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowGitHubSettings(true)}>Settings</Button>
            </CardContent>
          </Card>
        )}

        <Card className="flex flex-col items-center justify-center py-12 gap-4">
          <Wand2 className="h-12 w-12 text-primary opacity-60" />
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Autonomous Fix</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {mode === "simulation"
                ? "AI will generate concrete code fixes. Preview before applying, undo anytime. Scores update via simulation."
                : "AI will generate fixes and push them directly to your GitHub repository. Scores update from live re-analysis."}
            </p>
            {mode === "live" && (
              <Badge className="bg-success/10 text-success border-success/20">
                <Globe className="h-3 w-3 mr-1" /> Live Mode Active
              </Badge>
            )}
          </div>
          <Button onClick={handleGenerate} disabled={isGenerating || (mode === "live" && !isGitHubConnected)} size="lg">
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating Fixes…</>
            ) : (
              <><Wand2 className="h-4 w-4" /> Generate Fixes</>
            )}
          </Button>
        </Card>

        {/* GitHub Settings Dialog */}
        <Dialog open={showGitHubSettings} onOpenChange={setShowGitHubSettings}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>GitHub Settings</DialogTitle>
              <DialogDescription>Configure your repository for live fix deployment.</DialogDescription>
            </DialogHeader>
            <GitHubSettings onConnect={() => setShowGitHubSettings(false)} />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mode indicator */}
      <Card className={mode === "live" ? "border-success/30 bg-success/5" : "border-primary/30 bg-primary/5"}>
        <CardContent className="py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {mode === "live" ? <Globe className="h-5 w-5 text-success" /> : <Monitor className="h-5 w-5 text-primary" />}
            <div>
              <p className="text-sm font-medium">{mode === "live" ? "🟢 Live Mode" : "🔵 Simulation Mode"}</p>
              <p className="text-xs text-muted-foreground">
                {mode === "live" ? "Fixes will be pushed to GitHub and scores re-analyzed from live site" : "Fixes simulated locally, scores estimated by AI"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={mode === "live"} onCheckedChange={(c) => setMode(c ? "live" : "simulation")} />
            <Label className="text-xs">{mode === "live" ? "Live" : "Sim"}</Label>
          </div>
        </CardContent>
      </Card>

      {/* Deploy Status Banner */}
      {deployStatus !== "idle" && (
        <Card className={deployStatusConfig[deployStatus].color}>
          <CardContent className="py-3 flex items-center gap-3">
            {deployStatusConfig[deployStatus].icon}
            <div className="flex-1">
              <p className="text-sm font-medium">{deployStatusConfig[deployStatus].label}</p>
              {commitInfo && deployStatus !== "pushing" && (
                <a href={commitInfo.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-mono">
                  Commit: {commitInfo.sha.slice(0, 7)} ↗
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score Breakdown Banner */}
      {scoreBreakdown && previousScores && (
        <Card className="border-success/40 bg-success/5">
          <CardContent className="py-3 flex items-center gap-3">
            <Check className="h-5 w-5 text-success shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-success">Scores Updated</p>
              <p className="text-xs text-muted-foreground">{scoreBreakdown}</p>
            </div>
            <div className="flex gap-4 text-xs font-mono">
              <span>SEO: {previousScores.seo} → <strong className="text-success">{analysisResult.seo_score}</strong></span>
              <span>AEO: {previousScores.aeo} → <strong className="text-success">{analysisResult.aeo_score}</strong></span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recalculating indicator */}
      {isRecalculating && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="py-3 flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-primary animate-spin shrink-0" />
            <div>
              <p className="text-sm font-medium">Recalculating scores…</p>
              <p className="text-xs text-muted-foreground">AI is re-analyzing with your applied fixes</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="secondary">{fixes.length} fixes</Badge>
            <Badge variant="outline">{selectedCount} selected</Badge>
            <Badge className="bg-success/10 text-success border-success/20">{appliedCount} applied</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll}>Select All</Button>
            <Button variant="ghost" size="sm" onClick={deselectAll}>Deselect All</Button>
            <Button variant="outline" size="sm" onClick={copyAllFixes} disabled={selectedCount === 0}>
              <Copy className="h-3.5 w-3.5" /> Copy All
            </Button>
            <Button variant="outline" size="sm" onClick={exportFixes} disabled={selectedCount === 0}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button
              size="sm"
              onClick={applySelected}
              disabled={isApplying || isRecalculating || deployStatus === "pushing" || deployStatus === "re-analyzing" || selectedCount === 0 || fixes.filter(f => f.selected && !f.applied).length === 0}
            >
              {isApplying || deployStatus === "pushing" || deployStatus === "re-analyzing" ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {deployStatus === "pushing" ? "Pushing…" : deployStatus === "re-analyzing" ? "Re-analyzing…" : "Applying…"}</>
              ) : (
                <>
                  {mode === "live" ? <Globe className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                  {mode === "live" ? `Push & Fix (${fixes.filter(f => f.selected && !f.applied).length})` : `One-Click Fix (${fixes.filter(f => f.selected && !f.applied).length})`}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Fix List by Category */}
      <Tabs defaultValue={categories[0]} className="w-full">
        <TabsList className="w-full justify-start bg-muted/50 flex-wrap h-auto gap-1 p-1">
          {categories.map(cat => (
            <TabsTrigger key={cat} value={cat} className="text-xs">
              {cat} ({fixes.filter(f => f.category === cat).length})
            </TabsTrigger>
          ))}
          {changeLog.length > 0 && (
            <TabsTrigger value="changelog" className="text-xs">
              Change Log ({changeLog.length})
            </TabsTrigger>
          )}
        </TabsList>

        {categories.map(cat => (
          <TabsContent key={cat} value={cat} className="mt-3 space-y-3">
            {fixes.filter(f => f.category === cat).map(fix => (
              <Card key={fix.id} className={`transition-all ${fix.applied ? "border-success/40 bg-success/5" : ""}`}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox checked={fix.selected} onCheckedChange={() => toggleFix(fix.id)} disabled={fix.applied} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{fix.title}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${impactColors[fix.impact]}`}>
                          {impactIcons[fix.impact]} {fix.impact}
                        </span>
                        {fix.applied && (
                          <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
                            <Check className="h-3 w-3" /> Applied
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{fix.description}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewFix(fix)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                        navigator.clipboard.writeText(fix.after_code);
                        toast({ title: "Copied fix code" });
                      }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      {fix.applied && mode === "simulation" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => undoFix(fix.id)}>
                          <Undo2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}

        {changeLog.length > 0 && (
          <TabsContent value="changelog" className="mt-3">
            <Card>
              <CardHeader><CardTitle className="text-base">Change Log</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {changeLog.map((entry, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm border-b border-border/50 pb-2 last:border-0">
                    <span className="text-muted-foreground text-xs font-mono">{entry.timestamp.toLocaleTimeString()}</span>
                    <span className={entry.action.includes("Reverted") ? "text-destructive" : "text-success"}>{entry.action}</span>
                    <span className="font-medium">{entry.fix.title}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!previewFix} onOpenChange={() => setPreviewFix(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" /> Preview: {previewFix?.title}
            </DialogTitle>
            <DialogDescription>{previewFix?.description}</DialogDescription>
          </DialogHeader>
          {previewFix && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-destructive uppercase tracking-wider">Before</label>
                <pre className="mt-1 text-xs font-mono bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2 overflow-auto max-h-40 whitespace-pre-wrap">
                  {previewFix.before_code || "(empty — new addition)"}
                </pre>
              </div>
              <div>
                <label className="text-xs font-semibold text-success uppercase tracking-wider">After</label>
                <pre className="mt-1 text-xs font-mono bg-success/5 border border-success/20 rounded-md px-3 py-2 overflow-auto max-h-40 whitespace-pre-wrap">
                  {previewFix.after_code}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* GitHub Settings Dialog */}
      <Dialog open={showGitHubSettings} onOpenChange={setShowGitHubSettings}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>GitHub Settings</DialogTitle>
            <DialogDescription>Configure your repository for live fix deployment.</DialogDescription>
          </DialogHeader>
          <GitHubSettings onConnect={() => setShowGitHubSettings(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
