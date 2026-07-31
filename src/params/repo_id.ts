import type { ParamMatcher } from "@sveltejs/kit";

// `users` is a reserved segment under `/nodes/<host>/`; everything else is
// treated as a repository id (RID or alias).
export const match: ParamMatcher = param => param !== "users";
