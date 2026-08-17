<script lang="ts">
  import GithubUptimeChart from "@app/marketing/GithubUptimeChart.svelte";
  import Meta from "@app/marketing/Meta.svelte";

  import { link } from "@app/marketing/link";

  import snapshot from "@app/marketing/data/github-uptime.json";

  const stats = [
    { label: "Lifetime", value: snapshot.lifetime, tone: "plain" },
    { label: "Best 90 days", value: snapshot.best.uptime, tone: "good" },
    { label: "Worst 90 days", value: snapshot.worst.uptime, tone: "bad" },
    { label: "Latest 90 days", value: snapshot.latest.uptime, tone: "bad" },
  ];

  // The downtime the lifetime figure adds up to, in whole days, so the percentage
  // lands as something a reader can picture.
  const downtimeDays = Math.round(
    ((100 - snapshot.lifetime) / 100) * snapshot.series.length,
  );

  const snapshotDate = new Date(snapshot.generatedAt).toLocaleDateString(
    "en-US",
    { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" },
  );

  function formatDay(day: string): string {
    return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "long",
      year: "numeric",
    });
  }

  const differences = [
    {
      title: "No central server",
      body: "Every node holds a full copy of the repository. When one goes offline, the others keep serving it.",
    },
    {
      title: "Local-first by default",
      body: "Your repository, issues and patches live on your machine. Reading and writing them never needs a network round trip.",
    },
    {
      title: "Nothing to be locked out of",
      body: "Your identity is a key pair you generated. No account to suspend, no organisation to lose access to.",
    },
  ];
</script>

<style>
  .page-title {
    max-width: 40rem;
  }

  .lede {
    font: var(--txt-medium-16);
    color: var(--color-text-tertiary);
    max-width: 40rem;
    margin: 0;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 1rem 1.25rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--border-radius-small);
    background-color: var(--color-surface-base);
  }

  .stat-value {
    font: var(--txt-bold-32);
    color: var(--color-text-primary);
  }

  .stat-value.good {
    color: var(--color-accent-green-700);
  }

  .stat-value.bad {
    color: var(--color-semantic-red-700);
  }

  .stat-label {
    font: var(--txt-medium-16);
    color: var(--color-text-tertiary);
  }

  .method {
    font: var(--txt-medium-16);
    color: var(--color-text-tertiary);
    max-width: 52rem;
    margin: 1.25rem 0 0;
  }

  .credit {
    font: var(--txt-medium-16);
    color: var(--color-text-tertiary);
    max-width: 52rem;
    margin: 0.5rem 0 0;
  }

  /* Set the link colour here rather than leaning on the site-wide default, which
     is gated behind `:-webkit-any-link` and leaves these blending into the
     surrounding body text. */
  .credit a {
    color: var(--color-text-primary);
  }

  section + section {
    margin-top: 5rem;
  }

  .section-title {
    font: var(--txt-bold-24);
    color: var(--color-text-primary);
    margin: 0 0 2rem;
  }

  .intro {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .differences {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }

  .difference-title {
    font: var(--txt-bold-18);
    color: var(--color-text-primary);
    margin: 0 0 0.5rem;
  }

  .difference-body {
    font: var(--txt-medium-16);
    color: var(--color-text-tertiary);
    margin: 0;
  }

  .cta {
    display: flex;
    gap: 2rem;
    align-items: center;
    margin-top: 2.5rem;
  }

  @media (max-width: 64rem) {
    .stats {
      grid-template-columns: repeat(2, 1fr);
    }

    .differences {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
  }
</style>

<svelte:head>
  <title>Is GitHub down? GitHub uptime and outage history | Radicle</title>
</svelte:head>

<Meta
  title="Is GitHub down? GitHub uptime and outage history | Radicle"
  description="GitHub is down more than you think. Since June 2022 its own status page has reported an active incident {(
    100 - snapshot.lifetime
  ).toFixed(
    2,
  )}% of the time, across {snapshot.incidents} incidents. See the full GitHub downtime history, and why Radicle has no central server to take down." />

<main class="page-container">
  <header class="page-header">
    <h1 class="page-title txt-bold-32">Can’t go down if there’s no server.</h1>
  </header>

  <section>
    <div class="intro">
      <p class="lede">
        Since June 2022, GitHub’s own status page has reported an active
        incident
        {(100 - snapshot.lifetime).toFixed(2)}% of the time, across {snapshot.incidents}
        separate incidents. That adds up to more than {downtimeDays} days of degraded
        or unavailable service.
      </p>
      <p class="lede">Radicle has no central server to take down.</p>
    </div>

    <div class="stats">
      {#each stats as stat (stat.label)}
        <div class="stat">
          <div
            class="stat-value"
            class:good={stat.tone === "good"}
            class:bad={stat.tone === "bad"}>
            {stat.value.toFixed(2)}%
          </div>
          <div class="stat-label">{stat.label}</div>
        </div>
      {/each}
    </div>

    <GithubUptimeChart
      series={snapshot.series}
      startDay={snapshot.startDay}
      best={snapshot.best}
      worst={snapshot.worst}
      latest={snapshot.latest} />

    <p class="method">
      GitHub uptime over a 90-day rolling window, with overlapping incidents
      merged so concurrent ones are not counted twice. “Downtime” here means
      GitHub’s status page listed at least one active incident that was not
      scheduled maintenance, so a single degraded service counts the same as a
      full GitHub outage. These are fixed figures, not a live status feed: they
      cover {snapshot.incidents} incidents between {formatDay(
        snapshot.startDay,
      )}
      and {formatDay(snapshot.latest.day)}, from a snapshot taken {snapshotDate}.
    </p>

    <!-- prettier-ignore -->
    <p class="credit">
      GitHub outage data comes from
      <a href="https://mrshu.github.io/github-statuses" target="_blank" rel="noopener">the missing GitHub status page</a>
      by
      <a href="https://mrshu.github.io" target="_blank" rel="noopener">Marek Šuppa</a>.
    </p>
  </section>

  <section>
    <h2 class="section-title">Why Radicle doesn’t have this problem</h2>
    <div class="differences">
      {#each differences as difference (difference.title)}
        <div>
          <h3 class="difference-title">{difference.title}</h3>
          <p class="difference-body">{difference.body}</p>
        </div>
      {/each}
    </div>

    <div class="cta">
      <a href="/install" class="product-link arrow-link" use:link>
        Install Radicle
        <span class="link-arrow link-arrow-right" aria-hidden="true">→</span>
      </a>
      <a href="/principles" class="product-link arrow-link" use:link>
        How it works
        <span class="link-arrow link-arrow-right" aria-hidden="true">→</span>
      </a>
    </div>
  </section>
</main>
