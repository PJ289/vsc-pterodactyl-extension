import * as vscode from 'vscode';
import { RemoteFileAgentService } from './remoteFileAgentService';
import { ConsoleAgentService } from './consoleAgentService';

/**
 * Registers Language Model Tools so that VS Code Copilot agent mode can invoke
 * them directly in-process (no HTTP bridge needed; same extension host).
 */
export function registerLmTools(
    context: vscode.ExtensionContext,
    service: RemoteFileAgentService,
    consoleService: ConsoleAgentService,
): void {
    if (typeof (vscode.lm as any)?.registerTool !== 'function') {
        return;
    }

    const lm = vscode.lm as any;

    // ── list_servers ──────────────────────────────────────────────────────────
    context.subscriptions.push(
        lm.registerTool('pterodactyl-sftp_list_servers', {
            invoke: async (): Promise<vscode.LanguageModelToolResult> => {
                const result = service.listConnectedServers();
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
                ]);
            },
        }),
    );

    // ── list_directory ────────────────────────────────────────────────────────
    context.subscriptions.push(
        lm.registerTool('pterodactyl-sftp_list_directory', {
            invoke: async (
                options: vscode.LanguageModelToolInvocationOptions<{ serverId: string; path?: string }>,
            ): Promise<vscode.LanguageModelToolResult> => {
                const { serverId, path = '/' } = options.input;
                const result = await service.listDirectory(serverId, path);
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
                ]);
            },
        }),
    );

    // ── read_file ─────────────────────────────────────────────────────────────
    context.subscriptions.push(
        lm.registerTool('pterodactyl-sftp_read_file', {
            invoke: async (
                options: vscode.LanguageModelToolInvocationOptions<{ serverId: string; path: string }>,
            ): Promise<vscode.LanguageModelToolResult> => {
                const { serverId, path } = options.input;
                const result = await service.readFile(serverId, path);
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
                ]);
            },
        }),
    );

    // ── get_file_tree ─────────────────────────────────────────────────────────
    context.subscriptions.push(
        lm.registerTool('pterodactyl-sftp_get_file_tree', {
            invoke: async (
                options: vscode.LanguageModelToolInvocationOptions<{
                    serverId: string;
                    path?: string;
                    maxDepth?: number;
                    excludes?: string[];
                }>,
            ): Promise<vscode.LanguageModelToolResult> => {
                const { serverId, path = '/', maxDepth = 3, excludes } = options.input;
                const result = await service.getFileTree(serverId, path, maxDepth, excludes);
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
                ]);
            },
        }),
    );

    // ── search_text ───────────────────────────────────────────────────────────
    context.subscriptions.push(
        lm.registerTool('pterodactyl-sftp_search_text', {
            invoke: async (
                options: vscode.LanguageModelToolInvocationOptions<{
                    serverId: string;
                    pattern: string;
                    path?: string;
                    maxFiles?: number;
                    maxMatches?: number;
                }>,
            ): Promise<vscode.LanguageModelToolResult> => {
                const { serverId, pattern, path = '/', maxFiles = 200, maxMatches = 50 } = options.input;
                const result = await service.searchText(serverId, pattern, path, maxFiles, maxMatches);
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
                ]);
            },
        }),
    );

    // ── get_permissions ─────────────────────────────────────────────────────
    context.subscriptions.push(
        lm.registerTool('pterodactyl-sftp_get_permissions', {
            invoke: async (): Promise<vscode.LanguageModelToolResult> => {
                const result = service.getPermissions();
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
                ]);
            },
        }),
    );

    // ── write_file ────────────────────────────────────────────────────────────
    context.subscriptions.push(
        lm.registerTool('pterodactyl-sftp_write_file', {
            invoke: async (
                options: vscode.LanguageModelToolInvocationOptions<{
                    serverId: string;
                    path: string;
                    content: string;
                    encoding?: 'utf8' | 'base64';
                    create?: boolean;
                }>,
            ): Promise<vscode.LanguageModelToolResult> => {
                const { serverId, path, content, encoding = 'utf8', create = true } = options.input;
                const result = await service.writeFile(serverId, path, content, encoding, create);
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
                ]);
            },
        }),
    );

    // ── delete_path ───────────────────────────────────────────────────────────
    context.subscriptions.push(
        lm.registerTool('pterodactyl-sftp_delete_path', {
            invoke: async (
                options: vscode.LanguageModelToolInvocationOptions<{
                    serverId: string;
                    path: string;
                    recursive?: boolean;
                }>,
            ): Promise<vscode.LanguageModelToolResult> => {
                const { serverId, path, recursive = false } = options.input;
                const result = await service.deletePath(serverId, path, recursive);
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
                ]);
            },
        }),
    );

    // ── create_directory ──────────────────────────────────────────────────────
    context.subscriptions.push(
        lm.registerTool('pterodactyl-sftp_create_directory', {
            invoke: async (
                options: vscode.LanguageModelToolInvocationOptions<{ serverId: string; path: string }>,
            ): Promise<vscode.LanguageModelToolResult> => {
                const { serverId, path } = options.input;
                const result = await service.createDirectory(serverId, path);
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
                ]);
            },
        }),
    );

    // ── rename_path ───────────────────────────────────────────────────────────
    context.subscriptions.push(
        lm.registerTool('pterodactyl-sftp_rename_path', {
            invoke: async (
                options: vscode.LanguageModelToolInvocationOptions<{
                    serverId: string;
                    oldPath: string;
                    newPath: string;
                }>,
            ): Promise<vscode.LanguageModelToolResult> => {
                const { serverId, oldPath, newPath } = options.input;
                const result = await service.renamePath(serverId, oldPath, newPath);
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
                ]);
            },
        }),
    );

    // ── send_console_command ──────────────────────────────────────────────────
    context.subscriptions.push(
        lm.registerTool('pterodactyl-sftp_send_console_command', {
            invoke: async (
                options: vscode.LanguageModelToolInvocationOptions<{
                    serverId: string;
                    command: string;
                    waitMs?: number;
                }>,
            ): Promise<vscode.LanguageModelToolResult> => {
                const { serverId, command, waitMs = 2500 } = options.input;
                const result = await consoleService.sendCommand(serverId, command, waitMs);
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
                ]);
            },
        }),
    );
}
