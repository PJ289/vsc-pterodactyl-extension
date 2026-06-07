import * as vscode from 'vscode';

export interface ServerSftpSettings {
    sftpHost?: string;
    sftpPort?: number;
}

const SETTINGS_KEY = 'pterodactyl.serverSettings';

export class ServerSettingsManager {
    private context: vscode.ExtensionContext;
    private _onDidChangeSettings = new vscode.EventEmitter<void>();
    readonly onDidChangeSettings = this._onDidChangeSettings.event;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    private settingsKey(accountId: string, serverIdentifier: string): string {
        return `${accountId}:${serverIdentifier}`;
    }

    private getAllSettings(): Record<string, ServerSftpSettings> {
        return this.context.globalState.get<Record<string, ServerSftpSettings>>(SETTINGS_KEY, {});
    }

    getSettings(accountId: string, serverIdentifier: string): ServerSftpSettings | undefined {
        const settings = this.getAllSettings()[this.settingsKey(accountId, serverIdentifier)];
        if (!settings) {
            return undefined;
        }
        const hasHost = Boolean(settings.sftpHost?.trim());
        const hasPort = settings.sftpPort !== undefined && settings.sftpPort > 0;
        if (!hasHost && !hasPort) {
            return undefined;
        }
        return settings;
    }

    async setSettings(
        accountId: string,
        serverIdentifier: string,
        settings: ServerSftpSettings
    ): Promise<void> {
        const all = this.getAllSettings();
        const key = this.settingsKey(accountId, serverIdentifier);
        const trimmedHost = settings.sftpHost?.trim();
        const hasHost = Boolean(trimmedHost);
        const hasPort = settings.sftpPort !== undefined && settings.sftpPort > 0;

        if (!hasHost && !hasPort) {
            delete all[key];
        } else {
            all[key] = {
                ...(hasHost ? { sftpHost: trimmedHost } : {}),
                ...(hasPort ? { sftpPort: settings.sftpPort } : {}),
            };
        }

        await this.context.globalState.update(SETTINGS_KEY, all);
        this._onDidChangeSettings.fire();
    }

    async clearSettings(accountId: string, serverIdentifier: string): Promise<void> {
        await this.setSettings(accountId, serverIdentifier, {});
    }

    dispose(): void {
        this._onDidChangeSettings.dispose();
    }
}
