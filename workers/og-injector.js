function parseRoute(pathname) {
  const segments = pathname.replace(/^\//, "").split("/");
  const first = segments[0];

  // Home
  if (first === "" || first === undefined) {
    return { type: "home" };
  }

  if (first !== "nodes" && first !== "seeds") return null;

  const host = segments[1];
  if (!host) return { type: "home" };

  const rid = segments[2];

  // /nodes/:host
  if (!rid) return { type: "node", host };

  // /nodes/:host/users/:did
  if (rid === "users") {
    const did = segments[3];
    return did ? { type: "user", host, did } : { type: "node", host };
  }

  // /nodes/:host/:rid/issues/:id
  if (segments[3] === "issues" && segments[4]) {
    return { type: "issue", host, rid, id: segments[4] };
  }
  // /nodes/:host/:rid/issues
  if (segments[3] === "issues") {
    return { type: "issues", host, rid };
  }
  // /nodes/:host/:rid/patches/:id
  if (segments[3] === "patches" && segments[4]) {
    return { type: "patch", host, rid, id: segments[4] };
  }
  // /nodes/:host/:rid/patches
  if (segments[3] === "patches") {
    return { type: "patches", host, rid };
  }
  // /nodes/:host/:rid/commits/:sha
  if (segments[3] === "commits" && segments[4]) {
    return { type: "commit", host, rid, sha: segments[4] };
  }

  // /nodes/:host/:rid/history/:branch
  if (segments[3] === "history") {
    return { type: "history", host, rid };
  }

  // /nodes/:host/:rid/remotes/:peer/history/:branch
  if (segments[3] === "remotes" && segments[4] && segments[5] === "history") {
    return { type: "history", host, rid };
  }

  // /nodes/:host/:rid — source, tree, etc. share the repo card
  return { type: "repo", host, rid };
}

function shortenDid(did) {
  const match = /^did:key:(z[a-zA-Z0-9]+)$/.exec(did);
  if (!match) return did;
  const pubkey = match[1];
  return `${pubkey.substring(0, 8)}…${pubkey.slice(-8)}`;
}

function titleForRoute(route) {
  switch (route.type) {
    case "home":
      return "Radicle Explorer · Decentralized Code Collaboration";
    case "node":
      return `Radicle Seed Node · ${route.host}`;
    case "user":
      return `Radicle User · ${shortenDid(route.did)} · ${route.host}`;
    case "repo":
      return `Radicle Repo · ${route.rid} · ${route.host}`;
    case "issues":
      return `Issues · ${route.rid} · ${route.host}`;
    case "patches":
      return `Patches · ${route.rid} · ${route.host}`;
    case "issue":
      return `Issue ${route.id.slice(0, 7)} · ${route.rid} · ${route.host}`;
    case "patch":
      return `Patch ${route.id.slice(0, 7)} · ${route.rid} · ${route.host}`;
    case "commit":
      return `Commit ${route.sha.slice(0, 7)} · ${route.rid} · ${route.host}`;
    case "history":
      return `Commit History · ${route.rid} · ${route.host}`;
    default:
      return "Radicle Explorer · Decentralized Code Collaboration";
  }
}

function descriptionForRoute(route) {
  const h = route.host;
  switch (route.type) {
    case "home":
      return "Explore open-source repositories, issues, and patches on the Radicle peer-to-peer code collaboration network. Sovereign hosting without central servers.";
    case "node":
      return `Browse repositories hosted on the ${h} Radicle seed node. Explore source code, issues, patches, and contributor activity.`;
    case "user":
      return `Radicle user profile on ${h}. Browse repositories, patches, and contributions across the peer-to-peer network.`;
    case "repo":
      return `Radicle repository hosted on ${h}. Browse source code, issues, patches, commit history, and contributor activity.`;
    case "issues":
      return `Browse issues for this repository on ${h}. View bug reports, feature requests, and ongoing discussions on the Radicle network.`;
    case "patches":
      return `Browse patches for this repository on ${h}. View proposed changes, code reviews, and merge status on the Radicle network.`;
    case "issue":
      return `View this issue and its discussion in a Radicle repository on ${h}. Track progress, comments, and resolution.`;
    case "patch":
      return `View this patch and its review in a Radicle repository on ${h}. Browse revisions, review comments, and merge status.`;
    case "commit":
      return `View this commit and its diff in a Radicle repository on ${h}. Inspect changed files, author details, and additions.`;
    case "history":
      return `Browse the commit history of this Radicle repository on ${h}. View commits, contributors, and development activity.`;
    default:
      return "Explore open-source repositories, issues, and patches on the Radicle peer-to-peer code collaboration network.";
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const route = parseRoute(url.pathname);

    if (!route) {
      return env.ASSETS.fetch(request);
    }

    const hostParam = route.type === "home" ? `?host=${url.hostname}` : "";
    const ogImageUrl = `${env.OG_IMAGE_BASE}${url.pathname}${hostParam}`;
    const title = titleForRoute(route);
    const description = descriptionForRoute(route);

    const indexResponse = await env.ASSETS.fetch(
      new Request(new URL("/", url)),
    );
    const html = await indexResponse.text();

    const tags = [
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:description" content="${description}" />`,
      `<meta property="og:image" content="${ogImageUrl}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta property="og:url" content="${url.href}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="Radicle Explorer" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:site" content="@radicle" />`,
      `<meta name="theme-color" content="#1c77ff" />`,
    ].join("\n    ");

    const injected = html.replace("</head>", `  ${tags}\n</head>`);

    return new Response(injected, {
      status: indexResponse.status,
      headers: {
        "content-type": "text/html;charset=UTF-8",
        "cache-control": "public, max-age=300",
      },
    });
  },
};
