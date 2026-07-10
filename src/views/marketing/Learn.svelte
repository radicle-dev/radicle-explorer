<script lang="ts">
  import Meta from "@app/views/marketing/Meta.svelte";
  import Button from "@app/views/marketing/Button.svelte";

  import { guides } from "@app/views/marketing/guides";
  import { link } from "@app/views/marketing/link";

  const learnGuides = [guides[0], guides[2], guides[3]];
</script>

<style>
  h1 {
    max-width: 50rem;
  }

  .section {
    padding-top: var(--section-gap);
  }

  /* Tighten the intro "How it works" section: its top gap (from the page
     header) and its bottom gap (the following Guides section's top padding). */
  #basics.section,
  #guides.section {
    padding-top: 4rem;
  }

  #basics .section-header {
    margin-bottom: 0;
  }

  #basics .section-header h2 {
    margin-bottom: 0;
  }

  #basics .section-all {
    margin-top: 1rem;
  }

  .basics-layout {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 3rem;
    align-items: center;
  }

  .basics-figure {
    --node-blue: var(--color-accent-blue-500);
    --node-green: var(--color-accent-green-600);
    --node-purple: var(--color-accent-purple-500);
    --mesh-line: var(--color-border-strong);
  }

  .basics-figure .diagram {
    width: 100%;
    height: auto;
  }

  .basics-figure .mesh-line {
    stroke: var(--mesh-line);
    stroke-width: 1.5;
  }

  .basics-figure .nd-blue {
    fill: var(--node-blue);
  }
  .basics-figure .nd-green {
    fill: var(--node-green);
  }
  .basics-figure .nd-purple {
    fill: var(--node-purple);
  }

  @media (max-width: 56rem) {
    .basics-layout {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .basics-figure {
      max-width: 16rem;
    }
  }

  .section:last-child {
    padding-bottom: var(--section-gap);
  }

  .section-header {
    margin-bottom: 1.5rem;
  }

  .section-header h2 {
    margin-bottom: 0.5rem;
  }

  .section-header p {
    margin: 0;
  }

  .faq-row {
    --product-card-gap: 1.5rem;
    align-items: stretch;
  }

  .faq-row .product-card {
    position: relative;
    display: flex;
    padding: 1.5rem;
    border-radius: var(--border-radius-small);
    background: var(--color-surface-subtle);
  }

  .faq-row .product-card-text {
    flex: 1;
    padding-right: 0;
  }

  .faq-row .product-title {
    font: var(--txt-bold-16);
  }

  .faq-row .product-description {
    margin-bottom: 0;
  }

  .faq-row .product-link {
    margin-top: auto;
    padding-top: 1.25rem;
  }

  /* Stretch the read-more link across the card so the whole box is clickable. */
  .faq-row .product-link::after {
    content: "";
    position: absolute;
    inset: 0;
  }

  .product-link {
    font: var(--txt-bold-14);
  }

  .guide-thumbs {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    margin-top: 2rem;
  }

  .section-all {
    display: inline-flex;
    margin-top: 2.5rem;
    font: var(--txt-bold-18);
  }

  .guide-thumb {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    text-decoration: none;
  }

  .guide-thumb-image {
    width: 100%;
    aspect-ratio: 1 / 1.2;
    object-fit: cover;
    border-radius: var(--border-radius-small);
    background: var(--color-surface-subtle);
    margin-bottom: 0.25rem;
  }

  .guide-thumb-title {
    color: var(--color-text-primary);
  }

  .guide-thumb:hover .link-arrow-right {
    transform: translateX(0.15rem);
  }

  .guide-thumb:hover .link-arrow-up-right {
    transform: translate(0.15rem, -0.15rem);
  }

  .guide-thumb-description {
    color: var(--color-text-tertiary);
  }

  @media (max-width: 40rem) {
    .guide-thumbs {
      grid-template-columns: 1fr;
    }

    .section-all {
      font: var(--txt-bold-16);
    }
  }

  .garden-banner {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    margin: var(--section-gap) 0;
    padding: 1.5rem;
    min-height: 25.5rem;
    background:
      url("/images/garden.png") no-repeat right center,
      var(--color-accent-citrus-500);
    background-size: cover;
    border-radius: 0.25rem;
  }

  .garden-title {
    max-width: 28rem;
    color: var(--color-neutrals-opaque-dark-0);
  }

  .garden-bottom {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-end;
  }

  .garden-description {
    max-width: 25rem;
    margin: 0;
    color: var(--color-neutrals-opaque-dark-0);
  }

  @media (max-width: 90rem) {
    #basics.section,
    #guides.section {
      padding-top: 2rem;
    }
  }
  @media (max-width: 64rem) {
    #basics.section,
    #guides.section {
      padding-top: 1.5rem;
    }

    .garden-banner {
      min-height: auto;
    }

    .garden-bottom {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
  }
</style>

<svelte:head>
  <title>Learn | Radicle</title>
</svelte:head>

<Meta
  title="Learn | Radicle"
  description="Everything you need to understand, set up, and build on the sovereign code network." />

<main class="page-container">
  <h1 class="txt-bold-32">
    Learn Radicle. <span class="txt-color-tertiary">
      Everything you need to understand, set up, and build on the sovereign code
      network.
    </span>
  </h1>

  <section id="basics" class="section">
    <div class="basics-layout">
      <div class="basics-figure" aria-hidden="true">
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
          <circle class="nd-blue" cx="180" cy="55" r="20" fill-opacity="0.13" />
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
          <circle class="nd-blue" cx="86" cy="100" r="20" fill-opacity="0.13" />
          <circle class="nd-blue" cx="180" cy="55" r="9" />
          <circle class="nd-green" cx="274" cy="100" r="9" />
          <circle class="nd-purple" cx="297" cy="202" r="9" />
          <circle class="nd-blue" cx="232" cy="283" r="9" />
          <circle class="nd-green" cx="128" cy="283" r="9" />
          <circle class="nd-purple" cx="63" cy="202" r="9" />
          <circle class="nd-blue" cx="86" cy="100" r="9" />
        </svg>
      </div>
      <div class="basics-text">
        <div class="section-header">
          <h2 class="txt-bold-24">How it works</h2>
          <p class="txt-bold-24 txt-color-tertiary">
            The core ideas behind Radicle.
          </p>
        </div>
        <a
          href="/principles"
          class="section-all product-link arrow-link"
          use:link>
          Learn the basics <span class="link-arrow link-arrow-right">→</span>
        </a>
      </div>
    </div>
  </section>

  <section id="guides" class="section">
    <div class="section-header">
      <h2 class="txt-bold-24">Guides</h2>
      <p class="txt-medium-16 txt-color-tertiary">
        Step-by-step tutorials that walk you through Radicle, from your first
        repository to running infrastructure.
      </p>
    </div>
    <div class="guide-thumbs">
      {#each learnGuides as guide}
        <a
          class="guide-thumb"
          href={guide.href}
          target={guide.external ? "_blank" : undefined}
          rel={guide.external ? "noopener noreferrer" : undefined}
          use:link>
          <img class="guide-thumb-image" src={guide.image} alt="" />
          <span class="guide-thumb-title txt-bold-16">
            {guide.title}
            {#if guide.external}
              <span class="link-arrow link-arrow-up-right">↗</span>
            {:else}
              <span class="link-arrow link-arrow-right">→</span>
            {/if}
          </span>
          <span class="guide-thumb-description txt-medium-14">
            {guide.description}
          </span>
        </a>
      {/each}
    </div>
    <a href="/guides" class="section-all product-link arrow-link" use:link>
      View all guides <span class="link-arrow link-arrow-right">→</span>
    </a>
  </section>

  <section class="section">
    <div class="section-header">
      <h2 class="txt-bold-24">FAQ</h2>
      <p class="txt-medium-16 txt-color-tertiary">
        Answers to the most common questions about Radicle. What it is, how it
        compares to GitHub, and the technical details behind the protocol.
      </p>
    </div>
    <div class="card-row faq-row">
      <article class="product-card">
        <div class="product-card-text">
          <strong class="product-title">General Questions</strong>
          <span class="product-description">
            What is Radicle and how is it different from GitHub? Who’s building
            it, how many people use it, and what’s the project’s history.
          </span>
          <a
            href="/faq#general-questions"
            class="product-link arrow-link"
            use:link>
            Read general FAQ <span class="link-arrow link-arrow-right">→</span>
          </a>
        </div>
      </article>
      <article class="product-card">
        <div class="product-card-text">
          <strong class="product-title">Technical Questions</strong>
          <span class="product-description">
            What does “peer-to-peer” mean in practice? Why not just use Git
            directly? How does identity work without accounts? The technical
            reasoning explained.
          </span>
          <a
            href="/faq#technical-questions"
            class="product-link arrow-link"
            use:link>
            Read technical FAQ <span class="link-arrow link-arrow-right">
              →
            </span>
          </a>
        </div>
      </article>
    </div>
    <a href="/faq" class="section-all product-link arrow-link" use:link>
      All FAQ <span class="link-arrow link-arrow-right">→</span>
    </a>
  </section>

  <section class="garden-banner">
    <h2 class="txt-bold-32 garden-title">
      Introducing Radicle Garden. The quickest way to get started on the
      network.
    </h2>
    <div class="garden-bottom">
      <p class="txt-medium-16 garden-description">
        Get started in minutes—no servers required. Instantly share code and
        discover new projects.
      </p>
      <Button
        href="https://radicle.garden"
        variant="white"
        target="_blank"
        rel="noopener noreferrer">
        Visit radicle.garden
        <span class="link-arrow link-arrow-up-right">↗</span>
      </Button>
    </div>
  </section>
</main>
