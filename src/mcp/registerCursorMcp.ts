import * as vscode from 'vscode';
import * as path from 'path';
import { AgentBridge } from '../agent/agentBridge';
import { Logger } from '../utils/logger';

const CURSOR_MCP_NAME = 'pterodactyl-sftp';

/**
 * Registers the MCP server using Cursor's proprietary extension API.
 * VS Code's registerMcpServerDefinitionProvider is NOT supported in Cursor.
 * @see https://cursor.com/docs/extension-api
 */
export function registerCursorMcp(
    context: vscode.ExtensionContext,
    bridge: AgentBridge,
): boolean {
    const cursorMcp = (vscode as any).cursor?.mcp;
    if (typeof cursorMcp?.registerServer !== 'function') {
        Logger.info('Cursor MCP API (vscode.cursor.mcp.registerServer) not available');
        return false;
    }

    const serverJsPath = path.join(context.extensionPath, 'out', 'mcp', 'server.js');

    const register = () => {
        if (!bridge.bridgeUrl || !bridge.bridgeToken) {
            Logger.warn('AgentBridge not ready; skipping Cursor MCP registration');
            return;
        }

        try {
            cursorMcp.unregisterServer?.(CURSOR_MCP_NAME);
        } catch {
            // ignore if not previously registered
        }

        cursorMcp.registerServer({
            name: CURSOR_MCP_NAME,
            server: {
                command: 'node',
                args: [serverJsPath],
                env: {
                    PTERO_BRIDGE_URL: bridge.bridgeUrl,
                    PTERO_BRIDGE_TOKEN: bridge.bridgeToken,
                },
            },
        });

        Logger.info(`Cursor MCP server registered: ${CURSOR_MCP_NAME}`);
    };

    register();

    context.subscriptions.push({
        dispose: () => {
            try {
                cursorMcp.unregisterServer?.(CURSOR_MCP_NAME);
            } catch {
                // ignore
            }
        },
    });

    // Re-register when connections change (emitter set by registerMcpProvider)
    const emitter = (bridge as any)._mcpDidChangeEmitter as vscode.EventEmitter<void> | undefined;
    if (emitter) {
        context.subscriptions.push(emitter.event(() => register()));
    }

    return true;
}

export function getCursorMcpName(): string {
    return CURSOR_MCP_NAME;
}
