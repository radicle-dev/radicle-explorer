# Radicle Explorer

This user interface lets you interact with [Radicle][rad], a peer-to-peer code
collaboration and publishing stack, directly from your web browser.

**Deployment Options:**

* **Public Server:** The Radicle team maintains a public instance at [app.radicle.xyz][app]
* **Local-first:** Run the UI locally
* **Self-hosting:** Deploy the UI on your own server


## Local-first

**Prerequisites:**

* Recent versions of [Node.js][nod] (20.9.0 or higher) and [npm][npm] installed

Run the following commands to access the web UI locally:

``` shell
git clone https://seed.radicle.xyz/z4V1sjrXqjvFdnCUbxPFqd5p4DtH5.git radicle-explorer
cd radicle-explorer
npm install
npm start
```

Then open http://localhost:3000 in your favourite browser.


## Self-Hosting the UI

There are several ways to deploy the UI publicly. Here are two common options:

**Using your own web server:**

1. Run `npm install && npm build` to create a build for deployment
2. Configure your web server to serve the contents of the `/build` directory

**Using Vercel (or similar static file hosting):**

1. Fork this repository to create your own version
2. Configure your Vercel account to deploy the forked repository

**Add Rewrite Rules for Client-Side Routing**

The explorer is a single-page application (SPA). To ensure that all routes are handled correctly, add a rewrite rule to your web server configuration. For example:

Caddy:

```
example.com {
    rewrite * /index.html
}
```

## Configuration

There are two ways to configure the UI: **at build time** and **at run time**.

### Build-Time Configuration

This method is recommended when deploying to static hosting platforms such
as Vercel.

#### Option 1: Create a `local.json` file

1. Copy [`default.json`][def] to a new file in the same directory called
   `local.json`.
2. Modify the properties in `local.json` to suit your setup.

#### Option 2: Use environment variables

1. Refer to [`custom-environment-variables.json`][env] for a list of supported
   environment variables.
2. Set the desired variables in your environment before building the UI.

> For advanced configuration options, refer to the [`node-config`][nco]
> documentation.


### Run-Time Configuration

This method is useful when the app is distributed as a precompiled static
JS/HTML bundle, such as when installed via a package manager.

You can build the app in a mode that loads configuration dynamically from the
server it's deployed to, instead of bundling it at build time.

To enable this behavior, set the environment variable `VITE_RUNTIME_CONFIG=true`
during the build:

```bash
VITE_RUNTIME_CONFIG=true npm run build
```

This will inject a blocking script into the `index.html` that attempts to load
the configuration from a pre-defined location (`/config.json`) on the server.

The config file must be served as static content and must be publicly accessible.
The structure of the runtime `config.json` must match the shape of the
application's base configuration defined in `config/default.json`.


## Contributing

* For detailed contribution guidelines, refer to the [CONTRIBUTING.md][con]
  file
* To propose changes, open an [issue][iss] or submit a [patch][pat] using
  Radicle


## Getting in touch

To get in touch with the maintainers, sign up to our
[official chat on Zulip][zul].


## License

The UI is distributed under the terms of GPLv3. See [LICENSE][lic] for details.



[app]: https://app.radicle.xyz
[con]: ./CONTRIBUTING.md
[def]: ./config/default.json
[env]: ./config/custom-environment-variables.json
[iss]: https://app.radicle.xyz/nodes/iris.radicle.xyz/rad:z4V1sjrXqjvFdnCUbxPFqd5p4DtH5/issues
[lic]: ./LICENSE
[nco]: https://github.com/node-config/node-config/wiki/Configuration-Files
[nod]: https://nodejs.org
[npm]: https://www.npmjs.com
[pat]: https://app.radicle.xyz/nodes/iris.radicle.xyz/rad:z4V1sjrXqjvFdnCUbxPFqd5p4DtH5/patches
[rad]: https://radicle.xyz
[zul]: https://radicle.zulipchat.com/#narrow/stream/369278-web
