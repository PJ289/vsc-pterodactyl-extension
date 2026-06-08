# Pterodactyl SFTP for VS Code 🦕

Manage your Pterodactyl panel servers directly from VS Code or Cursor. Browse, edit, and sync files over SFTP with panel API integration.

[📖 User guide (tutorial.html)](./tutorial.html)

## Features

- **Server management** — List all servers from one or more panel accounts in the Pterodactyl SFTP sidebar.
- **SFTP file editing** — Connect to a server, mount its files as a workspace folder, and edit/save directly in the editor.
- **Custom SFTP host (per server)** — Keep the panel API on its public domain while overriding SFTP host/port per server (e.g. a local IP). Right-click a server → **Configure SFTP Host**.
- **Power actions** — Start, stop, restart, and kill servers from the context menu.
- **Terminal access** — Open a console terminal for live logs and commands.
- **Multi-account support** — Add, edit, remove, import, and export panel accounts.
- **SSH key setup** — Generate Ed25519 keys in Node.js, save them locally, and upload the public key to the panel automatically (**Pterodactyl: Setup Auto SSH Key**, or during account creation).

## Requirements

1. **Pterodactyl Panel URL** — e.g. `https://panel.example.com`
2. **Client API key** — from your Pterodactyl account settings

## Usage

1. Open the **Pterodactyl SFTP** view in the Activity Bar.
2. Click **Add Account** (+) and enter your panel URL and API key.
3. Your servers appear automatically under each account.
4. **Right-click** a server to:
   - **Connect** — mount server files as a workspace folder
   - **Configure SFTP Host** — set a custom IP/FQDN and port for SFTP only
   - **Open Terminal** — server console
   - **Start / Stop / Restart / Kill** — power actions

## Install

Download `pterodactyl-sftp-2.0.4.vsix` from [GitHub Releases](https://github.com/PJ289/vsc-pterodactyl-extension/releases) or build it locally (see below).

1. Open **Extensions** (`Ctrl+Shift+X`).
2. Click **`...`** → **Install from VSIX...**
3. Select the `.vsix` file (~2.5–3 MB on Windows builds; **not** ~180 KB).
4. Reload the window when prompted.

**Cursor:**

```bash
cursor --install-extension "path/to/pterodactyl-sftp-2.0.4.vsix"
```

**VS Code:**

```bash
code --install-extension "path/to/pterodactyl-sftp-2.0.4.vsix"
```

### Development mode

1. Clone the repo and run `npm install && npm run compile`.
2. Press **F5** to open an Extension Development Host window with the extension loaded.

## Build from Source

```bash
git clone https://github.com/PJ289/vsc-pterodactyl-extension.git
cd vsc-pterodactyl-extension
npm install
npm run compile
```

To create an installable package:

```bash
npm run package
```

This produces `pterodactyl-sftp-2.0.4.vsix` in the project root.

> **Important:** Use `npm run package` or `npx vsce package` **without** `--no-dependencies`. A ~180 KB `.vsix` is missing runtime dependencies and will fail to activate.

## GitHub Releases

Publishing a release triggers CI, which builds the `.vsix` on Windows and attaches it to the release. The extension is **not** published to the VS Code Marketplace.

1. Update `package.json` and `CHANGELOG.md` for the new version.
2. Create a GitHub release with tag `v2.0.4` (must match `CHANGELOG.md` as `[2.0.4]`).
3. Click **Publish release** — the **Release Extension** workflow uploads the `.vsix`.

## Known Issues

- Large file transfers depend on network speed.
- SFTP ports must be reachable on the target host/node.

### `command 'pterodactyl.*' not found`

The extension failed to activate, usually because the `.vsix` is missing `node_modules`. Reinstall from a proper release or run `npm run package` locally, then reload the window (`Ctrl+Shift+P` → **Developer: Reload Window**). Check **Output → Extension Host** for `Cannot find module 'ssh2'`.

## Credits

- **Original extension** — [MinhMCPC/Pterodactyl-extension](https://github.com/MinhMCPC/Pterodactyl-extension) by [minhmcpc](https://github.com/MinhMCPC)
- **Fork (v2.0.3+)** — [PJ289/vsc-pterodactyl-extension](https://github.com/PJ289/vsc-pterodactyl-extension) by [PJ289](https://github.com/PJ289) — custom SFTP host per server, GitHub-only releases, packaging/CI fixes, and Cursor install docs

## License

MIT — see [LICENSE.md](./LICENSE.md).
