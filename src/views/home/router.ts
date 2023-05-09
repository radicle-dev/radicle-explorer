import type { LoadError } from "@app/lib/router/definitions";
import type { ProjectBaseUrl } from "@app/lib/search";
import type { WeeklyActivity } from "@app/lib/commit";

import { config } from "@app/lib/config";
import { getProjectsFromSeeds } from "@app/lib/search";
import { loadProjectActivity } from "@app/lib/commit";

export interface ProjectBaseUrlActivity extends ProjectBaseUrl {
  activity: WeeklyActivity[];
}

export interface HomeRoute {
  resource: "home";
}

export interface HomeLoadedRoute {
  resource: "home";
  params: { projects: ProjectBaseUrlActivity[] };
}

export async function loadHomeRoute(): Promise<HomeLoadedRoute | LoadError> {
  try {
    const projects = await getProjectsFromSeeds(config.projects.pinned);
    const results = await Promise.all(
      projects.map(async projectSeed => {
        const activity = await loadProjectActivity(
          projectSeed.project.id,
          projectSeed.baseUrl,
        );
        return {
          ...projectSeed,
          activity,
        };
      }),
    );

    return { resource: "home", params: { projects: results } };
  } catch (error: any) {
    return {
      resource: "loadError",
      params: {
        errorMessage: "Could not load pinned projects.",
        stackTrace: error.stack,
      },
    };
  }
}
