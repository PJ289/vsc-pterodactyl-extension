# Pterodactyl SFTP for VS Code 🦕

Manage your Pterodactyl panel servers directly from VS Code. Browse, edit, and sync files with high security and speed.

[📖 Tài liệu hướng dẫn sử dụng (Tiếng Việt)](file:///./tutorial.html)

## Features

### 🔑 Auto SSH Key Setup (New in v1.6.4)
NOTE: This feature requires `ssh-keygen` behavior but is fully implemented in Node.js.
1.  Open the Command Palette (`Ctrl+Shift+P`).
2.  Run **Pterodactyl: Setup Auto SSH Key**.
3.  Select the account you want to configure.
4.  Enter a name for the key (e.g., `VSCode Key`) and an optional passphrase.
5.  The extension will:
    *   Generate a secure **Ed25519** SSH key pair.
    *   **Save the Private Key** to your local `.ssh` directory.
    *   **Upload the Public Key** automatically to your Pterodactyl Panel account.

-   **Server Management**: View all your servers in the "Pterodactyl SFTP" view.
-   **SFTP Integration**:
    -   Connect to servers via SFTP protocol automatically.
    -   Browse, open, edit, and save files directly in VS Code.
    -   File operations upload seamlessly to your server.
-   **Power Actions**:
    -   Start, Stop, Restart, and Kill servers from the context menu or command palette.
-   **Terminal Access**:
    -   Open a streamlined terminal to send commands to your server console.
-   **Account Management**:
    -   Add multiple Pterodactyl API accounts.
    -   Import/Export account data for backup.
-   **Custom SFTP Host (per server)**:
    -   Keep the panel API on its public domain.
    -   Override SFTP host/port per server (e.g. local IP `192.168.1.10`).
    -   Right-click a server → **Configure SFTP Host**.

## Requirements

To use this extension, you need:

1.  **Pterodactyl Panel URL**: The URL to your panel (e.g., `https://panel.example.com`).
2.  **API Key**: A client API key from your Pterodactyl account settings.

## Usage

1.  Open the **Pterodactyl SFTP** view in the Activity Bar (icon looks like a feather/wing).
2.  Click the **Add Account** (+) button.
3.  Enter your Panel URL and API Key.
4.  Once added, your servers will list automatically.
5.  **Right-click** a server to:
    -   **Connect**: Mounts the server files as a workspace folder.
    -   **Configure SFTP Host**: Set a custom IP/FQDN and port for SFTP only.
    -   **Terminal**: Opens a console interface.
    -   **Power**: Start/Stop/Restart/Kill.

## Build from Source

```bash
git clone https://github.com/MinhMCPC/Pterodactyl-extension.git
cd Pterodactyl-extension
npm install
npm run compile
```

To create an installable package (`.vsix`):

```bash
npx vsce package
```

This generates a file like `pterodactyl-sftp-2.0.3.vsix` in the project root.

## Install in VS Code or Cursor

Cursor is compatible with VS Code extensions. You can install this extension in three ways:

### Option A — Install from VSIX (recommended for local builds)

1. Build the package (see above) or download a `.vsix` release.
2. Open **Extensions** (`Ctrl+Shift+X`).
3. Click the **`...`** menu at the top of the Extensions panel.
4. Choose **Install from VSIX...**
5. Select `pterodactyl-sftp-2.0.3.vsix` (or the version you built).
6. Reload Cursor/VS Code when prompted.

**Command line (Cursor):**

```bash
cursor --install-extension "C:\path\to\pterodactyl-sftp-2.0.3.vsix"
```

**Command line (VS Code):**

```bash
code --install-extension "C:\path\to\pterodactyl-sftp-2.0.3.vsix"
```

### Option B — Run in development mode

1. Open this repository in Cursor or VS Code.
2. Run `npm install` and `npm run compile`.
3. Press **F5** (or **Run → Start Debugging**).
4. A new **Extension Development Host** window opens with the extension loaded.

Use this while developing or testing changes before packaging.

Use this while developing or testing changes before packaging.

## Publish a GitHub Release

Publishing a GitHub **Release** triggers CI and attaches the compiled `.vsix` to the release. The extension is **not** published to the VS Code Marketplace; install it from the release asset or a local build.

Steps:

1. Merge/commit all changes with `package.json` version and `CHANGELOG.md` updated (e.g. `2.0.3`).
2. On GitHub: **Releases → Draft a new release**.
3. Create tag **`v2.0.3`** (or `2.0.3`; must match the version in `CHANGELOG.md` as `[2.0.3]`).
4. Set the release title to `2.0.3` and paste the changelog section if you want.
5. Click **Publish release**.

The **Release Extension** workflow runs `npm ci`, packages with `vsce`, and uploads `pterodactyl-sftp-2.0.3.vsix` to the release assets.

## Extension Settings

This extension contributes the following settings:

*   `pterodactyl.addAccount`: Add a new Pterodactyl account.
*   `pterodactyl.refreshServers`: Refresh the list of servers.

## Known Issues

-   Large file transfers may take time depending on network connection.
-   Ensure your Pterodactyl node has SFTP ports open and accessible.

## Release Notes

### 1.0.0

Initial release of Pterodactyl SFTP extension.
-   Multi-account support.
-   SFTP file editing.
-   Power management.
-   Console terminal.
