const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { github, fixes } = await req.json();
    const { token, owner, repo, branch, filePath } = github;

    if (!token || !owner || !repo || !filePath) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing GitHub configuration" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!fixes || fixes.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No fixes to apply" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ghHeaders = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };

    const targetBranch = branch || "main";

    // 1. Get current file content
    console.log(`Fetching file: ${filePath} from ${owner}/${repo}@${targetBranch}`);
    const fileRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${targetBranch}`,
      { headers: ghHeaders }
    );

    if (!fileRes.ok) {
      const errData = await fileRes.json();
      throw new Error(`Could not fetch file: ${errData.message || fileRes.status}`);
    }

    const fileData = await fileRes.json();
    let content = atob(fileData.content.replace(/\n/g, ""));

    // 2. Apply each fix by replacing before_code with after_code
    const appliedFixes: string[] = [];
    const skippedFixes: string[] = [];

    for (const fix of fixes) {
      if (fix.before_code && fix.after_code) {
        if (content.includes(fix.before_code)) {
          content = content.replace(fix.before_code, fix.after_code);
          appliedFixes.push(fix.title);
        } else {
          // Try to apply by injecting (e.g., adding meta tags before </head>)
          if (fix.category === "Meta Tags" && content.includes("</head>")) {
            content = content.replace("</head>", `${fix.after_code}\n</head>`);
            appliedFixes.push(fix.title + " (injected)");
          } else if (fix.category === "Schema" && content.includes("</body>")) {
            content = content.replace("</body>", `${fix.after_code}\n</body>`);
            appliedFixes.push(fix.title + " (injected)");
          } else {
            skippedFixes.push(fix.title);
          }
        }
      } else if (!fix.before_code && fix.after_code) {
        // New addition — inject based on category
        if (fix.category === "Meta Tags" && content.includes("</head>")) {
          content = content.replace("</head>", `${fix.after_code}\n</head>`);
          appliedFixes.push(fix.title);
        } else if (content.includes("</body>")) {
          content = content.replace("</body>", `${fix.after_code}\n</body>`);
          appliedFixes.push(fix.title);
        } else {
          skippedFixes.push(fix.title);
        }
      }
    }

    if (appliedFixes.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No fixes could be applied to the file content.", skippedFixes }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Commit the updated file
    const commitMessage = `🔧 SmartSEO: Applied ${appliedFixes.length} fix(es)\n\n${appliedFixes.map(f => `- ${f}`).join("\n")}`;
    const encodedContent = btoa(unescape(encodeURIComponent(content)));

    const commitRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        method: "PUT",
        headers: ghHeaders,
        body: JSON.stringify({
          message: commitMessage,
          content: encodedContent,
          sha: fileData.sha,
          branch: targetBranch,
        }),
      }
    );

    if (!commitRes.ok) {
      const errData = await commitRes.json();
      throw new Error(`Commit failed: ${errData.message || commitRes.status}`);
    }

    const commitData = await commitRes.json();
    console.log(`Commit successful: ${commitData.commit.sha}`);

    return new Response(
      JSON.stringify({
        success: true,
        commit: {
          sha: commitData.commit.sha,
          url: commitData.commit.html_url,
          message: commitMessage,
        },
        appliedFixes,
        skippedFixes,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("GitHub push error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
