import type { BaseUrl } from "@http-client";
import type { Config } from "dompurify";
import type { MarkedExtension, Tokens } from "marked";

import escape from "lodash/escape";
import footnoteMarkedExtension from "marked-footnote";
import katexMarkedExtension from "marked-katex-extension";
import linkifyMarkedExtension from "marked-linkify-it";
import { Marked, Renderer as BaseRenderer } from "marked";
import { markedEmoji } from "marked-emoji";

import emojis from "@app/lib/emojis";
import { canonicalize, isUrl } from "@app/lib/utils";
import { routeToPath } from "@app/lib/router";

/**
 * DOMPurify configuration for sanitizing markdown-derived HTML. Pass this as
 * the second argument to `dompurify.sanitize` at each call site instead of
 * setting it globally — a global config leaks into other consumers of the
 * DOMPurify singleton (e.g. mermaid's internal strict-mode sanitization),
 * which would strip the SVG output of valid diagrams.
 */
export const sanitizeConfig: Config = {
  /* eslint-disable @typescript-eslint/naming-convention */
  ALLOWED_ATTR: [
    "align",
    "checked",
    "class",
    "height",
    "href",
    "id",
    "name",
    "rel",
    "src",
    "target",
    "text",
    "title",
    "type",
    "width",
  ],
  ALLOWED_TAGS: [
    "a",
    "b",
    "blockquote",
    "br",
    "code",
    "dd",
    "del",
    "div",
    "dl",
    "dt",
    "em",
    "i",
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
    "s",
    "strong",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "ul",
  ],
  /* eslint-enable @typescript-eslint/naming-convention */
};

// The source-browser location a markdown document is rendered at. When set,
// relative links in the document resolve to repo source paths relative to the
// document's own path.
export interface SourceLinkContext {
  node: BaseUrl;
  repo: string;
  peer?: string;
  revision?: string;
  path?: string;
}

export class Renderer extends BaseRenderer {
  #source: SourceLinkContext | undefined;

  constructor(source?: SourceLinkContext) {
    super();
    this.#source = source;
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
      href = href.toLowerCase();
    } else if (this.#source && !isUrl(href)) {
      href = routeToPath({
        resource: "repo.source",
        node: this.#source.node,
        repo: this.#source.repo,
        peer: this.#source.peer,
        revision: this.#source.revision,
        path: canonicalize(href, this.#source.path || "README.md"),
      });
    }

    const attrs = [`href="${escape(href)}"`];
    if (title) {
      attrs.push(`title="${escape(title)}"`);
    }

    return `<a ${attrs.join(" ")}>${text}</a>`;
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
