<script lang="ts">
  import dompurify from "dompurify";
  import matter from "@radicle/gray-matter";
  import { afterUpdate } from "svelte";
  import { toDom } from "hast-util-to-dom";

  import * as router from "@app/lib/router";
  import * as modal from "@app/lib/modal";
  import ErrorModal from "@app/modals/ErrorModal.svelte";
  import { activeUnloadedRouteStore } from "@app/lib/router";
  import { highlight } from "@app/lib/syntax";
  import { mimes } from "@app/lib/file";
  import {
    isUrl,
    twemoji,
    scrollIntoView,
    canonicalize,
    isCommit,
  } from "@app/lib/utils";
  import { Renderer, markdown } from "@app/lib/markdown";

  export let content: string;
  export let path: string = "/";
  export let rawPath: string;
  // If true, add <br> on a single line break
  export let breaks: boolean = false;

  let container: HTMLElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let frontMatter: [string, any][] | undefined = undefined;

  $: {
    try {
      const doc = matter(content);
      content = doc.content;
      frontMatter = Object.entries(doc.data).filter(
        ([, val]) => typeof val === "string" || typeof val === "number",
      );
    } catch (error) {
      if (error instanceof Error) {
        modal.show({
          component: ErrorModal,
          props: {
            title: "Not able to parse frontmatter",
            subtitle: [
              "There was an error while trying to parse the frontmatter in this document.",
              "Check your dev console logs for details.",
            ],
            error: {
              message: error.message,
              stack: error.stack,
            },
          },
        });
      }
    }
  }

  /**
   * Do internal navigation for clicks on anchor elements if possible
   */
  function navigateInternalOnAnchor(event: MouseEvent) {
    if (router.useDefaultNavigation(event)) {
      return;
    }

    let url: URL;
    if (!(event.target instanceof HTMLAnchorElement)) {
      return;
    }
    const href = event.target?.getAttribute("href");
    if (href === null || href.startsWith("#")) {
      return;
    }

    try {
      url = new URL(href, window.location.href);
    } catch {
      return;
    }

    if (url.origin === window.origin) {
      event.preventDefault();
      void router.navigateToUrl("push", url);
    }
  }

  function render(content: string): string {
    return dompurify.sanitize(
      markdown({
        katex: true,
        emojis: true,
        footnotes: true,
        linkify: true,
      }).parse(content, {
        renderer: new Renderer($activeUnloadedRouteStore),
        breaks,
      }) as string,
    );
  }

  afterUpdate(async () => {
    for (const e of container.querySelectorAll("a")) {
      try {
        const url = new URL(e.href);
        if (url.origin !== window.origin) {
          e.target = "_blank";
        }
      } catch (e) {
        console.warn("Not able to parse url", e);
      }

      const anchorHref = e.getAttribute("href");

      // If the anchor is an oid embed
      if (anchorHref && isCommit(anchorHref)) {
        const url = new URL(rawPath);
        // deprecated with httpd 0.18.1
        // For older httpd versions we still pass the mime type.
        // On newer radicle-httpd instances we try to infer the file type on httpd.
        const fileExtension = e.innerText.split(".").pop();
        if (fileExtension && fileExtension in mimes) {
          url.search = `?mime=${mimes[fileExtension]}`;
        }
        url.pathname = canonicalize(`blobs/${anchorHref}`, url.pathname);
        e.setAttribute("href", url.toString());

        // To determine the filetype of the embed we query the content-type of the resource URL.
        const req = await fetch(url, { method: "HEAD" });
        const mimeType = req.headers.get("Content-Type");

        // Embed an img element below the link
        if (mimeType?.startsWith("image")) {
          const element = document.createElement("img");
          element.setAttribute("src", url.toString());
          element.style.display = "block";
          e.style.display = "block";
          e.insertAdjacentElement("afterend", element);
          // Embed an iframe to display pdf correctly element below the link
        } else if (mimeType?.startsWith("application/pdf")) {
          const element = document.createElement("embed");
          element.setAttribute("src", url.toString());
          element.type = mimeType;
          element.style.overflow = "scroll";
          element.style.height = "40rem";
          element.style.overscrollBehavior = "contain";
          e.style.display = "block";
          e.insertAdjacentElement("afterend", element);
        } else if (mimeType?.startsWith("video")) {
          const element = document.createElement("video");
          const node = document.createElement("source");
          node.src = url.toString();
          element.controls = true;
          node.type = mimeType;
          element.style.width = "100%";
          e.style.display = "block";
          element.appendChild(node);
          e.insertAdjacentElement("afterend", element);
        } else if (mimeType?.startsWith("audio")) {
          const element = document.createElement("audio");
          element.style.display = "block";
          element.src = url.toString();
          element.controls = true;
          e.style.display = "block";
          e.insertAdjacentElement("afterend", element);
        } else {
          console.warn(`Not able to provide a preview for this file.`);
        }

        continue;
      }

      // Don't underline <a> tags that contain images.
      // Make an exception for emojis.
      if (
        e.firstElementChild instanceof HTMLImageElement &&
        !e.firstElementChild.classList.contains("txt-emoji")
      ) {
        e.classList.add("no-underline");
      }
    }

    // Replace standard HTML checkboxes with our custom radicle-icon-small element
    for (const i of container.querySelectorAll('input[type="checkbox"]')) {
      i.parentElement?.classList.add("task-item");

      const checkbox = document.createElement("radicle-icon-small");
      const checked = i.getAttribute("checked");
      checkbox.setAttribute(
        "name",
        checked === null ? "checkbox-unchecked" : "checkbox-checked",
      );
      i.insertAdjacentElement("beforebegin", checkbox);
      i.remove();
    }

    // Iterate over all images, and replace the source with a canonicalized URL
    // pointing at the repos /raw endpoint.
    for (const i of container.querySelectorAll("img")) {
      const imagePath = i.getAttribute("src");
      const imageClass = i.getAttribute("class");

      // Make sure the source isn't a URL before trying to fetch it from the repo
      const emoji = imageClass && imageClass === "txt-emoji";
      if (imagePath && !isUrl(imagePath) && !emoji) {
        i.setAttribute("src", `${rawPath}/${canonicalize(imagePath, path)}`);
      }
    }

    // Replaces code blocks in the background with highlighted code.
    const prefix = "language-";
    const nodes = Array.from(document.body.querySelectorAll("pre code"));

    const treeChanges: Promise<void>[] = [];

    for (const node of nodes) {
      const preElement = node.parentElement as HTMLElement;
      const copyButton = document.createElement("radicle-clipboard");
      copyButton.setAttribute("text", node.textContent || "");
      // Create a wrapper around the pre element,
      // so we can position the copy button that works even when scrolling horizontally.
      const preWrapper = document.createElement("div");
      preWrapper.classList.add("pre-wrapper");
      preElement.parentNode?.insertBefore(preWrapper, preElement);
      preWrapper.appendChild(preElement);
      preWrapper.appendChild(copyButton);

      const className = Array.from(node.classList).find(name =>
        name.startsWith(prefix),
      );
      if (!className) continue;

      treeChanges.push(
        highlight(node.textContent ?? "", className.slice(prefix.length))
          .then(tree => {
            if (tree) {
              node.replaceChildren(toDom(tree, { fragment: true }));
            }
          })
          .catch(e => console.warn("Not able to highlight code block", e)),
      );
    }

    await Promise.allSettled(treeChanges);

    if (window.location.hash) {
      scrollIntoView(window.location.hash.substring(1));
    }
  });
</script>

<style>
  :global(html) {
    scroll-padding-top: 4rem;
  }
  .markdown {
    word-break: break-word;
  }
  .front-matter {
    font-size: var(--font-size-tiny);
    font-family: var(--font-family-monospace);
    border: 1px dashed var(--color-border-default);
    padding: 0.5rem;
    margin-bottom: 2rem;
  }
  .front-matter table {
    border-collapse: collapse;
  }
  .front-matter table td {
    padding: 0.125rem 1rem;
  }
  .front-matter table td:first-child {
    padding-left: 0.5rem;
  }

  .markdown :global(h1) {
    font-size: calc(var(--font-size-x-large) * 0.75);
    font-weight: var(--font-weight-semibold);
    padding: 1rem 0 0.5rem 0;
    margin: 0 0 0.75rem;
    border-bottom: 1px solid var(--color-border-hint);
  }

  .markdown :global(h2) {
    font-size: var(--font-size-medium);
    font-weight: var(--font-weight-regular);
    padding: 0.25rem 0;
    margin: 2rem 0 0.5rem;
    border-bottom: 1px solid var(--color-border-hint);
  }

  .markdown :global(.pre-wrapper) {
    position: relative;
    margin: 1rem 0;
  }

  .markdown :global(radicle-clipboard) {
    display: none;
    position: absolute;
    right: 0.5rem;
    top: 0.5rem;
  }

  .markdown :global(radicle-clipboard) {
    background-color: var(--color-fill-ghost);
    border-radius: var(--border-radius-small);
  }

  .markdown :global(.pre-wrapper:hover > radicle-clipboard) {
    display: flex;
  }

  .markdown :global(h3) {
    font-size: calc(var(--font-size-medium) * 0.9);
    font-weight: var(--font-weight-semibold);
    padding: 0.5rem 0;
    margin: 1rem 0 0.25rem;
  }

  .markdown :global(h4) {
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-regular);
    padding: 0.5rem 0;
    margin: 1rem 0 0.125rem;
  }

  .markdown :global(h5),
  .markdown :global(h6) {
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-small);
    padding: 0.35rem 0;
    margin: 1rem 0 0.125rem;
  }

  .markdown :global(h6) {
    color: var(--color-foreground-dim);
  }

  .markdown :global(p) {
    line-height: 1.625rem;
    margin-top: 0;
    margin-bottom: 0.625rem;
  }

  .markdown :global(p:only-child) {
    margin-bottom: 0;
  }

  .markdown :global(li.task-item) {
    list-style-type: none;
    color: var(--color-foreground-dim);
  }
  .markdown :global(li.task-item radicle-icon-small) {
    margin-right: 0.2rem;
    vertical-align: middle;
  }
  .markdown :global(li.task-item:not(:last-child)) {
    margin-bottom: 0.25rem;
  }

  .markdown :global(blockquote) {
    color: var(--color-foreground-dim);
    border-left: 0.3rem solid var(--color-fill-ghost);
    padding: 0 0 0 1rem;
    margin: 1rem 0 1rem 0;
  }

  .markdown :global(strong) {
    font-weight: var(--font-weight-semibold);
  }

  .markdown :global(.footnote-ref) {
    vertical-align: top;
    position: relative;
    top: -0.4rem;
  }
  .markdown :global(.footnote-ref),
  .markdown :global(.footnote > .marker),
  .markdown :global(.footnote > .ref-arrow) {
    color: var(--color-foreground-dim);
  }
  .markdown :global(.footnote-ref:hover),
  .markdown :global(.footnote .ref-arrow:hover) {
    color: var(--color-foreground);
  }
  .markdown :global(.footnote) {
    margin-bottom: 0;
  }

  .markdown :global(img) {
    border-style: none;
    max-width: 100%;
  }

  .markdown :global(img.txt-emoji) {
    height: 1rem;
  }

  .markdown :global(code) {
    font-family: var(--font-family-monospace);
    font-size: var(--font-size-small);
    background-color: var(--color-fill-ghost);
    border-radius: var(--border-radius-tiny);
    padding: 0.125rem 0.25rem;
  }

  .markdown :global(pre > code) {
    background: none;
    padding: 0;
  }

  .markdown :global(:not(pre) > code) {
    font-size: inherit;
  }

  .markdown :global(pre) {
    font-family: var(--font-family-monospace);
    font-size: var(--font-size-regular);
    background-color: var(--color-fill-ghost);
    padding: 1rem !important;
    border-radius: var(--border-radius-small);
    overflow: scroll;
    scrollbar-width: none;
  }

  .markdown :global(pre::-webkit-scrollbar) {
    display: none;
  }

  .markdown :global(a),
  .markdown :global(a > code) {
    background: none;
    padding: 0;
  }
  .markdown :global(a) {
    text-decoration: underline;
    text-decoration-color: var(--color-foreground-dim);
  }
  .markdown :global(a.no-underline) {
    text-decoration: none;
  }
  .markdown :global(a:hover) {
    text-decoration-color: var(--color-foreground-contrast);
  }

  .markdown :global(hr) {
    height: 0;
    margin: 1rem 0;
    overflow: hidden;
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--color-border-hint);
  }

  .markdown :global(ol) {
    line-height: 1.625;
    list-style-type: decimal;
    margin-bottom: 1rem;
    padding-left: 1.5rem;
  }

  .markdown :global(ul) {
    line-height: 1.625;
    padding-left: 1.25rem;
    margin-bottom: 1rem;
  }
  .markdown :global(.list-content) {
    margin: 1rem 0;
  }
  /* Allows the parent to specify its own bottom margin */
  .markdown :global(> :last-child) {
    margin-bottom: 0;
  }
  .markdown :global(li > ul) {
    margin-bottom: 0rem;
  }
  .markdown :global(li > ol) {
    margin-bottom: 0rem;
  }
  .markdown :global(table) {
    margin: 1.5rem 0;
    border-collapse: collapse;
    border-radius: var(--border-radius-regular);
    border-style: hidden;
    box-shadow: 0 0 0 1px var(--color-border-hint);
    overflow: hidden;
  }
  .markdown :global(td) {
    text-align: left;
    text-overflow: ellipsis;
    border: 1px solid var(--color-border-hint);
    padding: 0.5rem 1rem;
  }
  .markdown :global(tr:nth-child(even)) {
    background-color: var(--color-background-default);
  }
  .markdown :global(th) {
    text-align: center;
    padding: 0.5rem 1rem;
  }

  .markdown :global(*:first-child:not(pre)) {
    padding-top: 0 !important;
  }
  .markdown :global(*:first-child) {
    margin-top: 0 !important;
  }
  .markdown :global(dl dt) {
    font-style: italic;
    margin-top: 1rem;
  }
  .markdown :global(dl dd) {
    margin: 0 0 0 2rem;
  }
</style>

{#if frontMatter && frontMatter.length > 0}
  <div class="front-matter">
    <table>
      <tbody>
        {#each frontMatter as [key, val]}
          <tr>
            <td><span class="txt-bold">{key}</span></td>
            <td>{val}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<!-- The click handler only handles bubbling events from anchor tags -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="markdown"
  bind:this={container}
  use:twemoji={{ exclude: ["21a9"] }}
  on:click={navigateInternalOnAnchor}>
  {@html render(content)}
</div>
