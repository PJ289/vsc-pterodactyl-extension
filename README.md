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

Download the latest `pterodactyl-sftp-*.vsix` from [GitHub Releases](https://github.com/PJ289/vsc-pterodactyl-extension/releases) or build it locally (see below).

1. Open **Extensions** (`Ctrl+Shift+X`).
2. Click **`...`** → **Install from VSIX...**
3. Select the `.vsix` file (~2.5–3 MB on Windows builds; **not** ~180 KB).
4. Reload the window when prompted.

**Cursor:**

```bash
cursor --install-extension "path/to/pterodactyl-sftp-<version>.vsix"
```

**VS Code:**

```bash
code --install-extension "path/to/pterodactyl-sftp-<version>.vsix"
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

This produces `pterodactyl-sftp-<version>.vsix` in the project root.

> **Important:** Use `npm run package` or `npx vsce package` **without** `--no-dependencies`. A ~180 KB `.vsix` is missing runtime dependencies and will fail to activate.

## GitHub Releases

Publishing a release triggers CI, which builds the `.vsix` on Windows and attaches it to the release. The extension is **not** published to the VS Code Marketplace.

1. Update `package.json` and `CHANGELOG.md` for the new version.
2. Create a GitHub release with tag `v<version>` (must match `CHANGELOG.md` as `[<version>]`).
3. Click **Publish release** — the **Release Extension** workflow uploads the `.vsix`.

## AI Agent access (MCP)

When a server is connected, the extension automatically registers an MCP server called **Pterodactyl SFTP** that gives AI agents (Cursor, Copilot agent mode, Cline, etc.) full read access to the remote file system — without downloading files or needing them open in the editor.

### How it works

The extension starts a local HTTP bridge in the VS Code process and registers an MCP stdio server (`out/mcp/server.js`) that proxies tool calls through it. Both Cursor's built-in MCP support and VS Code Copilot agent mode pick this up automatically.

### Available tools

| Tool | Reference | Description |
|------|-----------|-------------|
| `list_servers` | `#pteroServers` | Lists all currently connected servers |
| `list_directory` | `#pteroList` | Lists files/directories at a remote path |
| `read_file` | `#pteroRead` | Reads a remote file without opening it |
| `get_file_tree` | `#pteroTree` | Recursive directory tree (metadata only) |
| `search_text` | `#pteroSearch` | Regex search across remote text files |
| `get_permissions` | `#pteroPerms` | Shows current agent permission settings |
| `write_file` | `#pteroWrite` | Create or overwrite a remote file |
| `delete_path` | `#pteroDelete` | Delete a file or directory |
| `create_directory` | `#pteroMkdir` | Create a remote directory |
| `rename_path` | `#pteroRename` | Rename or move a file/directory |
| `send_console_command` | `#pteroConsole` | Send a server console command |

Write tools require **read-write** mode. Console commands require **`pterodactyl.agent.allowConsole: true`**.

### Agent permissions

Control what the AI agent can do via **Settings → search "Pterodactyl Agent"**:

| Setting | Default | Description |
|---------|---------|-------------|
| `pterodactyl.agent.mode` | `read-only` | Set to `read-write` to allow create/edit/delete/rename via MCP |
| `pterodactyl.agent.allowedPaths` | `[]` (all) | Restrict writes to these paths only, e.g. `["/plugins", "/config"]` |
| `pterodactyl.agent.blockedPaths` | world, logs… | Paths the agent can never modify |
| `pterodactyl.agent.allowConsole` | `false` | Allow agents to send console commands |

Example — full file access except world/logs, plus console:

```json
{
  "pterodactyl.agent.mode": "read-write",
  "pterodactyl.agent.allowedPaths": [],
  "pterodactyl.agent.blockedPaths": ["/world", "/world_nether", "/world_the_end", "/logs"],
  "pterodactyl.agent.allowConsole": true
}
```

Example — only plugins folder:

```json
{
  "pterodactyl.agent.mode": "read-write",
  "pterodactyl.agent.allowedPaths": ["/plugins"],
  "pterodactyl.agent.blockedPaths": []
}
```

The agent can call `get_permissions` to check the current config before attempting writes.

### Requirements

- The server must be **connected** first (right-click → Connect in the sidebar).
- Cursor or VS Code 1.99+ with MCP / Copilot agent mode support.

### Usage in Cursor

> **Note:** Cursor does **not** support VS Code's `registerMcpServerDefinitionProvider` API. This extension uses Cursor's own API (`vscode.cursor.mcp.registerServer`) when available.

1. Install extension **2.0.6+** and **reload** the window.
2. Connect a server in the Pterodactyl SFTP sidebar (right-click → **Connect**).
3. Open **Cursor Settings → MCP** — you should see **`pterodactyl-sftp`** listed and enabled.
4. If it does **not** appear automatically:
   - Run command **`Pterodactyl: Setup Agent MCP`** (`Ctrl+Shift+P`)
   - Copy the JSON shown into **Cursor Settings → MCP** (or `~/.cursor/mcp.json`)
   - Reload the window again
5. Use **Agent mode** and ask about remote files.

### Usage in VS Code Copilot agent mode

The same tools are registered as Language Model Tools and appear in the Copilot tools picker. You can also reference them directly with `#pteroServers`, `#pteroRead`, etc.

### Limitations

- The agent cannot browse `ptero://` URIs with native shell tools (`rg`, `ls`); it must use these MCP/LM tools instead.
- Search over very large or deep trees can be slow; use the `path` parameter to narrow the scope.
- Files larger than 2 MB are skipped during text search.
- There is no real-time file-change notification — listings are fetched live on each call.

## Known Issues

- Large file transfers depend on network speed.
- SFTP ports must be reachable on the target host/node.

### `command 'pterodactyl.*' not found`

The extension failed to activate, usually because the `.vsix` is missing `node_modules`. Reinstall from a proper release or run `npm run package` locally, then reload the window (`Ctrl+Shift+P` → **Developer: Reload Window**). Check **Output → Extension Host** for `Cannot find module 'ssh2'`.

## Extension ID

This fork is published as **`PJ289.pterodactyl-sftp`**.

It is separate from the original Marketplace extension (`minhmcpc.pterodactyl-sftp`). Cursor/VS Code will not replace one with the other. If you previously installed the original, uninstall it first to avoid having two extensions side by side.

## Credits

- **Original extension** — [MinhMCPC/Pterodactyl-extension](https://github.com/MinhMCPC/Pterodactyl-extension) by [minhmcpc](https://github.com/MinhMCPC)
- **Fork (v2.0.3+)** — [PJ289/vsc-pterodactyl-extension](https://github.com/PJ289/vsc-pterodactyl-extension) by [PJ289](https://github.com/PJ289) — custom SFTP host, AI agent MCP tools, GitHub-only releases, packaging/CI fixes, and Cursor install docs

## License

MIT — see [LICENSE.md](./LICENSE.md).
