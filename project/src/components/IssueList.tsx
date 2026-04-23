import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

export type IssueSeverity = "critical" | "warning" | "info" | "success";

export interface SEOIssue {
  severity: IssueSeverity;
  title: string;
  description: string;
  category: string;
}

const severityConfig = {
  critical: {
    icon: XCircle,
    className: "border-destructive/20 bg-destructive/5",
    iconClass: "text-destructive",
    badge: "bg-destructive/10 text-destructive",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-warning/20 bg-warning/5",
    iconClass: "text-warning",
    badge: "bg-warning/10 text-warning",
  },
  info: {
    icon: Info,
    className: "border-info/20 bg-info/5",
    iconClass: "text-info",
    badge: "bg-info/10 text-info",
  },
  success: {
    icon: CheckCircle2,
    className: "border-success/20 bg-success/5",
    iconClass: "text-success",
    badge: "bg-success/10 text-success",
  },
};

export function IssueCard({ issue }: { issue: SEOIssue }) {
  const config = severityConfig[issue.severity];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border p-4 transition-shadow hover:shadow-md", config.className)}>
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", config.iconClass)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-semibold text-foreground">{issue.title}</h4>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", config.badge)}>
            {issue.category}
          </span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{issue.description}</p>
      </div>
    </div>
  );
}

export function IssueList({ issues }: { issues: SEOIssue[] }) {
  const sorted = [...issues].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2, success: 3 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((issue, i) => (
        <div key={i} className={`animate-in-up-delay-${Math.min(i, 4)}`}>
          <IssueCard issue={issue} />
        </div>
      ))}
    </div>
  );
}
