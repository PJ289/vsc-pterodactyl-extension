import * as vscode from 'vscode';
import WebSocket from 'ws';
import { PteroAccount, PterodactylClient } from '../api/pterodactylClient';
import { AgentPermissionError, getAgentPermissionConfig } from './agentPermissions';

export interface ResolvedConsoleServer {
    serverId: string;
    name: string;
    uuid: string;
    account: PteroAccount;
}

export type ConsoleServerResolver = (serverId: string) => Promise<ResolvedConsoleServer | undefined>;

export interface ConsoleCommandResult {
    serverId: string;
    command: string;
    sent: true;
    output: string;
    waitMs: number;
}

/**
 * Sends console commands to a connected Pterodactyl server via the panel API,
 * optionally capturing Wings console output over a short-lived WebSocket.
 */
export class ConsoleAgentService {
    constructor(private readonly resolveServer: ConsoleServerResolver) {}

    async sendCommand(
        serverId: string,
        command: string,
        waitMs: number = 2500,
    ): Promise<ConsoleCommandResult> {
        const cfg = getAgentPermissionConfig();
        if (!cfg.consoleEnabled) {
            throw new AgentPermissionError(
                'Console commands are disabled. Set "pterodactyl.agent.allowConsole" to true in settings.',
            );
        }

        const trimmed = (command || '').trim();
        if (!trimmed) {
            throw new Error('Command cannot be empty.');
        }

        const connected = vscode.workspace.workspaceFolders?.some(
            f => f.uri.scheme === 'ptero' && f.uri.authority === serverId,
        );
        if (!connected) {
            throw new Error(`Server "${serverId}" is not connected. Connect it in the Pterodactyl sidebar first.`);
        }

        const resolved = await this.resolveServer(serverId);
        if (!resolved) {
            throw new Error(`Could not resolve server "${serverId}" for console access.`);
        }

        const client = new PterodactylClient(resolved.account.panelUrl, resolved.account.apiKey);
        const clampedWait = Math.max(500, Math.min(waitMs, 15000));
        const output = await this.sendAndCapture(client, resolved.uuid, trimmed, clampedWait);

        return {
            serverId,
            command: trimmed,
            sent: true,
            output,
            waitMs: clampedWait,
        };
    }

    private async sendAndCapture(
        client: PterodactylClient,
        serverUuid: string,
        command: string,
        waitMs: number,
    ): Promise<string> {
        const lines: string[] = [];
        let ws: WebSocket | null = null;

        try {
            const creds = await client.getWebSocketCredentials(serverUuid);
            ws = new WebSocket(creds.socket, { origin: client.panelUrl });

            await new Promise<void>((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('WebSocket connect timeout')), 10000);
                ws!.once('open', () => {
                    clearTimeout(timer);
                    ws!.send(JSON.stringify({ event: 'auth', args: [creds.token] }));
                    resolve();
                });
                ws!.once('error', (err) => {
                    clearTimeout(timer);
                    reject(err);
                });
            });

            // Wait briefly for auth success before sending the command
            await new Promise(r => setTimeout(r, 300));

            ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.event === 'console output') {
                        let output = Array.isArray(msg.args) ? msg.args[0] : msg.args;
                        if (Array.isArray(output)) {
                            output = output.join('\n');
                        }
                        if (typeof output === 'string' && output.length > 0) {
                            lines.push(output);
                        }
                    }
                } catch {
                    // ignore non-JSON
                }
            });

            await client.sendCommand(serverUuid, command);
            await new Promise(r => setTimeout(r, waitMs));
        } finally {
            if (ws) {
                try {
                    ws.close();
                } catch {
                    // ignore
                }
            }
        }

        return lines.join('\n').trim();
    }
}
