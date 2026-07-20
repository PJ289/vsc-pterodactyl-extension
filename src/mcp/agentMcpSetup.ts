import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AgentBridge } from '../agent/agentBridge';
import { getCursorMcpName } from './registerCursorMcp';

/**
 * Manual MCP setup helper for environments without extension MCP APIs.
 * Writes bridge credentials to globalStorage and shows copy-paste config.
 */
export async function showManualMcpSetup(
    context: vscode.ExtensionContext,
    bridge: AgentBridge,
): Promise<void> {
    if (!bridge.bridgeUrl || !bridge.bridgeToken) {
        vscode.window.showErrorMessage(
            'Agent bridge is not running. Reload the window and try again.',
        );
        return;
    }

    const serverJsPath = path.join(context.extensionPath, 'out', 'mcp', 'server.js');
    const configPath = path.join(context.globalStorageUri.fsPath, 'mcp-bridge.json');

    await fs.promises.mkdir(context.globalStorageUri.fsPath, { recursive: true });
    await fs.promises.writeFile(
        configPath,
        JSON.stringify({ url: bridge.bridgeUrl, token: bridge.bridgeToken }, null, 2),
        'utf-8',
    );

    const mcpConfig = {
        mcpServers: {
            [getCursorMcpName()]: {
                command: 'node',
                args: [serverJsPath],
                env: {
                    PTERO_BRIDGE_URL: bridge.bridgeUrl,
                    PTERO_BRIDGE_TOKEN: bridge.bridgeToken,
                },
            },
        },
    };

    const json = JSON.stringify(mcpConfig, null, 2);

    const doc = await vscode.workspace.openTextDocument({
        content: [
            '# Pterodactyl SFTP — Manual MCP setup',
            '',
            'Cursor does not always auto-register extension MCP servers.',
            'Add this to Cursor Settings → MCP (or ~/.cursor/mcp.json):',
            '',
            json,
            '',
            `Bridge session file: ${configPath}`,
            '',
            'After adding, reload the window. Connect a server in the Pterodactyl sidebar first.',
        ].join('\n'),
        language: 'markdown',
    });
    await vscode.window.showTextDocument(doc, { preview: false });

    const copy = await vscode.window.showInformationMessage(
        'MCP manual setup opened. Copy the JSON block into Cursor MCP settings.',
        'Copy JSON',
    );
    if (copy === 'Copy JSON') {
        await vscode.env.clipboard.writeText(json);
        vscode.window.showInformationMessage('MCP config copied to clipboard.');
    }
}
