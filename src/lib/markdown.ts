import emojis from "@app/lib/emojis";
import katex from "katex";
import { marked } from "marked";
import { isUrl } from "@app/lib/utils";

const trustedHtmlTags = [
  "small",
  "dl",
  "dt",
  "dd",
  "code",
  "detail",
  "summary",
  "<!--",
];

// TODO: Disables deprecated options, remove once removed from marked
marked.use({ mangle: false, headerIds: false });

const emojisMarkedExtension = {
  name: "emoji",
  level: "inline",
  start: (src: string) => src.indexOf(":"),
  tokenizer(src: string) {
    const match = src.match(/^:([\w+-]+):/);
    if (match) {
      return {
        type: "emoji",
        raw: match[0],
        text: match[1].trim(),
      };
    }
  },
  renderer: (token: marked.Tokens.Generic) => {
    return `<span>${
      token.text in emojis ? emojis[token.text] : token.text
    }</span>`;
  },
};

const katexMarkedExtension = {
  name: "katex",
  level: "inline",
  start: (src: string) => src.indexOf("$"),
  tokenizer(src: string) {
    const match = src.match(/^\$+([^$\n]+?)\$+/);
    if (match) {
      return {
        type: "katex",
        raw: match[0],
        text: match[1].trim(),
      };
    }
  },
  renderer: (token: marked.Tokens.Generic) =>
    katex.renderToString(token.text, {
      throwOnError: false,
    }),
};
const footnotePrefix = "marked-fn";
const referencePrefix = "marked-fnref";
const referenceMatch = /^\[\^([^\]]+)\](?!\()/;

const footnoteReferenceMarkedExtension = {
  name: "footnote-ref",
  level: "inline",
  start: (src: string) => referenceMatch.test(src),
  tokenizer(src: string) {
    const match = src.match(referenceMatch);
    if (match) {
      return {
        type: "footnote-ref",
        raw: match[0],
        text: match[1].trim(),
      };
    }
  },
  renderer: (token: marked.Tokens.Generic) => {
    return `<sup class="footnote-ref" id="${referencePrefix}:${token.text}"><a href="#${footnotePrefix}:${token.text}">[${token.text}]</a></sup>`;
  },
};
const footnoteMatch = /^\[\^([^\]]+)\]:\s([\S]*)/;
const footnoteMarkedExtension = {
  name: "footnote",
  level: "block",
  start: (src: string) => footnoteMatch.test(src),
  tokenizer(src: string) {
    const match = src.match(footnoteMatch);
    if (match) {
      return {
        type: "footnote",
        raw: match[0],
        reference: match[1].trim(),
        text: match[2].trim(),
      };
    }
  },
  renderer: (token: marked.Tokens.Generic) => {
    return `${
      token.reference === "0" ? "<hr />" : ""
    }<p class="txt-small" id="${footnotePrefix}:${token.reference}">${
      token.reference
    }. ${marked.parseInline(
      token.text,
    )} <a class="txt-tiny ref-arrow" href="#${referencePrefix}:${
      token.reference
    }">↩</a></p>`;
  },
};

// Converts self closing anchor tags into empty anchor tags, to avoid erratic wrapping behaviour
// e.g. <a name="test"/> -> <a name="test"></a>
const anchorMarkedExtension = {
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
  renderer: (token: marked.Tokens.Generic) => {
    return `<a name="${token.text}"></a>`;
  },
};

export const walkTokens = (token: marked.Tokens.Generic) => {
  if (token.type !== "code" && token.type !== "codespan" && "text" in token) {
    if (trustedHtmlTags.some(tag => token.text.includes(tag))) {
      // TODO: All this seems like a slippery slope,
      // for which we should find a better way to handle it.
      // Handles eventual codespans inside a trusted html tag.
      token.text = token.text.replace(
        /`{1}([^`]+)`{1}/g,
        (_match: RegExpMatchArray, tagContent: string) =>
          `<code>${tagContent}</code>`,
      );
      // Handles eventual codeblocks inside a trusted html tag.
      token.text = token.text.replace(
        /`{3}([^`]+)`{3}/g,
        (_match: RegExpMatchArray, tagContent: string) =>
          `<pre><code>${tagContent}</code></pre>`,
      );
      return;
    }
    token.text = token.text.replace(
      /<([^>]+)>/g,
      (_match: RegExpMatchArray, tagContent: string) => `&lt;${tagContent}&gt;`,
    );
  }
};

export const renderer = {
  // Overwrites the rendering of heading tokens.
  // Since there are possible non ASCII characters in headings,
  // we escape them by replacing them with dashes and,
  // trim eventual dashes on each side of the string.
  heading(text: string, level: 1 | 2 | 3 | 4 | 5 | 6) {
    const escapedText = text
      // By lowercasing we avoid casing mismatches, between headings and links.
      .toLowerCase()
      .replace(/[^\w]+/g, "-")
      .replace(/^-|-$/g, "");

    return `<h${level} id="${escapedText}">${text}</h${level}>`;
  },
  link(href: string, _title: string, text: string) {
    // Adding the file-link class to relative file names,
    // so we're able to navigate to the file in the editor.
    if (!isUrl(href) && !href.startsWith("#")) {
      return `<a href="${href}" class="file-link">${text}</a>`;
    } else if (href.startsWith("#")) {
      // By lowercasing we avoid casing mismatches, between headings and links.
      return `<a href="${href.toLowerCase()}">${text}</a>`;
    }
    return `<a href="${href}">${text}</a>`;
  },
};

export const markdownExtensions = [
  anchorMarkedExtension,
  emojisMarkedExtension,
  footnoteMarkedExtension,
  footnoteReferenceMarkedExtension,
  katexMarkedExtension,
];
