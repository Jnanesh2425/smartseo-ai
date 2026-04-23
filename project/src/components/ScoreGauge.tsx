import { cn } from "@/lib/utils";

interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: "sm" | "md" | "lg";
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-success stroke-success";
  if (score >= 60) return "text-success stroke-[hsl(142,71%,45%)]";
  if (score >= 40) return "text-warning stroke-warning";
  return "text-destructive stroke-destructive";
}

function getScoreLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Poor";
}

export function ScoreGauge({ score, label, size = "md" }: ScoreGaugeProps) {
  const sizeMap = { sm: 80, md: 120, lg: 160 };
  const strokeMap = { sm: 6, md: 8, lg: 10 };
  const fontMap = { sm: "text-lg", md: "text-3xl", lg: "text-4xl" };
  const labelMap = { sm: "text-[10px]", md: "text-xs", lg: "text-sm" };

  const dim = sizeMap[size];
  const strokeWidth = strokeMap[size];
  const radius = (dim - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-muted"
          />
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn("transition-all duration-1000 ease-out", getScoreColor(score))}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-bold font-mono tabular-nums", fontMap[size], getScoreColor(score))}>
            {score}
          </span>
          <span className={cn("font-medium text-muted-foreground", labelMap[size])}>
            {getScoreLabel(score)}
          </span>
        </div>
      </div>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </div>
  );
}
