import type { BaseUrl, CommitHeader } from "@http-client";

import { getDaysPassed } from "@app/lib/utils";
import { HttpdClient } from "@http-client";

// A set of commits grouped by time.
interface CommitGroup {
  date: string;
  time: number;
  commits: CommitHeader[];
  week: number;
}

export interface WeeklyActivity {
  date: string;
  time: number;
  commits: number[];
  week: number;
}

function formatGroupTime(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    day: "numeric",
    weekday: "long",
    month: "long",
    year: "numeric",
  });
}

export function groupCommits(commits: CommitHeader[]): CommitGroup[] {
  const groupedCommits: CommitGroup[] = [];
  let groupDate: Date | undefined = undefined;

  commits = commits.sort((a, b) => {
    if (a.committer.time > b.committer.time) {
      return -1;
    } else if (a.committer.time < b.committer.time) {
      return 1;
    }

    return 0;
  });

  for (const commit of commits) {
    const time = commit.committer.time * 1000;
    const date = new Date(time);
    const isNewDay =
      !groupedCommits.length ||
      !groupDate ||
      date.getDate() < groupDate.getDate() ||
      date.getMonth() < groupDate.getMonth() ||
      date.getFullYear() < groupDate.getFullYear();

    if (isNewDay) {
      groupedCommits.push({
        date: formatGroupTime(time),
        time,
        commits: [],
        week: 0,
      });
      groupDate = date;
    }
    groupedCommits[groupedCommits.length - 1].commits.push(commit);
  }
  return groupedCommits;
}

function groupCommitsByWeek(commits: number[]): WeeklyActivity[] {
  const groupedCommits: WeeklyActivity[] = [];
  let groupDate: Date | undefined = undefined;

  if (commits.length === 0) {
    return [];
  }

  commits = commits.sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));

  // A accumulator that increments by the amount of weeks between weekly commit groups
  let weekAccumulator = Math.floor(
    getDaysPassed(new Date(commits[0] * 1000), new Date()) / 7,
  );

  // Loops over all commits and stores them by week with some additional metadata in groupedCommits.
  for (const commit of commits) {
    const time = commit * 1000;
    const date = new Date(time);
    const isNewWeek =
      !groupedCommits.length ||
      !groupDate ||
      getDaysPassed(date, groupDate) > 7 ||
      date.getFullYear() < groupDate.getFullYear();

    if (isNewWeek) {
      let daysPassed = 0;
      if (groupDate) {
        daysPassed = getDaysPassed(date, groupDate);
      }
      groupedCommits.push({
        date: formatGroupTime(time),
        time,
        commits: [],
        week: Math.floor(daysPassed / 7) + weekAccumulator,
      });
      groupDate = date;
      weekAccumulator += Math.floor(daysPassed / 7);
    }
    groupedCommits[groupedCommits.length - 1].commits.push(commit);
  }

  return groupedCommits;
}

export async function loadRepoActivity(
  id: string,
  baseUrl: BaseUrl,
  signal?: AbortSignal,
) {
  const api = new HttpdClient(baseUrl);
  const timeout = AbortSignal.timeout(8000);
  const abort = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const commits = await api.repo.getActivity(id, { abort });

  return groupCommitsByWeek(commits.activity);
}
