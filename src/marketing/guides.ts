export interface Guide {
  title: string;
  description: string;
  href: string;
  image: string;
  external: boolean;
  video: boolean;
}

// Ordered newest first; the first entry is featured as the latest guide on the
// Learn page, and the next entries fill the small guide grid beneath it.
export const guides: Guide[] = [
  {
    title: "Getting Started",
    description:
      "New to Radicle? This quick-start walks you through installing the stack, creating your identity, and opening your first patch.",
    href: "/guides/getting-started",
    image: "/marketing/images/learn/getting-started.jpg",
    external: false,
    video: false,
  },
  {
    title: "Protocol Guide",
    description:
      "Gossip, replication, identity, and the data structures behind it all.",
    href: "/guides/protocol",
    image: "/marketing/images/learn/protocol.jpg",
    external: false,
    video: false,
  },
  {
    title: "Seeder Guide",
    description: "Run a public seed node to keep repositories available 24/7.",
    href: "/guides/seeder",
    image: "/marketing/images/learn/seeder.jpg",
    external: false,
    video: false,
  },
  {
    title: "User Guide",
    description:
      "Create an identity, open patches, manage issues, and collaborate from the CLI.",
    href: "/guides/user",
    image: "/marketing/images/learn/user.jpg",
    external: false,
    video: false,
  },
  {
    title: "Private collaboration over Radicle Garden",
    description:
      "Collaborate on a private repository from behind NAT firewalls, using Garden as an always-on relay.",
    href: "https://radicle.garden/blog/private-collaboration-powered-by-garden",
    image: "/marketing/images/garden-bg.png",
    external: true,
    video: false,
  },
  {
    title: "Custom Domains on Radicle Garden",
    description:
      "Set up a custom domain for your repositories on Radicle Garden.",
    href: "https://www.youtube.com/watch?v=KDbajeSTtjk",
    image: "https://img.youtube.com/vi/KDbajeSTtjk/maxresdefault.jpg",
    external: true,
    video: true,
  },
];
