import { AppLayout } from "@/components/AppLayout";
import { UrlInput } from "@/components/UrlInput";
import { MetricCard } from "@/components/MetricCard";
import { BarChart3, Globe, Zap, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  const handleAnalyze = (url: string) => {
    navigate(`/analyze?url=${encodeURIComponent(url)}`);
  };

  return (
    <AppLayout>
      <div className="flex flex-col items-center">
        {/* Hero */}
        <section className="flex flex-col items-center text-center py-16 animate-in-up">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground mb-6 shadow-sm">
            <Zap className="h-3.5 w-3.5 text-primary" />
            AI-Powered SEO & AEO Analysis
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] text-foreground max-w-3xl">
            Optimize your site for search and AI engines
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground leading-relaxed">
            Crawl any URL, get instant SEO and Answer Engine Optimization scores, 
            AI-powered suggestions, and ranking predictions — all in one place.
          </p>
          <div className="mt-10 w-full flex justify-center">
            <UrlInput onSubmit={handleAnalyze} />
          </div>
        </section>

        {/* Features */}
        <section className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-8 animate-in-up-delay-2">
          <MetricCard
            title="SEO Analysis"
            value="100+"
            subtitle="checks per scan"
            icon={BarChart3}
          />
          <MetricCard
            title="AEO Scoring"
            value="AI"
            subtitle="answer engine ready"
            icon={Globe}
          />
          <MetricCard
            title="AI Suggestions"
            value="Smart"
            subtitle="powered by LLMs"
            icon={Zap}
          />
          <MetricCard
            title="Ranking Prediction"
            value="ML"
            subtitle="probability model"
            icon={Shield}
          />
        </section>
      </div>
    </AppLayout>
  );
};

export default Index;
