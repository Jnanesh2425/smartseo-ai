import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScoreGauge } from "@/components/ScoreGauge";
import { MetricCard } from "@/components/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, BarChart3, TrendingUp, Clock } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";

const mockHistory = [
  { date: "Mar 1", seo: 62, aeo: 48 },
  { date: "Mar 5", seo: 65, aeo: 52 },
  { date: "Mar 10", seo: 68, aeo: 55 },
  { date: "Mar 15", seo: 72, aeo: 61 },
  { date: "Mar 20", seo: 76, aeo: 67 },
];

const Dashboard = () => {
  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="animate-in-up">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your monitored URLs and SEO health.</p>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-in-up-delay-1">
          <MetricCard title="URLs Monitored" value={3} icon={Globe} subtitle="active" />
          <MetricCard title="Avg SEO Score" value={76} icon={BarChart3} trend="up" trendValue="+8%" />
          <MetricCard title="Avg AEO Score" value={67} icon={TrendingUp} trend="up" trendValue="+12%" />
          <MetricCard title="Last Scan" value="2m ago" icon={Clock} subtitle="auto-monitoring" />
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2 animate-in-up-delay-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SEO Score Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={mockHistory}>
                  <defs>
                    <linearGradient id="seoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(160,84%,39%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(160,84%,39%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,89%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="seo" stroke="hsl(160,84%,39%)" fill="url(#seoGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">AEO Score Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={mockHistory}>
                  <defs>
                    <linearGradient id="aeoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(217,91%,60%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(217,91%,60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,89%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="aeo" stroke="hsl(217,91%,60%)" fill="url(#aeoGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Score gauges */}
        <Card className="animate-in-up-delay-3">
          <CardHeader>
            <CardTitle className="text-base">Current Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap justify-center gap-12 py-4">
              <ScoreGauge score={76} label="SEO Score" size="lg" />
              <ScoreGauge score={67} label="AEO Score" size="lg" />
              <ScoreGauge score={71} label="Ranking Potential" size="lg" />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
