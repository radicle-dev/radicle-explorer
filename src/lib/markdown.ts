import type { MarkedExtension, Tokens } from "marked";
import type { Route } from "@app/lib/router";

import dompurify from "dompurify";
import footnoteMarkedExtension from "marked-footnote";
import katexMarkedExtension from "marked-katex-extension";
import linkifyMarkedExtension from "marked-linkify-it";
import { Marked, Renderer as BaseRenderer } from "marked";
import { markedEmoji } from "marked-emoji";

import emojis from "@app/lib/emojis";
import { canonicalize, isUrl } from "@app/lib/utils";
import { routeToPath } from "@app/lib/router";

dompurify.setConfig({
  /* eslint-disable @typescript-eslint/naming-convention */
  ALLOWED_ATTR: [
    "align",
    "checked",
    "class",
    "height",
    "href",
    "id",
    "name",
    "src",
    "target",
    "text",
    "title",
    "type",
    "width",
  ],
  ALLOWED_TAGS: [
    "a",
    "blockquote",
    "br",
    "code",
    "dd",
    "div",
    "dl",
    "dt",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "img",
    "input",
    "li",
    "ol",
    "p",
    "pre",
    "radicle-external-link",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "ul",
  ],
  /* eslint-enable @typescript-eslint/naming-convention */
});

export class Renderer extends BaseRenderer {
  #route: Route;

  /**
   * If `baseUrl` is provided, all hrefs attributes in anchor tags, except those
   * starting with `#`, are resolved with respect to `baseUrl`
   */
  constructor(activeUnloadedRoute: Route) {
    super();
    this.#route = activeUnloadedRoute;
  }
  // Overwrites the rendering of heading tokens.
  // Since there are possible non ASCII characters in headings,
  // we escape them by replacing them with dashes and,
  // trim eventual dashes on each side of the string.
  heading({ tokens, depth }: Tokens.Heading) {
    const text = this.parser.parseInline(tokens);
    const escapedText = text
      // By lowercasing we avoid casing mismatches, between headings and links.
      .toLowerCase()
      .replace(/[^\w]+/g, "-")
      .replace(/^-|-$/g, "");

    return `<h${depth} id="${escapedText}">${text}</h${depth}>`;
  }

  link({ href, title, tokens }: Tokens.Link): string {
    const text = this.parser.parseInline(tokens);
    if (href.startsWith("#")) {
      // By lowercasing we avoid casing mismatches, between headings and links.
      return `<a ${title ? `title="${title}"` : ""} href="${href.toLowerCase()}">${text}</a>`;
    }

    if (this.#route.resource === "repo.source" && !isUrl(href)) {
      href = routeToPath({
        ...this.#route,
        path: canonicalize(href, this.#route.path || "README.md"),
        route: undefined,
      });
    }

    return `<a ${title ? `title="${title}"` : ""} href="${href}">${text}</a>`;
  }
}

interface MarkedOptions {
  /** Converts double colon separated strings like `:emoji:` into img tags. */
  emojis?: boolean;
  /** Enable footnotes support. */
  footnotes?: boolean;
  /** Detect links and convert them into anchor tags. */
  linkify?: boolean;
  /** Enable katex support. */
  katex?: boolean;
}

// Converts self closing anchor tags into empty anchor tags, to avoid erratic wrapping behaviour
// e.g. <a name="test"/> -> <a name="test"></a>
const anchorExtension: MarkedExtension = {
  extensions: [
    {
      name: "sanitizedAnchor",
      level: "block",
      start: (src: string) => src.match(/<a name="([\w]+)"\/>/)?.index,
      tokenizer(src: string) {
        const match = src.match(/^<a name="([\w]+)"\/>/);
        if (match) {
          return {
            type: "sanitizedAnchor",
            raw: match[0],
            text: match[1].trim(),
          };
        }
      },
      renderer: (token: Tokens.Generic): string =>
        `<a name="${token.text}"></a>`,
    },
  ],
};

// Converts double colon separated strings like `:emoji:` into img tags.
const emojiExtension = markedEmoji({
  emojis,
  renderer: (token: { name: string; emoji: string }) => {
    const src = token.emoji.codePointAt(0)?.toString(16);
    return `<img alt="${token.name}" src="/twemoji/${src}.svg" class="txt-emoji">`;
  },
});

const footnoteExtension = footnoteMarkedExtension({ refMarkers: true });
const linkifyExtension = linkifyMarkedExtension({}, { fuzzyLink: false });
const katexExtension = katexMarkedExtension({ throwOnError: false });

export function markdown(options: MarkedOptions): Marked {
  return new Marked(
    // Default extensions to always include.
    ...[anchorExtension],
    // Optional extensions to include according to use case.
    ...[
      ...(options.emojis ? [emojiExtension] : []),
      ...(options.footnotes ? [footnoteExtension] : []),
      ...(options.katex ? [katexExtension] : []),
      ...(options.linkify ? [linkifyExtension] : []),
    ],
  );
}
