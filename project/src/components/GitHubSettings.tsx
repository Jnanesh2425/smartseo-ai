import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Github, Check, Loader2, Unlink, ExternalLink } from "lucide-react";

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
}

const STORAGE_KEY = "smartseo_github_config";

export function useGitHubConfig() {
  const [config, setConfig] = useState<GitHubConfig | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  const save = (c: GitHubConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    setConfig(c);
  };

  const clear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setConfig(null);
  };

  return { config, save, clear, isConnected: !!config };
}

interface GitHubSettingsProps {
  onConnect?: (config: GitHubConfig) => void;
  onDisconnect?: () => void;
}

export function GitHubSettings({ onConnect, onDisconnect }: GitHubSettingsProps) {
  const { config, save, clear, isConnected } = useGitHubConfig();
  const [form, setForm] = useState<GitHubConfig>({
    token: "",
    owner: "",
    repo: "",
    branch: "main",
    filePath: "index.html",
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (config) {
      setForm({ ...config, token: config.token.slice(0, 8) + "…" });
    }
  }, [config]);

  const handleVerify = async () => {
    if (!form.token || !form.owner || !form.repo) {
      toast({ title: "Missing fields", description: "Token, owner, and repo are required.", variant: "destructive" });
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetch(`https://api.github.com/repos/${form.owner}/${form.repo}`, {
        headers: { Authorization: `Bearer ${form.token}`, Accept: "application/vnd.github.v3+json" },
      });

      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

      const repoData = await res.json();
      const finalConfig = { ...form, branch: form.branch || repoData.default_branch };
      save(finalConfig);
      onConnect?.(finalConfig);
      toast({ title: "Connected! ✅", description: `Linked to ${form.owner}/${form.repo}` });
    } catch (err: any) {
      toast({ title: "Connection failed", description: err.message, variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisconnect = () => {
    clear();
    setForm({ token: "", owner: "", repo: "", branch: "main", filePath: "index.html" });
    onDisconnect?.();
    toast({ title: "Disconnected", description: "GitHub connection removed." });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Github className="h-5 w-5" />
          GitHub Connection
          {isConnected && <Badge className="bg-success/10 text-success border-success/20 text-xs"><Check className="h-3 w-3 mr-1" /> Connected</Badge>}
        </CardTitle>
        <CardDescription>
          Connect your GitHub repository to push Autonomous Fix changes directly to your codebase.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm bg-muted rounded-md px-3 py-2">
              <Github className="h-4 w-4 shrink-0" />
              <span className="font-mono">{config!.owner}/{config!.repo}</span>
              <Badge variant="outline" className="text-xs ml-auto">{config!.branch}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Target file: <code className="bg-muted px-1 rounded">{config!.filePath}</code>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDisconnect}>
                <Unlink className="h-3.5 w-3.5" /> Disconnect
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href={`https://github.com/${config!.owner}/${config!.repo}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> View Repo
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="gh-token" className="text-xs">Personal Access Token</Label>
                <Input
                  id="gh-token"
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxx"
                  value={form.token}
                  onChange={(e) => setForm(f => ({ ...f, token: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gh-owner" className="text-xs">Owner / Org</Label>
                <Input
                  id="gh-owner"
                  placeholder="username"
                  value={form.owner}
                  onChange={(e) => setForm(f => ({ ...f, owner: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gh-repo" className="text-xs">Repository</Label>
                <Input
                  id="gh-repo"
                  placeholder="my-website"
                  value={form.repo}
                  onChange={(e) => setForm(f => ({ ...f, repo: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gh-branch" className="text-xs">Branch</Label>
                <Input
                  id="gh-branch"
                  placeholder="main"
                  value={form.branch}
                  onChange={(e) => setForm(f => ({ ...f, branch: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gh-file" className="text-xs">Target File Path</Label>
              <Input
                id="gh-file"
                placeholder="index.html"
                value={form.filePath}
                onChange={(e) => setForm(f => ({ ...f, filePath: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">The HTML file where fixes will be applied (e.g. index.html, public/index.html)</p>
            </div>
            <Button onClick={handleVerify} disabled={isVerifying}>
              {isVerifying ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</> : <><Github className="h-4 w-4" /> Connect & Verify</>}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
