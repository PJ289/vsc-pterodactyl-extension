import { ServerSftpSettings } from '../accounts/serverSettingsManager';
import { PteroServer } from '../api/pterodactylClient';

export interface ResolvedSftpConnection {
    host: string;
    port: number;
    isCustomHost: boolean;
    isCustomPort: boolean;
}

export function resolveSftpConnection(
    server: PteroServer,
    override?: ServerSftpSettings
): ResolvedSftpConnection {
    const panelHost = server.sftp_details.ip?.trim() || '';
    const panelPort = server.sftp_details.port || 2022;
    const customHost = override?.sftpHost?.trim();
    const customPort = override?.sftpPort;

    return {
        host: customHost || panelHost,
        port: customPort && customPort > 0 ? customPort : panelPort,
        isCustomHost: Boolean(customHost),
        isCustomPort: customPort !== undefined && customPort > 0,
    };
}

export function formatSftpEndpoint(host: string, port: number): string {
    return `${host}:${port}`;
}
