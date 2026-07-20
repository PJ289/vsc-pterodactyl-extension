# Change Log

All notable changes to the "pterodactyl-sftp" extension will be documented in this file.

## [2.0.7] - 2026-07-15

### Added
- **Agent write tools** — MCP/LM tools: `write_file`, `delete_path`, `create_directory`, `rename_path`, and `get_permissions`.
- **Configurable agent permissions** — Settings `pterodactyl.agent.mode` (read-only/read-write), `pterodactyl.agent.allowedPaths`, and `pterodactyl.agent.blockedPaths` control what the agent can modify on remote servers.

## [2.0.6] - 2026-07-09

### Fixed
- **Cursor MCP registration** — Cursor does not support VS Code's `registerMcpServerDefinitionProvider`. The extension now uses `vscode.cursor.mcp.registerServer` so the MCP server appears in Cursor Settings after install.
- **Manual MCP fallback** — New command **Pterodactyl: Setup Agent MCP** generates copy-paste JSON for `~/.cursor/mcp.json` when auto-registration is unavailable.
- Agent bridge now starts before MCP registration (fixes empty bridge URL on first launch).

## [2.0.5] - 2026-07-09

### Added
- **AI agent access via MCP** — When a server is connected the extension automatically registers an MCP stdio server (`Pterodactyl SFTP`) that Cursor, Copilot agent mode, and other MCP-aware tools discover without any manual configuration.
- Five read-only tools exposed to agents: `list_servers`, `list_directory`, `read_file`, `get_file_tree`, and `search_text`. All operate over the live SFTP connection; no files are downloaded to disk.
- `RemoteFileAgentService` — shared in-process service that calls `vscode.workspace.fs` with `ptero://` URIs, so the same logic powers both MCP and VS Code Language Model Tools.
- `AgentBridge` — lightweight HTTP server on `127.0.0.1` with a per-session token, bridging the out-of-process MCP stdio server to the extension host.
- Language Model Tools registration (`vscode.lm.registerTool`) for VS Code Copilot agent mode. Tools are referenceable as `#pteroServers`, `#pteroList`, `#pteroRead`, `#pteroTree`, `#pteroSearch`.
- Engines bumped to VS Code 1.99+ (required for MCP and LM Tools APIs).

## [2.0.4] - 2026-06-07

### Fixed
- **Extension activation**: VSIX packages now always include runtime dependencies (`ssh2`, `ws`). A broken package without `node_modules` caused `command 'pterodactyl.*' not found` errors.
- **Release CI**: Package on `windows-latest` (native modules for Windows/Cursor), enforce minimum VSIX size, and remove `draft: true` so assets attach to the published release.
- CI verifies the packaged `.vsix` contains `node_modules/ssh2` and `node_modules/ws` before uploading to GitHub Releases.

## [2.0.3] - 2026-06-07

### Added
- **Custom SFTP host per server**: Override SFTP IP/FQDN and port while keeping the panel API on its domain. Use **Configure SFTP Host** from the server context menu.
- **Documentation**: Build, VSIX install, and Cursor/VS Code installation instructions in README.

### Changed
- Expanded `.gitignore` to exclude build artifacts, dependencies, logs, and environment files.
- Removed VS Code Marketplace / Open VSX publish workflow; releases are distributed as `.vsix` on GitHub only.

## [2.0.2] - 2026-02-16

- **Fix**: Restored the "Generate Key Pair" button in the manual SSH configuration section of the Add/Edit Account form.

## [2.0.1] - 2026-02-16

- **Fix**: Resolved "Unsupported key format" error by switching Ed25519 key generation to OpenSSH format, ensuring full compatibility with SFTP authentication.

## [2.0.0] - 2026-02-16

### Major UI & UX Overhaul
- **New Premium Design**: Completely redesigned the "Add Account" form with a Pterodactyl-inspired theme for a more professional look and better compatibility with VS Code themes.
- **Embedded SSH Auto-Setup**: You can now automatically generate, save, and upload SSH keys directly during account creation. No manual copy-pasting required.
- **Improved Validation**: Added real-time error feedback and better field validation in the setup process.
- **Documentation**: Added a comprehensive [Vietnamese Tutorial](tutorial.html) integrated into the extension.

## [1.6.4] - 2026-02-16

- Added **Auto SSH Key Setup** feature (`Pterodactyl: Setup Auto SSH Key`).
- Automatically generates Ed25519 keys and uploads them to the Panel.

## [1.6.3] - 2026-02-16

- Updated repository URL
- Improved extension icon

## [1.6.2] - 2026-02-16

- Fixed npm warnings and deprecated dependencies
- Validated release workflow permissions

## [1.6.1] - 2026-02-16

- Improved release workflow automation
- Updated dependencies
- Use PNG icon for marketplace compatibility

## [1.0.0] - 2026-02-16

- Initial release
- Added multi-account support
- Added SFTP file system provider
- Added server power controls (Start, Stop, Restart, Kill)
- Added integrated server terminal
