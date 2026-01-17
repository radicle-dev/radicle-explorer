import { describe, expect, test } from "vitest";
import * as utils from "@app/lib/utils";

describe("Format functions", () => {
  test.each([
    {
      id: "rad:zKtT7DmF9H34KkvcKj9PHW19WzjT",
      expected: "rad:zKtT7D…19WzjT",
    },
  ])("formatRepositoryId $id => $expected", ({ id, expected }) => {
    expect(utils.formatRepositoryId(id)).toEqual(expected);
  });

  test.each([
    {
      input: "<TR> Hello `new` world",
      expected: "<TR> Hello <code>new</code> world",
    },
    { input: "Hello `new` world", expected: "Hello <code>new</code> world" },
    {
      input: "Hello `new` world `radicle`",
      expected: "Hello <code>new</code> world <code>radicle</code>",
    },
    { input: "Hello `` world", expected: "Hello `` world" },
    { input: "Hello `", expected: "Hello `" },
    { input: "Hello", expected: "Hello" },
  ])("formatInlineTitle $input => $expected", ({ input, expected }) => {
    expect(utils.formatInlineTitle(input)).toEqual(expected);
  });

  test.each([
    {
      id: "did:key:z6MkmzRwg47UWQxczLLLFfkEwpBGitjzJ1vKPE8U9ymd6fz6",
      expected: "did:key:z6Mkmz…md6fz6",
    },
    {
      id: "z6MkmzRwg47UWQxczLLLFfkEwpBGitjzJ1vKPE8U9ymd6fz6",
      expected: "did:key:z6Mkmz…md6fz6",
    },
  ])("formatNodeId $id => $expected", ({ id, expected }) => {
    expect(utils.formatNodeId(id)).toEqual(expected);
  });

  test.each([
    {
      id: "rad:z4V1sjrXqjvFdnCUbxPFqd5p4DtH5",
      expected: "rad:z4V1sj…p4DtH5",
    },
    {
      id: "z4V1sjrXqjvFdnCUbxPFqd5p4DtH5",
      expected: "rad:z4V1sj…p4DtH5",
    },
  ])("formatRepositoryId $id => $expected", ({ id, expected }) => {
    expect(utils.formatRepositoryId(id)).toEqual(expected);
  });

  test.each([
    { commit: "a8a6a979a6261a2ec1ea85fc9a65a4a30aa22cc8", expected: "a8a6a97" },
    { commit: "a8a6a97", expected: "a8a6a97" },
  ])("formatCommit $commit => $expected", ({ commit, expected }) => {
    expect(utils.formatCommit(commit)).toEqual(expected);
  });
});

describe("String Assertions", () => {
  test.each([
    { path: "README.md", expected: true },
    { path: "README.mkd", expected: true },
    { path: "README.markdown", expected: true },
    { path: "", expected: false },
  ])("isMarkdownPath $path => $expected", ({ path, expected }) => {
    expect(utils.isMarkdownPath(path)).toEqual(expected);
  });

  test.each([
    { url: "https://app.radicle.xyz", expected: true },
    { url: "http://app.radicle.xyz", expected: true },
    { url: "http://app", expected: true },
    { url: "://app", expected: false },
    { url: "//app", expected: false },
    { url: "app", expected: false },
  ])("isUrl $url => $expected", ({ url, expected }) => {
    expect(utils.isUrl(url)).toBe(expected);
  });
});

describe("Parse Functions", () => {
  test.each([
    {
      input: "rad:z6MkmzRwg47UWQxczLLLFfkEwpBGitjzJ1vKPE8U9ymd6fz6",
      expected: undefined,
    },
    {
      input: "did:key:z6Mkmz…md6fz6",
      expected: undefined,
    },
    {
      input: "zlatan",
      expected: undefined,
    },
    {
      input: "z6MkmzRwg47UWQxczLLLFfkEwpBGitjzJ1vKPE8U9ymd6fz6",
      expected: {
        prefix: "did:key:",
        pubkey: "z6MkmzRwg47UWQxczLLLFfkEwpBGitjzJ1vKPE8U9ymd6fz6",
      },
    },
    {
      input: "did:key:z6MkmzRwg47UWQxczLLLFfkEwpBGitjzJ1vKPE8U9ymd6fz6",
      expected: {
        prefix: "did:key:",
        pubkey: "z6MkmzRwg47UWQxczLLLFfkEwpBGitjzJ1vKPE8U9ymd6fz6",
      },
    },
  ])("parseNodeId", ({ input, expected }) => {
    expect(utils.parseNodeId(input)).toEqual(expected);
  });
});

describe("Path Manipulation", () => {
  test.each([
    {
      imagePath: "/assets/images/tux.png",
      base: "/",
      origin: "https://app.radicle.xyz",
      expected: "assets/images/tux.png",
    },
    {
      imagePath: "/tux.md",
      base: "/components/assets/README.md",
      origin: "http://localhost:3000",
      expected: "tux.md",
    },
    {
      imagePath: "assets/images/tux.png",
      base: "/",
      origin: "https://app.radicle.xyz",
      expected: "assets/images/tux.png",
    },
    {
      imagePath: "assets/images/tux.png",
      base: "/",
      origin: "http://localhost:3000",
      expected: "assets/images/tux.png",
    },
    {
      imagePath: "../tux.png",
      base: "/components/assets/README.md",
      origin: "http://localhost:3000",
      expected: "components/tux.png",
    },
    {
      imagePath: "../tux.png",
      base: "/components/assets/",
      origin: "http://localhost:3000",
      expected: "components/tux.png",
    },
    {
      imagePath: "../../tux.png",
      base: "/components/assets/images/README.md",
      origin: "http://localhost:3000",
      expected: "components/tux.png",
    },
  ])(
    "canonicalize origin: $origin base: $base, path: $imagePath => $expected",
    ({ imagePath, base, expected, origin }) => {
      expect(utils.canonicalize(imagePath, base, origin)).toEqual(expected);
    },
  );
});

describe("Date Manipulation", () => {
  test.each([
    { from: new Date("2022-01-01"), to: new Date("2022-02-01"), expected: 31 },
    { from: new Date("2022-01-01"), to: new Date("2022-01-02"), expected: 1 },
    { from: new Date("2022-01-01"), to: new Date("2022-01-01"), expected: 0 },
  ])("getDaysPassed expected: $expected ", ({ from, to, expected }) => {
    expect(utils.getDaysPassed(from, to)).toEqual(expected);
  });
  test.each([
    {
      from: new Date("2022-01-01 12:00:00"),
      to: new Date("2022-01-01 12:00:00"),
      expected: "now",
    },
    {
      from: new Date("2022-01-01 12:00:00"),
      to: new Date("2022-01-01 12:00:01"),
      expected: "1 second ago",
    },
    {
      from: new Date("2022-01-01 12:00:00"),
      to: new Date("2022-01-01 12:01:01"),
      expected: "1 minute ago",
    },
    {
      from: new Date("2022-01-01 12:00:00"),
      to: new Date("2022-01-01 13:01:01"),
      expected: "1 hour ago",
    },
    {
      from: new Date("2022-01-01 12:00:00"),
      to: new Date("2022-01-02 13:01:01"),
      expected: "yesterday",
    },
    {
      from: new Date("2022-01-01 12:00:00"),
      to: new Date("2022-01-04 13:01:01"),
      expected: "3 days ago",
    },
    {
      from: new Date("2022-01-01 12:00:00"),
      to: new Date("2022-02-02 13:01:01"),
      expected: "last month",
    },
    {
      from: new Date("2022-01-01 12:00:00"),
      to: new Date("2022-04-02 13:01:01"),
      expected: "3 months ago",
    },
    {
      from: new Date("2022-01-01 12:00:00"),
      to: new Date("2023-04-02 12:00:00"),
      expected: "more than a year ago",
    },
    {
      from: new Date("2022-03-05 12:00:00"),
      to: new Date("2026-04-02 12:00:00"),
      expected: "more than a year ago",
    },
  ])("formatTimestamp expected: $expected", ({ from, to, expected }) => {
    expect(utils.formatTimestamp(from.getTime() / 1000, to.getTime())).toEqual(
      expected,
    );
  });
});

describe("isLocal", () => {
  describe("returns true for valid local addresses", () => {
    test.each([
      { addr: "localhost", description: "bare localhost" },
      { addr: "app.localhost", description: "localhost subdomain" },
      {
        addr: "deeper.app.localhost",
        description: "nested localhost subdomain",
      },
      {
        addr: "deeper.app.localhost:8080",
        description: "nested localhost subdomain with port",
      },
      { addr: "127.0.0.1", description: "IPv4 loopback" },
      { addr: "127.0.0.1:8080", description: "IPv4 loopback with port" },
      { addr: "[::1]", description: "IPv6 loopback" },
      {
        addr: "localhost:3000",
        description: "localhost with port",
      },
    ])("$description: $addr", ({ addr }) => {
      expect(utils.isLocal(addr)).toBe(true);
    });
  });

  describe("returns false for invalid/remote addresses", () => {
    test.each([
      { addr: "example.com", description: "remote domain" },
      {
        addr: "notlocalhost",
        description: "domain that ends with 'localhost'",
      },
      {
        addr: "127.0.0.1.evil.com",
        description: "malicious domain mimicking loopback",
      },
      { addr: "192.168.1.1", description: "private network IP" },
      { addr: "10.0.0.1", description: "another private network IP" },
      { addr: "", description: "empty string" },
      { addr: "not a url", description: "invalid URL format" },
      { addr: "localhost.com", description: "domain with localhost in name" },
      { addr: "mylocalhost.com", description: "domain containing localhost" },
      {
        addr: "http://example.com",
        description: "remote domain with scheme",
      },
    ])("$description: $addr", ({ addr }) => {
      expect(utils.isLocal(addr)).toBe(false);
    });
  });
});
