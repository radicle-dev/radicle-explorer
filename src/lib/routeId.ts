// Helpers for classifying SvelteKit route ids (`page.route.id`).

const repoRoutePrefix = "/nodes/[host]/[repo=repo_id]";

export function isRepoRouteId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith(repoRoutePrefix);
}

export function isExploreRouteId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith("/explore");
}

// Repo routes that render COBs (issues, patches) or commits. Their views
// depend on up-to-date repo metadata, e.g. issue and patch counts.
export function isCobRouteId(id: string | null | undefined): boolean {
  return (
    typeof id === "string" &&
    isRepoRouteId(id) &&
    ["/issues", "/patches", "/commits"].some(section => id.includes(section))
  );
}
