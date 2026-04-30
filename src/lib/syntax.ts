import type { ElementContent, Root } from "hast";

import onigurumaWASMUrl from "vscode-oniguruma/release/onig.wasm?url";
import sourceGitignore from "@wooorm/starry-night/source.gitignore";
import sourceJson from "@wooorm/starry-night/source.json";
import sourceDotenv from "@wooorm/starry-night/source.dotenv";
import sourceNushell from "@wooorm/starry-night/source.nushell";
import sourceToml from "@wooorm/starry-night/source.toml";
import goMod from "@wooorm/starry-night/go.mod";
import goSum from "@wooorm/starry-night/go.sum";

import { createStarryNight, all, type Grammar } from "@wooorm/starry-night";

export { type Root };

export const grammars = [
  ...all,
  {
    extensions: [".hintrc"],
    names: ["json", "flake.lock"],
    patterns: [sourceJson],
    scopeName: "source.json",
  },
  {
    extensions: [],
    names: ["cargo.lock"],
    patterns: [sourceToml],
    scopeName: "source.toml",
  },
  {
    extensions: [
      ".npmignore",
      ".eslintignore",
      ".dockerignore",
      ".nuxtignore",
      ".vscodeignore",
    ],
    names: ["ignore"],
    patterns: [sourceGitignore],
    scopeName: "source.gitignore",
  },
  {
    extensions: [".sample", ".example", ".template"],
    names: [".env.sample", ".env.example", ".env.template"],
    patterns: [sourceDotenv],
    scopeName: "source.dotenv",
  },
  {
    extensions: [".nu"],
    names: [],
    patterns: [sourceNushell],
    scopeName: "source.nushell",
  },
  {
    extensions: [".mod"],
    names: ["go.mod"],
    patterns: [goMod],
    scopeName: "go.mode",
  },
  {
    extensions: [".sum"],
    names: ["go.sum"],
    patterns: [goSum],
    scopeName: "go.sum",
  },
  // A grammar that doesn't do any parsing, but needed for files without a known filetype.
  {
    extensions: [""],
    names: ["raw-format"],
    patterns: [],
    scopeName: "text.raw",
  },
] satisfies Grammar[];

let starryNight: Awaited<ReturnType<typeof createStarryNight>>;

export async function highlight(
  content: string,
  grammar: string,
): Promise<Root> {
  if (starryNight === undefined) {
    starryNight = await createStarryNight(grammars, {
      getOnigurumaUrlFetch: () => new URL(onigurumaWASMUrl, import.meta.url),
    });
  }
  const scope = starryNight.flagToScope(grammar);
  return starryNight.highlight(content, scope ?? "text.raw");
}

export function lineNumbersGutter(tree: Root) {
  const replacement: ElementContent[] = [];
  const search = /\r?\n|\r/g;
  let index = -1;
  let start = 0;
  let startTextRemainder = "";
  let lineNumber = 0;

  while (++index < tree.children.length) {
    const child = tree.children[index];

    if (child.type === "text") {
      let textStart = 0;
      let match = search.exec(child.value);

      while (match) {
        // Nodes in this line.
        const line = tree.children.slice(start, index) as ElementContent[];

        // Prepend text from a partial matched earlier text.
        if (startTextRemainder) {
          line.unshift({ type: "text", value: startTextRemainder });
          startTextRemainder = "";
        }

        // Append text from this text.
        if (match.index > textStart) {
          line.push({
            type: "text",
            value: child.value.slice(textStart, match.index),
          });
        }

        // Add a line, and the eol.
        lineNumber += 1;
        replacement.push(createLine(line, lineNumber), {
          type: "text",
          value: match[0],
        });

        start = index + 1;
        textStart = match.index + match[0].length;
        match = search.exec(child.value);
      }

      // If we matched, make sure to not drop the text after the last line ending.
      if (start === index + 1) {
        startTextRemainder = child.value.slice(textStart);
      }
    }
  }

  const line = tree.children.slice(start) as ElementContent[];
  // Prepend text from a partial matched earlier text.
  if (startTextRemainder) {
    line.unshift({ type: "text", value: startTextRemainder });
  }

  if (line.length > 0) {
    lineNumber += 1;
    replacement.push(createLine(line, lineNumber));
  }

  // Replace children with new array.
  tree.children = replacement;

  return tree;
}

function createLine(children: ElementContent[], line: number): ElementContent {
  return {
    type: "element",
    tagName: "tr",
    properties: {
      class: "line",
      id: "L" + line,
    },
    children: [
      {
        type: "element",
        tagName: "td",
        properties: {
          className: "line-number",
        },
        children: [
          {
            type: "element",
            tagName: "a",
            properties: { href: "#L" + line },
            children: [{ type: "text", value: line.toString() }],
          },
        ],
      },
      {
        type: "element",
        tagName: "td",
        properties: {
          className: "line-content",
        },
        children: [
          {
            type: "element",
            tagName: "pre",
            properties: {
              className: "content",
            },
            children,
          },
        ],
      },
    ],
  };
}
