import type { ElementContent, Root } from "hast";

import onigurumaWASMUrl from "vscode-oniguruma/release/onig.wasm?url";
import { createStarryNight, type Grammar } from "@wooorm/starry-night";

type StarryNight = Awaited<ReturnType<typeof createStarryNight>>;

export { type Root };

const textRawGrammar: Grammar = {
  extensions: [""],
  names: ["raw-format"],
  patterns: [],
  scopeName: "text.raw",
};

interface GrammarEntry {
  scope: string;
  flags: string[];
  load: () => Promise<Grammar>;
}

// Each grammar is fetched in its own chunk. Cross-grammar dependencies
// declared by starry-night (e.g. `source.svelte` → `source.css`,
// `source.js`, `source.ts`) are resolved at load time by reading the
// loaded grammar's `dependencies` array.
const entries: GrammarEntry[] = [
  // === starry-night `common` set ===
  {
    scope: "source.c",
    flags: [
      "c",
      "cats",
      "h",
      "h.in",
      "idc",
      "opencl",
      "upc",
      "xbm",
      "xpm",
      "xs",
      "dtrace",
      "dtrace-script",
      "oncrpc",
      "rpc",
      "rpcgen",
      "unified-parallel-c",
      "x-bitmap",
      "x-pixmap",
      "xdr",
    ],
    load: () => import("@wooorm/starry-night/source.c").then(m => m.default),
  },
  {
    scope: "source.c++",
    flags: [
      "asc",
      "ash",
      "asy",
      "c++",
      "cc",
      "cp",
      "cpp",
      "cppm",
      "cxx",
      "edc",
      "gml",
      "h++",
      "hh",
      "hip",
      "hpp",
      "hxx",
      "inl",
      "ino",
      "ipp",
      "ixx",
      "metal",
      "re",
      "swg",
      "swig",
      "tcc",
      "tpp",
      "txx",
      "ags",
      "ags-script",
      "asymptote",
      "edje-data-collection",
      "game-maker-language",
      "swig",
    ],
    load: () => import("@wooorm/starry-night/source.c++").then(m => m.default),
  },
  {
    scope: "source.cs",
    flags: [
      "bf",
      "cake",
      "cs",
      "cs.pp",
      "csx",
      "eq",
      "linq",
      "uno",
      "beef",
      "c#",
      "cakescript",
      "csharp",
    ],
    load: () => import("@wooorm/starry-night/source.cs").then(m => m.default),
  },
  {
    scope: "source.css",
    flags: ["css"],
    load: () => import("@wooorm/starry-night/source.css").then(m => m.default),
  },
  {
    scope: "source.css.less",
    flags: ["less", "less-css"],
    load: () =>
      import("@wooorm/starry-night/source.css.less").then(m => m.default),
  },
  {
    scope: "source.css.scss",
    flags: ["scss"],
    load: () =>
      import("@wooorm/starry-night/source.css.scss").then(m => m.default),
  },
  {
    scope: "source.diff",
    flags: ["diff", "patch", "udiff"],
    load: () => import("@wooorm/starry-night/source.diff").then(m => m.default),
  },
  {
    scope: "source.go",
    flags: ["go", "golang"],
    load: () => import("@wooorm/starry-night/source.go").then(m => m.default),
  },
  {
    scope: "source.graphql",
    flags: ["graphql", "gql", "graphqls"],
    load: () =>
      import("@wooorm/starry-night/source.graphql").then(m => m.default),
  },
  {
    scope: "source.ini",
    flags: [
      "cnf",
      "dof",
      "frm",
      "ini",
      "lektorproject",
      "outjob",
      "pcbdoc",
      "prefs",
      "prjpcb",
      "properties",
      "schdoc",
      "url",
      "altium",
      "altium-designer",
      "dosini",
    ],
    load: () => import("@wooorm/starry-night/source.ini").then(m => m.default),
  },
  {
    scope: "source.java",
    flags: ["ck", "jav", "java", "jsh", "uc", "chuck", "unrealscript"],
    load: () => import("@wooorm/starry-night/source.java").then(m => m.default),
  },
  {
    scope: "source.js",
    flags: [
      "_js",
      "bones",
      "cjs",
      "cy",
      "es6",
      "jake",
      "javascript",
      "js",
      "js.erb",
      "jsb",
      "jscad",
      "jsfl",
      "jslib",
      "jsm",
      "json5",
      "jsonld",
      "jspre",
      "jss",
      "jsx",
      "mjs",
      "njs",
      "pac",
      "sjs",
      "ssjs",
      "xsjs",
      "xsjslib",
      "cycript",
      "javascript+erb",
      "node",
      "qt-script",
    ],
    load: () => import("@wooorm/starry-night/source.js").then(m => m.default),
  },
  {
    scope: "source.json",
    flags: [
      "4dform",
      "4dproject",
      "avsc",
      "epj",
      "geojson",
      "gltf",
      "har",
      "ice",
      "ipynb",
      "json",
      "json-tmlanguage",
      "json.example",
      "jsonl",
      "maxhelp",
      "maxpat",
      "maxproj",
      "mcmeta",
      "mxt",
      "pat",
      "sarif",
      "tfstate",
      "tfstate.backup",
      "topojson",
      "webapp",
      "webmanifest",
      "yy",
      "yyp",
      "ecere-projects",
      "ipython-notebook",
      "jupyter-notebook",
      "max",
      "max/msp",
      "maxmsp",
      "oasv2-json",
      "oasv3-json",
    ],
    load: () => import("@wooorm/starry-night/source.json").then(m => m.default),
  },
  {
    scope: "source.kotlin",
    flags: ["gradle.kts", "kt", "ktm", "kts", "gradle-kotlin-dsl", "kotlin"],
    load: () =>
      import("@wooorm/starry-night/source.kotlin").then(m => m.default),
  },
  {
    scope: "source.lua",
    flags: ["lua", "fcgi", "nse", "p8", "pd_lua", "rbxs", "rockspec", "wlua"],
    load: () => import("@wooorm/starry-night/source.lua").then(m => m.default),
  },
  {
    scope: "source.makefile",
    flags: ["mak", "make", "makefile", "mk", "mkfile", "bsdmake", "mf"],
    load: () =>
      import("@wooorm/starry-night/source.makefile").then(m => m.default),
  },
  {
    scope: "source.objc",
    flags: ["objective-c", "obj-c", "objc", "objectivec"],
    load: () => import("@wooorm/starry-night/source.objc").then(m => m.default),
  },
  {
    scope: "source.objc.platform",
    flags: [],
    load: () =>
      import("@wooorm/starry-night/source.objc.platform").then(m => m.default),
  },
  {
    scope: "source.perl",
    flags: ["pl", "cgi", "perl", "ph", "plx", "pm", "psgi", "t", "cperl"],
    load: () => import("@wooorm/starry-night/source.perl").then(m => m.default),
  },
  {
    scope: "source.python",
    flags: [
      "bzl",
      "eb",
      "gyp",
      "gypi",
      "lmi",
      "py",
      "py3",
      "pyde",
      "pyi",
      "pyp",
      "pyt",
      "pyw",
      "rpy",
      "sage",
      "sagews",
      "smk",
      "snakefile",
      "spec",
      "tac",
      "wsgi",
      "xpy",
      "xsh",
      "bazel",
      "easybuild",
      "python",
      "python3",
      "rusthon",
      "snakemake",
      "starlark",
      "xonsh",
    ],
    load: () =>
      import("@wooorm/starry-night/source.python").then(m => m.default),
  },
  {
    scope: "source.r",
    flags: ["r", "rd", "rsx", "rscript", "splus"],
    load: () => import("@wooorm/starry-night/source.r").then(m => m.default),
  },
  {
    scope: "source.ruby",
    flags: [
      "builder",
      "druby",
      "duby",
      "eye",
      "gemspec",
      "god",
      "jbuilder",
      "mirah",
      "mspec",
      "pluginspec",
      "podspec",
      "prawn",
      "rabl",
      "rake",
      "rb",
      "rbi",
      "rbuild",
      "rbw",
      "rbx",
      "ru",
      "ruby",
      "thor",
      "watchr",
      "jruby",
      "macruby",
    ],
    load: () => import("@wooorm/starry-night/source.ruby").then(m => m.default),
  },
  {
    scope: "source.rust",
    flags: ["rs", "rs.in", "rust"],
    load: () => import("@wooorm/starry-night/source.rust").then(m => m.default),
  },
  {
    scope: "source.shell",
    flags: [
      "bash",
      "bats",
      "command",
      "csh",
      "ebuild",
      "eclass",
      "ksh",
      "sbatch",
      "sh",
      "sh.in",
      "slurm",
      "tcsh",
      "tmux",
      "tool",
      "zsh",
      "zsh-theme",
      "abuild",
      "alpine-abuild",
      "apkbuild",
      "envrc",
      "gentoo-ebuild",
      "gentoo-eclass",
      "openrc",
      "openrc-runscript",
      "shell",
      "shell-script",
    ],
    load: () =>
      import("@wooorm/starry-night/source.shell").then(m => m.default),
  },
  {
    scope: "source.sql",
    flags: [
      "db2",
      "ddl",
      "mysql",
      "pgsql",
      "prc",
      "sql",
      "tab",
      "udf",
      "viw",
      "plpgsql",
      "sqlpl",
    ],
    load: () => import("@wooorm/starry-night/source.sql").then(m => m.default),
  },
  {
    scope: "source.swift",
    flags: ["swift"],
    load: () =>
      import("@wooorm/starry-night/source.swift").then(m => m.default),
  },
  {
    scope: "source.ts",
    flags: ["ts", "cts", "mts", "typescript"],
    load: () => import("@wooorm/starry-night/source.ts").then(m => m.default),
  },
  {
    scope: "source.vbnet",
    flags: [
      "bi",
      "rbbas",
      "rbfrm",
      "rbmnu",
      "rbres",
      "rbtbar",
      "rbuistate",
      "vb",
      "vbhtml",
      "vbs",
      "fb",
      "freebasic",
      "realbasic",
      "vb-.net",
      "vb.net",
      "vbnet",
      "vbscript",
      "visual-basic",
      "visual-basic-.net",
    ],
    load: () =>
      import("@wooorm/starry-night/source.vbnet").then(m => m.default),
  },
  {
    scope: "source.yaml",
    flags: [
      "anim",
      "asset",
      "ksy",
      "lkml",
      "lookml",
      "mat",
      "meta",
      "mir",
      "prefab",
      "raml",
      "reek",
      "rviz",
      "sublime-syntax",
      "syntax",
      "unity",
      "yaml-tmlanguage",
      "yaml.sed",
      "yml.mysql",
      "buildstream",
      "jar-manifest",
      "kaitai-struct",
      "oasv2-yaml",
      "oasv3-yaml",
      "unity3d-asset",
      "yaml",
      "yml",
    ],
    load: () => import("@wooorm/starry-night/source.yaml").then(m => m.default),
  },
  {
    scope: "text.html.basic",
    flags: ["hta", "htm", "html.hl", "kit", "mtml", "xht", "xhtml", "html"],
    load: () =>
      import("@wooorm/starry-night/text.html.basic").then(m => m.default),
  },
  {
    scope: "text.html.php",
    flags: [
      "aw",
      "ctp",
      "php3",
      "php4",
      "php5",
      "phps",
      "phpt",
      "phtml",
      "html+php",
      "inc",
      "php",
    ],
    load: () =>
      import("@wooorm/starry-night/text.html.php").then(m => m.default),
  },
  {
    scope: "text.md",
    flags: [
      "livemd",
      "markdown",
      "md",
      "mdown",
      "mdwn",
      "mkd",
      "mkdn",
      "mkdown",
      "qmd",
      "rmd",
      "ronn",
      "scd",
      "workbook",
      "pandoc",
      "rmarkdown",
    ],
    load: () => import("@wooorm/starry-night/text.md").then(m => m.default),
  },
  {
    scope: "text.xml",
    flags: [
      "adml",
      "admx",
      "ant",
      "axaml",
      "axml",
      "brd",
      "builds",
      "ccproj",
      "ccxml",
      "clixml",
      "cproject",
      "cscfg",
      "csdef",
      "csproj",
      "ct",
      "dae",
      "depproj",
      "dita",
      "ditamap",
      "ditaval",
      "dll.config",
      "dotsettings",
      "filters",
      "fsproj",
      "fxml",
      "glade",
      "gmx",
      "gpx",
      "grxml",
      "hzp",
      "iml",
      "ivy",
      "jelly",
      "jsproj",
      "kml",
      "launch",
      "lvclass",
      "lvlib",
      "lvproj",
      "mdpolicy",
      "mjml",
      "mxml",
      "natvis",
      "ndproj",
      "nproj",
      "nuspec",
      "odd",
      "osm",
      "owl",
      "pkgproj",
      "proj",
      "props",
      "ps1xml",
      "psc1",
      "pt",
      "pubxml",
      "qhelp",
      "rdf",
      "resx",
      "rss",
      "sch",
      "scxml",
      "sfproj",
      "shproj",
      "slnx",
      "srdf",
      "storyboard",
      "sublime-snippet",
      "targets",
      "tml",
      "ui",
      "urdf",
      "ux",
      "vbproj",
      "vcxproj",
      "vsixmanifest",
      "vssettings",
      "vstemplate",
      "vxml",
      "wixproj",
      "wsdl",
      "wsf",
      "wxi",
      "wxl",
      "wxs",
      "x3d",
      "xacro",
      "xaml",
      "xib",
      "xlf",
      "xliff",
      "xmi",
      "xml",
      "xml.dist",
      "xmp",
      "xpl",
      "xproc",
      "xproj",
      "xsd",
      "xsp-config",
      "xspmetadata",
      "xspec",
      "xul",
      "zcml",
      "collada",
      "eagle",
      "labview",
      "web-ontology-language",
      "xpages",
    ],
    load: () => import("@wooorm/starry-night/text.xml").then(m => m.default),
  },
  {
    scope: "text.xml.svg",
    flags: ["svg"],
    load: () =>
      import("@wooorm/starry-night/text.xml.svg").then(m => m.default),
  },

  // === extras (file types relevant to this project but not in `common`) ===
  {
    scope: "text.html.asciidoc",
    flags: ["asciidoc", "adoc"],
    load: () =>
      import("@wooorm/starry-night/text.html.asciidoc").then(m => m.default),
  },
  {
    scope: "source.dockerfile",
    flags: ["dockerfile", "containerfile"],
    load: () =>
      import("@wooorm/starry-night/source.dockerfile").then(m => m.default),
  },
  {
    scope: "source.erlang",
    flags: ["erlang", "erl", "app", "escript", "hrl", "xrl", "yrl"],
    load: () =>
      import("@wooorm/starry-night/source.erlang").then(m => m.default),
  },
  {
    scope: "source.solidity",
    flags: ["solidity", "sol"],
    load: () =>
      import("@wooorm/starry-night/source.solidity").then(m => m.default),
  },
  {
    scope: "source.svelte",
    flags: ["svelte"],
    load: () =>
      import("@wooorm/starry-night/source.svelte").then(m => m.default),
  },
  {
    scope: "source.sass",
    flags: ["sass"],
    load: () => import("@wooorm/starry-night/source.sass").then(m => m.default),
  },
  {
    scope: "source.toml",
    flags: ["toml"],
    load: () => import("@wooorm/starry-night/source.toml").then(m => m.default),
  },
  {
    scope: "source.tsx",
    flags: ["tsx"],
    load: () => import("@wooorm/starry-night/source.tsx").then(m => m.default),
  },
  {
    scope: "source.nix",
    flags: ["nix", "nixos"],
    load: () => import("@wooorm/starry-night/source.nix").then(m => m.default),
  },
  {
    scope: "source.gitconfig",
    flags: ["gitconfig", "gitmodules", "git-config"],
    load: () =>
      import("@wooorm/starry-night/source.gitconfig").then(m => m.default),
  },
  {
    scope: "source.gitignore",
    flags: ["gitignore", "ignore-list", "ignore", "git-ignore"],
    load: () =>
      import("@wooorm/starry-night/source.gitignore").then(m => m.default),
  },
  {
    scope: "source.git-revlist",
    flags: ["git-revision-list", "git-blame-ignore-revs"],
    load: () =>
      import("@wooorm/starry-night/source.git-revlist").then(m => m.default),
  },
  {
    scope: "source.gitattributes",
    flags: ["gitattributes", "git-attributes"],
    load: () =>
      import("@wooorm/starry-night/source.gitattributes").then(m => m.default),
  },
  {
    scope: "source.ini.npmrc",
    flags: ["npmrc", "npm-config"],
    load: () =>
      import("@wooorm/starry-night/source.ini.npmrc").then(m => m.default),
  },
  {
    scope: "source.groovy.gradle",
    flags: ["gradle"],
    load: () =>
      import("@wooorm/starry-night/source.groovy.gradle").then(m => m.default),
  },
  {
    scope: "source.batchfile",
    flags: ["batchfile", "bat", "cmd", "batch", "dosbatch", "winbatch"],
    load: () =>
      import("@wooorm/starry-night/source.batchfile").then(m => m.default),
  },
  {
    scope: "source.editorconfig",
    flags: ["editorconfig", "editor-config"],
    load: () =>
      import("@wooorm/starry-night/source.editorconfig").then(m => m.default),
  },
  {
    scope: "source.haproxy-config",
    flags: ["haproxy", "cfg"],
    load: () =>
      import("@wooorm/starry-night/source.haproxy-config").then(m => m.default),
  },
  {
    scope: "source.dotenv",
    flags: ["dotenv", "env"],
    load: () =>
      import("@wooorm/starry-night/source.dotenv").then(m => m.default),
  },
  {
    scope: "source.zig",
    flags: ["zig", "zon"],
    load: () => import("@wooorm/starry-night/source.zig").then(m => m.default),
  },
  {
    scope: "source.emacs.lisp",
    flags: ["emacs-lisp", "elisp", "emacs", "el"],
    load: () =>
      import("@wooorm/starry-night/source.emacs.lisp").then(m => m.default),
  },
  {
    scope: "source.commonlisp",
    flags: [
      "common-lisp",
      "commonlisp",
      "lisp",
      "cl",
      "asd",
      "lsp",
      "ny",
      "podsl",
      "sexp",
    ],
    load: () =>
      import("@wooorm/starry-night/source.commonlisp").then(m => m.default),
  },
  {
    scope: "text.html.vue",
    flags: ["vue"],
    load: () =>
      import("@wooorm/starry-night/text.html.vue").then(m => m.default),
  },
  {
    scope: "text.html.django",
    flags: [
      "django",
      "jinja",
      "jinja2",
      "j2",
      "html+django",
      "html+jinja",
      "htmldjango",
      "django-html",
    ],
    load: () =>
      import("@wooorm/starry-night/text.html.django").then(m => m.default),
  },
  {
    scope: "text.robots-txt",
    flags: ["robots", "robots-txt", "robots.txt"],
    load: () =>
      import("@wooorm/starry-night/text.robots-txt").then(m => m.default),
  },
  {
    scope: "text.zone_file",
    flags: ["zone", "zone_file", "dns-zone", "arpa"],
    load: () =>
      import("@wooorm/starry-night/text.zone_file").then(m => m.default),
  },
  {
    scope: "etc",
    flags: [],
    load: () => import("@wooorm/starry-night/etc").then(m => m.default),
  },
  {
    scope: "go.mod",
    flags: [
      "go-mod",
      "go-module",
      "go-work",
      "go-workspace",
      "go.mod",
      "go.work",
      "mod",
    ],
    load: () => import("@wooorm/starry-night/go.mod").then(m => m.default),
  },
  {
    scope: "go.sum",
    flags: [
      "go-checksums",
      "go.sum",
      "go-sum",
      "go.work.sum",
      "go-work-sum",
      "sum",
    ],
    load: () => import("@wooorm/starry-night/go.sum").then(m => m.default),
  },

  // === transitive dependencies (no user-facing flags) ===
  {
    scope: "source.groovy",
    flags: [],
    load: () =>
      import("@wooorm/starry-night/source.groovy").then(m => m.default),
  },
  {
    scope: "source.regexp.posix",
    flags: [],
    load: () =>
      import("@wooorm/starry-night/source.regexp.posix").then(m => m.default),
  },
];

const flagToScope = new Map<string, string>();
const scopeLoaders = new Map<string, () => Promise<Grammar>>();
for (const e of entries) {
  for (const f of e.flags) flagToScope.set(f.toLowerCase(), e.scope);
  scopeLoaders.set(e.scope, e.load);
}

const flagAliases = new Map<string, string>([
  ["hintrc", "source.json"],
  ["npmignore", "source.gitignore"],
  ["eslintignore", "source.gitignore"],
  ["dockerignore", "source.gitignore"],
  ["nuxtignore", "source.gitignore"],
  ["vscodeignore", "source.gitignore"],
  ["sample", "source.dotenv"],
  ["example", "source.dotenv"],
  ["template", "source.dotenv"],
]);

let starryNightPromise: Promise<StarryNight> | undefined;
const loadedScopes = new Set<string>();
const inflight = new Map<string, Promise<void>>();

function ensureStarryNight(): Promise<StarryNight> {
  if (!starryNightPromise) {
    starryNightPromise = createStarryNight([textRawGrammar], {
      getOnigurumaUrlFetch: () => new URL(onigurumaWASMUrl, import.meta.url),
    });
  }
  return starryNightPromise;
}

async function ensureGrammar(scope: string): Promise<void> {
  if (loadedScopes.has(scope)) return;
  const existing = inflight.get(scope);
  if (existing) return existing;
  const loader = scopeLoaders.get(scope);
  if (!loader) return;

  const promise = (async () => {
    const sn = await ensureStarryNight();
    const grammar = await loader();
    const deps = (grammar as Grammar & { dependencies?: string[] })
      .dependencies;
    if (deps && deps.length > 0) {
      await Promise.all(deps.map(d => ensureGrammar(d)));
    }
    await sn.register([grammar]);
    loadedScopes.add(scope);
  })();
  inflight.set(scope, promise);
  return promise;
}

function resolveScope(flag: string): string | undefined {
  const normal = flag.toLowerCase().replace(/^\./, "");
  return flagAliases.get(normal) ?? flagToScope.get(normal);
}

export async function highlight(content: string, flag: string): Promise<Root> {
  const sn = await ensureStarryNight();
  const scope = resolveScope(flag);
  if (scope) await ensureGrammar(scope);
  return sn.highlight(content, scope ?? "text.raw");
}

export function plainTree(content: string): Root {
  return {
    type: "root",
    children: [{ type: "text", value: content }],
  };
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
