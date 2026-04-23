import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { UrlInput } from "@/components/UrlInput";
import { ScoreGauge } from "@/components/ScoreGauge";
import { IssueList } from "@/components/IssueList";
import { SuggestionList } from "@/components/SuggestionList";
import { MetricCard } from "@/components/MetricCard";
import { AutonomousFix } from "@/components/AutonomousFix";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { analyzeUrl, type AnalysisResult } from "@/lib/api/seo";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Link2, Image, Type, Hash, HelpCircle,
  MessageSquare, Target, BarChart3,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

const AnalyzePage = () => {
  const [searchParams] = useSearchParams();
  const initialUrl = searchParams.get("url") || "";
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const handleResultUpdate = (updated: AnalysisResult) => setResult(updated);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAnalyze = async (url: string) => {
    setIsLoading(true);
    setResult(null);
    try {
      const data = await analyzeUrl(url);
      setResult(data);
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialUrl) handleAnalyze(initialUrl);
  }, []);

  const radarData = result
    ? [
        { metric: "Keywords", value: Math.min(result.seo_score + 5, 100) },
        { metric: "Meta Tags", value: result.meta.description ? 85 : 30 },
        { metric: "Headings", value: result.meta.h1.length > 0 ? 80 : 20 },
        { metric: "Images", value: result.meta.total_images > 0 ? Math.round(((result.meta.total_images - result.meta.images_without_alt) / Math.max(result.meta.total_images, 1)) * 100) : 100 },
        { metric: "Links", value: Math.min(result.meta.internal_links * 5, 100) },
        { metric: "Content", value: Math.min(result.meta.word_count / 20, 100) },
      ]
    : [];

  const aeoBarData = result
    ? [
        { name: "Conversational", score: result.aeo.conversational_tone },
        { name: "Direct Answers", score: result.aeo.direct_answers },
        { name: "Snippet Ready", score: result.aeo.featured_snippet_potential },
      ]
    : [];

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-2xl font-bold animate-in-up">Analyze URL</h1>
          <UrlInput onSubmit={handleAnalyze} isLoading={isLoading} />
        </div>

        {result && (
          <div className="flex flex-col gap-8 animate-in-up-delay-1">
            {/* Scores row */}
            <div className="grid gap-6 sm:grid-cols-3">
              <Card className="flex items-center justify-center py-8">
                <ScoreGauge score={result.seo_score} label="SEO Score" size="lg" />
              </Card>
              <Card className="flex items-center justify-center py-8">
                <ScoreGauge score={result.aeo_score} label="AEO Score" size="lg" />
              </Card>
              <Card className="flex items-center justify-center py-8">
                <ScoreGauge score={result.ranking_prediction} label="Ranking Potential" size="lg" />
              </Card>
            </div>

            {/* Metrics */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard title="Word Count" value={result.meta.word_count.toLocaleString()} icon={FileText} />
              <MetricCard title="Internal Links" value={result.meta.internal_links} icon={Link2} />
              <MetricCard title="Images" value={`${result.meta.total_images - result.meta.images_without_alt}/${result.meta.total_images}`} subtitle="with alt text" icon={Image} />
              <MetricCard title="Headings" value={result.meta.h1.length + result.meta.h2.length + result.meta.h3.length} icon={Type} />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="issues" className="w-full">
              <TabsList className="w-full justify-start bg-muted/50">
                <TabsTrigger value="issues">Issues ({result.issues.length})</TabsTrigger>
                <TabsTrigger value="suggestions">AI Suggestions</TabsTrigger>
                <TabsTrigger value="aeo">AEO Details</TabsTrigger>
                <TabsTrigger value="fixes">🔧 Autonomous Fix</TabsTrigger>
                <TabsTrigger value="charts">Charts</TabsTrigger>
                <TabsTrigger value="meta">Page Meta</TabsTrigger>
              </TabsList>

              <TabsContent value="issues" className="mt-4">
                <IssueList issues={result.issues} />
              </TabsContent>

              <TabsContent value="suggestions" className="mt-4">
                <SuggestionList suggestions={result.suggestions} />
              </TabsContent>

              <TabsContent value="fixes" className="mt-4">
                <AutonomousFix analysisResult={result} onResultUpdate={handleResultUpdate} />
              </TabsContent>

              <TabsContent value="aeo" className="mt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <HelpCircle className="h-4 w-4 text-primary" />
                        Extracted Questions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {result.aeo.extracted_questions.length > 0 ? (
                        <ul className="space-y-2">
                          {result.aeo.extracted_questions.map((q, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <MessageSquare className="mt-0.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              {q}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No questions detected. Consider adding an FAQ section.</p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Target className="h-4 w-4 text-primary" />
                        AEO Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={aeoBarData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,89%)" />
                          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="score" fill="hsl(160,84%,39%)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="charts" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      SEO Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="hsl(220,13%,89%)" />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Radar dataKey="value" stroke="hsl(160,84%,39%)" fill="hsl(160,84%,39%)" fillOpacity={0.2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="meta" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Page Metadata</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</label>
                      <p className="mt-1 text-sm font-mono bg-muted rounded-md px-3 py-2">{result.meta.title || "—"}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Meta Description</label>
                      <p className="mt-1 text-sm font-mono bg-muted rounded-md px-3 py-2">{result.meta.description || "—"}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Keywords</label>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {result.meta.keywords.length > 0 ? result.meta.keywords.map((kw, i) => (
                          <Badge key={i} variant="secondary" className="font-mono text-xs">{kw}</Badge>
                        )) : <span className="text-sm text-muted-foreground">No keywords detected</span>}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">H1 Tags</label>
                      <div className="mt-1 space-y-1">
                        {result.meta.h1.map((h, i) => (
                          <p key={i} className="text-sm font-mono bg-muted rounded-md px-3 py-2">{h}</p>
                        ))}
                        {result.meta.h1.length === 0 && <span className="text-sm text-muted-foreground">No H1 tags found</span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AnalyzePage;
