<script lang="ts">
  import Meta from "@app/marketing/Meta.svelte";

  type Principle = {
    id: string;
    kicker: string;
    kickerMuted?: boolean;
    title: string;
  };

  const principles: Principle[] = [
    { id: "intro", kicker: "The Radicle Protocol", title: "How it works" },
    {
      id: "status-quo",
      kicker: "The Status Quo",
      kickerMuted: true,
      title: "Code lives on someone else’s server",
    },
    { id: "nodes", kicker: "Radicle", title: "Everyone runs a node" },
    {
      id: "identity",
      kicker: "Identity",
      title: "Your identity is a key pair",
    },
    {
      id: "networking",
      kicker: "Networking",
      title: "Gossip finds peers, Git moves the code",
    },
    {
      id: "trust",
      kicker: "Trust",
      title: "Every change is cryptographically signed",
    },
    {
      id: "collaboration",
      kicker: "Collaboration",
      title: "Issues and patches live inside the repo",
    },
  ];
</script>

<style>
  .principles {
    --node-neutral: var(--color-text-secondary);
    --node-blue: var(--color-accent-blue-500);
    --node-green: var(--color-accent-green-600);
    --node-purple: var(--color-accent-purple-500);
    --node-amber: var(--color-semantic-amber-500);
    --mesh-line: var(--color-border-strong);
  }

  .mono {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.8125rem;
    line-height: 1.6;
  }

  .principle {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 1.5rem;
    padding: 4rem 0;
  }

  .principle + .principle {
    border-top: 1px solid var(--color-border-subtle);
  }

  .principle-kicker {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-accent-blue-500);
  }

  .principle-kicker.muted {
    color: var(--color-text-quaternary);
  }

  .principle-title {
    font: var(--txt-bold-24);
    margin: 0;
    max-width: 42rem;
    color: var(--color-text-primary);
  }

  .principle-intro .principle-title {
    font: var(--txt-bold-32);
    letter-spacing: -0.02em;
    max-width: 30rem;
  }

  .slide-lead {
    font: var(--txt-medium-22);
    margin: 0;
    max-width: 34rem;
    color: var(--color-text-secondary);
  }

  .slide-divider {
    width: 9rem;
    height: 2px;
    margin-top: 0.5rem;
    background: var(--color-accent-blue-500);
    border-radius: var(--border-radius-round);
  }

  .slide-figure {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  .diagram {
    width: 100%;
    max-width: 24rem;
    height: auto;
  }

  .slide-caption {
    margin: 0;
    max-width: 38rem;
  }

  /* Network diagram elements — theme-aware via design tokens. */
  .mesh-line {
    stroke: var(--mesh-line);
    stroke-width: 1.5;
  }

  .hub-dot circle {
    fill: var(--node-neutral);
  }

  .hub-chip {
    fill: var(--color-surface-subtle);
    stroke: var(--color-border-mid);
    stroke-width: 1.5;
  }

  .hub-title {
    fill: var(--color-text-primary);
    font:
      600 15px Booton,
      sans-serif;
  }

  .hub-sub {
    fill: var(--color-text-tertiary);
    font:
      400 12px "JetBrains Mono",
      monospace;
  }

  .nd-blue {
    fill: var(--node-blue);
  }
  .nd-green {
    fill: var(--node-green);
  }
  .nd-purple {
    fill: var(--node-purple);
  }
  .nd-neutral {
    fill: var(--node-neutral);
  }

  .gossip-ring {
    fill: none;
    stroke: var(--node-blue);
    stroke-width: 1.5;
  }
  .gossip-ring-inner {
    stroke-opacity: 0.5;
  }
  .gossip-ring-outer {
    stroke-opacity: 0.25;
  }

  .id-key {
    width: 4rem;
    height: 4rem;
  }
  .id-key-bg {
    fill: var(--node-blue);
  }
  .id-key-fg {
    stroke: var(--color-neutrals-opaque-light-0);
    stroke-width: 3;
    fill: none;
    stroke-linecap: round;
  }

  /* Identity */
  .did-key {
    max-width: 100%;
    padding: 0.6rem 1rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--border-radius-small);
    background: var(--color-surface-subtle);
    overflow-x: auto;
    white-space: nowrap;
  }
  .did-prefix {
    color: var(--color-text-tertiary);
  }
  .did-value {
    color: var(--color-code-strings);
  }

  .id-points {
    list-style: none;
    margin: 0;
    padding: 0;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }
  .id-points li {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    font: var(--txt-medium-16);
  }
  .id-points strong {
    color: var(--color-text-primary);
    font-weight: 600;
  }
  .id-points .muted {
    color: var(--color-text-tertiary);
  }

  .dot {
    flex: none;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: var(--border-radius-round);
    transform: translateY(-0.1em);
  }
  .dot-green {
    background: var(--node-green);
  }
  .dot-amber {
    background: var(--node-amber);
  }
  .dot-purple {
    background: var(--node-purple);
  }

  /* Networking */
  .net-steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font: var(--txt-medium-18);
  }
  .net-steps li {
    color: var(--color-text-tertiary);
  }
  .net-steps .num {
    font-weight: 600;
    margin-right: 0.3rem;
  }
  .net-steps li:first-child {
    color: var(--color-accent-blue-500);
    font-weight: 600;
  }

  /* Trust */
  .trust-figure {
    position: relative;
    width: 100%;
    max-width: 30rem;
  }
  .ref-card {
    text-align: left;
    padding: 1.25rem 1.5rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--border-radius-regular);
    background: var(--color-surface-subtle);
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .ref-head {
    color: var(--color-code-keywords);
    font-weight: 600;
  }
  .ref-row {
    display: flex;
    gap: 0.75rem;
    overflow: hidden;
  }
  .ref-row .hash {
    color: var(--color-code-strings);
    flex: none;
  }
  .ref-row .ref-path {
    color: var(--color-text-tertiary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .signed-badge {
    position: absolute;
    right: -0.25rem;
    bottom: -1.25rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.35rem 0.35rem 0.35rem 0.9rem;
    border-radius: var(--border-radius-round);
    background: var(--color-surface-canvas);
  }
  .signed-check {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: var(--node-green);
    color: var(--color-neutrals-opaque-light-0);
  }

  /* Collaboration */
  .repo-card {
    width: 100%;
    max-width: 30rem;
    text-align: left;
    padding: 1.25rem 1.5rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--border-radius-regular);
    background: var(--color-surface-subtle);
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }
  .repo-head {
    color: var(--color-code-keywords);
    font-weight: 600;
  }
  .repo-rows {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .repo-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.7rem 0.9rem;
    border-radius: var(--border-radius-small);
    background: var(--color-surface-mid);
    font: var(--txt-medium-16);
  }
  .repo-row strong {
    color: var(--color-text-primary);
    font-weight: 600;
  }
  .repo-meta {
    margin-left: auto;
    color: var(--color-text-tertiary);
  }

  @media (max-width: 56rem) {
    .principle {
      padding: 2.5rem 0;
    }

    .diagram {
      max-width: 18rem;
    }

    .id-points {
      font-size: 0.9375rem;
    }
  }
</style>

<svelte:head>
  <title>How it works | Radicle</title>
</svelte:head>

<Meta
  title="How it works | Radicle"
  description="The core ideas behind Radicle." />

<main class="page-container principles">
  <header class="page-header">
    <h1 class="txt-bold-32">
      How it works. <span class="txt-color-tertiary">
        The core ideas behind Radicle.
      </span>
    </h1>
  </header>

  {#each principles as principle (principle.id)}
    <section class="principle" class:principle-intro={principle.id === "intro"}>
      <span
        class="principle-kicker txt-bold-14"
        class:muted={principle.kickerMuted}>
        {principle.kicker}
      </span>
      <h2 class="principle-title">{principle.title}</h2>

      {#if principle.id === "intro"}
        <p class="slide-lead">
          A sovereign, peer-to-peer network for code collaboration
        </p>
        <span class="slide-divider"></span>
      {:else if principle.id === "status-quo"}
        <div class="slide-figure">
          <svg
            class="diagram"
            viewBox="0 0 360 300"
            fill="none"
            aria-hidden="true">
            <g class="mesh-line">
              <line x1="180" y1="150" x2="180" y2="36" />
              <line x1="180" y1="150" x2="300" y2="92" />
              <line x1="180" y1="150" x2="60" y2="92" />
              <line x1="180" y1="150" x2="300" y2="210" />
              <line x1="180" y1="150" x2="60" y2="210" />
              <line x1="180" y1="150" x2="180" y2="266" />
            </g>
            <g class="hub-dot">
              <circle cx="180" cy="36" r="9" />
              <circle cx="300" cy="92" r="9" />
              <circle cx="60" cy="92" r="9" />
              <circle cx="300" cy="210" r="9" />
              <circle cx="60" cy="210" r="9" />
              <circle cx="180" cy="266" r="9" />
            </g>
            <rect
              class="hub-chip"
              x="116"
              y="124"
              width="128"
              height="52"
              rx="10" />
            <text class="hub-title" x="180" y="147" text-anchor="middle">
              Central forge
            </text>
            <text class="hub-sub" x="180" y="166" text-anchor="middle">
              GitHub · GitLab
            </text>
          </svg>
        </div>
        <p class="slide-caption txt-medium-18 txt-color-tertiary">
          Your issues, patches and identity are controlled by the platform.
        </p>
      {:else if principle.id === "nodes"}
        <div class="slide-figure">
          <svg
            class="diagram"
            viewBox="0 0 360 340"
            fill="none"
            aria-hidden="true">
            <g class="mesh-line">
              <line x1="180" y1="55" x2="274" y2="100" />
              <line x1="274" y1="100" x2="297" y2="202" />
              <line x1="297" y1="202" x2="232" y2="283" />
              <line x1="232" y1="283" x2="128" y2="283" />
              <line x1="128" y1="283" x2="63" y2="202" />
              <line x1="63" y1="202" x2="86" y2="100" />
              <line x1="86" y1="100" x2="180" y2="55" />
              <line x1="180" y1="55" x2="232" y2="283" />
              <line x1="274" y1="100" x2="128" y2="283" />
              <line x1="297" y1="202" x2="63" y2="202" />
              <line x1="180" y1="55" x2="297" y2="202" />
              <line x1="232" y1="283" x2="63" y2="202" />
              <line x1="128" y1="283" x2="86" y2="100" />
            </g>
            <circle
              class="nd-blue"
              cx="180"
              cy="55"
              r="20"
              fill-opacity="0.13" />
            <circle
              class="nd-green"
              cx="274"
              cy="100"
              r="20"
              fill-opacity="0.13" />
            <circle
              class="nd-purple"
              cx="297"
              cy="202"
              r="20"
              fill-opacity="0.13" />
            <circle
              class="nd-blue"
              cx="232"
              cy="283"
              r="20"
              fill-opacity="0.13" />
            <circle
              class="nd-green"
              cx="128"
              cy="283"
              r="20"
              fill-opacity="0.13" />
            <circle
              class="nd-purple"
              cx="63"
              cy="202"
              r="20"
              fill-opacity="0.13" />
            <circle
              class="nd-blue"
              cx="86"
              cy="100"
              r="20"
              fill-opacity="0.13" />
            <circle class="nd-blue" cx="180" cy="55" r="9" />
            <circle class="nd-green" cx="274" cy="100" r="9" />
            <circle class="nd-purple" cx="297" cy="202" r="9" />
            <circle class="nd-blue" cx="232" cy="283" r="9" />
            <circle class="nd-green" cx="128" cy="283" r="9" />
            <circle class="nd-purple" cx="63" cy="202" r="9" />
            <circle class="nd-blue" cx="86" cy="100" r="9" />
          </svg>
        </div>
        <p class="slide-caption txt-medium-18 txt-color-tertiary">
          No central server. Each node hosts and shares Git repositories
          directly with peers.
        </p>
      {:else if principle.id === "identity"}
        <div class="slide-figure">
          <svg
            class="id-key"
            viewBox="0 0 64 64"
            fill="none"
            aria-hidden="true">
            <circle class="id-key-bg" cx="32" cy="32" r="24" />
            <g class="id-key-fg">
              <circle cx="26" cy="32" r="5.5" />
              <path d="M31 32 H44" />
              <path d="M40 32 V37" />
              <path d="M44 32 V37" />
            </g>
          </svg>
        </div>
        <div class="did-key mono">
          <span class="did-prefix">did:key:</span>
          <span class="did-value">
            z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK
          </span>
        </div>
        <ul class="id-points">
          <li>
            <span class="dot dot-green"></span>
            <span>
              <strong>Generated offline</strong>
              <span class="muted">— no email, no account, no permission</span>
            </span>
          </li>
          <li>
            <span class="dot dot-green"></span>
            <span>
              <strong>Your public key is your Node ID</strong>
              <span class="muted">— the same across every device</span>
            </span>
          </li>
          <li>
            <span class="dot dot-green"></span>
            <span>
              <strong>Sign every action</strong>
              <span class="muted">— so peers can verify it’s really you</span>
            </span>
          </li>
        </ul>
      {:else if principle.id === "networking"}
        <div class="slide-figure">
          <svg
            class="diagram"
            viewBox="0 0 360 360"
            fill="none"
            aria-hidden="true">
            <g class="mesh-line">
              <line x1="239" y1="73" x2="298" y2="175" />
              <line x1="298" y1="175" x2="239" y2="277" />
              <line x1="239" y1="277" x2="121" y2="277" />
              <line x1="121" y1="277" x2="62" y2="175" />
              <line x1="62" y1="175" x2="121" y2="73" />
              <line x1="121" y1="73" x2="239" y2="73" />
              <line x1="239" y1="73" x2="239" y2="277" />
              <line x1="298" y1="175" x2="121" y2="277" />
              <line x1="298" y1="175" x2="121" y2="73" />
              <line x1="239" y1="277" x2="62" y2="175" />
              <line x1="121" y1="277" x2="121" y2="73" />
              <line x1="62" y1="175" x2="239" y2="73" />
            </g>
            <circle
              class="gossip-ring gossip-ring-outer"
              cx="180"
              cy="175"
              r="84" />
            <circle
              class="gossip-ring gossip-ring-inner"
              cx="180"
              cy="175"
              r="48" />
            <circle class="nd-neutral" cx="239" cy="73" r="10" />
            <circle class="nd-neutral" cx="298" cy="175" r="10" />
            <circle class="nd-neutral" cx="239" cy="277" r="10" />
            <circle class="nd-neutral" cx="121" cy="277" r="10" />
            <circle class="nd-neutral" cx="62" cy="175" r="10" />
            <circle class="nd-neutral" cx="121" cy="73" r="10" />
            <circle
              class="nd-blue"
              cx="180"
              cy="175"
              r="22"
              fill-opacity="0.15" />
            <circle class="nd-blue" cx="180" cy="175" r="11" />
          </svg>
        </div>
        <ol class="net-steps">
          <li>
            <span class="num">1.</span>
            Announce updates over gossip
          </li>
          <li>
            <span class="num">2.</span>
            Replicate the data with Git’s own transfer protocol
          </li>
        </ol>
      {:else if principle.id === "trust"}
        <div class="slide-figure">
          <div class="trust-figure">
            <div class="ref-card mono">
              <div class="ref-head">refs/rad/sigrefs</div>
              <div class="ref-row">
                <span class="hash">9767b485c2aad1e2</span>
                <span class="ref-path">refs/heads/master</span>
              </div>
              <div class="ref-row">
                <span class="hash">f3eaa7454e3a4714</span>
                <span class="ref-path">refs/cobs/xyz.radicle.patch/…</span>
              </div>
              <div class="ref-row">
                <span class="hash">0590b78ee42b3908</span>
                <span class="ref-path">refs/cobs/xyz.radicle.issue/…</span>
              </div>
            </div>
            <div class="signed-badge">
              <span class="signed-label txt-bold-16">Signed</span>
              <span class="signed-check">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
            </div>
          </div>
        </div>
        <p class="slide-caption txt-medium-18 txt-color-tertiary">
          Repositories are self-certifying — anyone can verify authenticity
          without trusting a central authority.
        </p>
      {:else if principle.id === "collaboration"}
        <div class="slide-figure">
          <div class="repo-card">
            <div class="repo-head mono">rad:z3gqcJUoA1n9…</div>
            <div class="repo-rows">
              <div class="repo-row">
                <span class="dot dot-green"></span>
                <strong>Code</strong>
                <span class="repo-meta mono">commits &amp; branches</span>
              </div>
              <div class="repo-row">
                <span class="dot dot-amber"></span>
                <strong>Issues</strong>
                <span class="repo-meta mono">xyz.radicle.issue</span>
              </div>
              <div class="repo-row">
                <span class="dot dot-purple"></span>
                <strong>Patches</strong>
                <span class="repo-meta mono">xyz.radicle.patch</span>
              </div>
            </div>
          </div>
        </div>
        <p class="slide-caption txt-medium-18 txt-color-tertiary">
          Collaborative Objects are local-first, user-owned and signed — just
          like your code.
        </p>
      {/if}
    </section>
  {/each}
</main>
