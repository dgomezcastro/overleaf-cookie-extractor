# Overleaf Cookie for VS Code

A small Firefox extension that copies your Overleaf session cookie to the clipboard, so you
can paste it into the [Overleaf Workshop](https://marketplace.visualstudio.com/items?itemName=iamhyc.overleaf-workshop)
VS Code extension using **Login with Cookies**.

## Features

- One click copies `overleaf_session2=…` (overleaf.com) or `sharelatex.sid=…` (self-hosted /
  Community Edition), which is exactly the `Cookie` header value Overleaf Workshop expects.
- Works with self-hosted Overleaf servers. Permission for the server is requested only when
  you use it.
- Supports Firefox Multi-Account Containers and First-Party Isolation.
- Optional "Copy all cookies" mode (`a=1; b=2`).
- Light and dark themes.

## Install

### Temporary (for development)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and select `manifest.json`.

The add-on is removed when Firefox restarts.

### Permanent

Release Firefox only installs signed add-ons. Sign it as an unlisted add-on
(see [Development](#development)), then install the generated `.xpi`.

## Usage

1. Log in to Overleaf in Firefox.
2. Click the extension icon. The server defaults to `https://www.overleaf.com`. If the
   current tab is on an Overleaf server, it's filled in for you, or click **Tab**.
3. Click **Copy cookie**. For a self-hosted server, allow the permission prompt.
4. In VS Code, run **Overleaf Workshop: Login with Cookies**, enter the server URL and
   paste the cookie.

## Security

The session cookie is equivalent to your password: anyone who has it can access your
Overleaf account until the session expires or you log out. Don't paste it anywhere other
than Overleaf Workshop. The extension makes no network requests and stores only the last
server URL and the checkbox state.

## Development

```sh
npx web-ext lint          # static checks
npx web-ext run           # launch Firefox with the extension loaded
npx web-ext build         # package into web-ext-artifacts/
npx web-ext sign --channel=unlisted --api-key=… --api-secret=…   # sign for permanent install
```

## Releases (CI)

`.github/workflows/build.yml` runs on every push and pull request. It lints the extension
and uploads an **unsigned** `.xpi` as a workflow artifact. Unsigned builds work only via
`about:debugging`, or in Firefox Developer Edition / Nightly with
`xpinstall.signatures.required` set to `false`.

To get a **signed** `.xpi` that installs in regular Firefox:

1. Create API credentials at <https://addons.mozilla.org/developers/addon/api/key/>.
2. Add them as repository secrets `AMO_JWT_ISSUER` and `AMO_JWT_SECRET`
   (Settings → Secrets and variables → Actions).
3. Bump `version` in `manifest.json`, commit, then tag and push:
   ```sh
   git tag v1.0.0 && git push origin v1.0.0
   ```

The workflow signs the add-on as unlisted on AMO and attaches the signed `.xpi` to the
GitHub Release for that tag. If the release doesn't exist yet, it is created as a **draft**;
publish it from the Releases page when ready. AMO accepts each version only once, so every release needs a new
version number.

## License

[MIT](LICENSE) © 2026 David Gómez-Castro
