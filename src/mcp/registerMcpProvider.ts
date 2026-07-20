import * as vscode from 'vscode';
import * as path from 'path';
import { AgentBridge } from '../agent/agentBridge';

/**
 * Registers the Pterodactyl MCP server definition provider so that Cursor, Copilot
 * agent mode, and other MCP-aware AI tools can discover and launch the stdio server
 * automatically — without any manual configuration by the user.
 *
 * The underlying McpStdioServerDefinition is resolved lazily; bridge URL/token are
 * injected at that point so the MCP process can reach the extension host.
 */
export function registerMcpProvider(
    context: vscode.ExtensionContext,
    bridge: AgentBridge,
): void {
    // Guard: API was introduced in VS Code 1.99
    if (typeof (vscode.lm as any)?.registerMcpServerDefinitionProvider !== 'function') {
        return;
    }

    const lm = vscode.lm as any;
    const serverJsPath = path.join(context.extensionPath, 'out', 'mcp', 'server.js');

    const didChangeEmitter = new vscode.EventEmitter<void>();
    context.subscriptions.push(didChangeEmitter);

    const provider = {
        onDidChangeMcpServerDefinitions: didChangeEmitter.event,

        provideMcpServerDefinitions: async (): Promise<vscode.McpServerDefinition[]> => {
            const def = new (vscode as any).McpStdioServerDefinition(
                'Pterodactyl SFTP',
                'node',
                [serverJsPath],
                {},
            );
            return [def];
        },

        resolveMcpServerDefinition: async (
            server: vscode.McpServerDefinition,
        ): Promise<vscode.McpServerDefinition | undefined> => {
            if (!bridge.bridgeUrl || !bridge.bridgeToken) {
                // Bridge not started yet (no server connected); cancel launch
                return undefined;
            }
            // Inject credentials into the environment of the MCP process
            const def = new (vscode as any).McpStdioServerDefinition(
                (server as any).label,
                (server as any).command,
                (server as any).args,
                {
                    PTERO_BRIDGE_URL: bridge.bridgeUrl,
                    PTERO_BRIDGE_TOKEN: bridge.bridgeToken,
                },
            );
            return def;
        },
    };

    context.subscriptions.push(
        lm.registerMcpServerDefinitionProvider('pterodactyl-sftp', provider),
    );

    // Expose emitter so the bridge can trigger MCP tool refresh on connect/disconnect
    (bridge as any)._mcpDidChangeEmitter = didChangeEmitter;
}
