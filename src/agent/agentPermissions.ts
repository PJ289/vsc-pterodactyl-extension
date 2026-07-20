import * as vscode from 'vscode';

export type AgentMode = 'read-only' | 'read-write';
export type AgentWriteOperation = 'write' | 'delete' | 'create' | 'rename';

export interface AgentPermissionConfig {
    mode: AgentMode;
    allowedPaths: string[];
    blockedPaths: string[];
    writeEnabled: boolean;
}

export class AgentPermissionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AgentPermissionError';
    }
}

const CONFIG_SECTION = 'pterodactyl.agent';

const DEFAULT_BLOCKED = [
    '/world',
    '/world_nether',
    '/world_the_end',
    '/logs',
    '/crash-reports',
    '/cache',
];

/** Normalise a remote path to `/foo/bar` form (no trailing slash except `/`). */
export function normalizeAgentPath(path: string): string {
    let p = (path || '/').replace(/\\/g, '/');
    if (!p.startsWith('/')) {
        p = `/${p}`;
    }
    if (p.length > 1 && p.endsWith('/')) {
        p = p.slice(0, -1);
    }
    return p;
}

export function getAgentPermissionConfig(): AgentPermissionConfig {
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
    const mode = config.get<AgentMode>('mode', 'read-only');
    const allowedPaths = (config.get<string[]>('allowedPaths', []) ?? [])
        .map(normalizeAgentPath)
        .filter(Boolean);
    const blockedPaths = (config.get<string[]>('blockedPaths', DEFAULT_BLOCKED) ?? DEFAULT_BLOCKED)
        .map(normalizeAgentPath)
        .filter(Boolean);

    return {
        mode,
        allowedPaths,
        blockedPaths,
        writeEnabled: mode === 'read-write',
    };
}

function isBlocked(path: string, blockedPaths: string[]): boolean {
    const normalised = normalizeAgentPath(path);
    return blockedPaths.some(blocked => {
        const b = normalizeAgentPath(blocked);
        return normalised === b || normalised.startsWith(`${b}/`);
    });
}

function isInAllowedList(path: string, allowedPaths: string[]): boolean {
    if (allowedPaths.length === 0) {
        return true;
    }
    const normalised = normalizeAgentPath(path);
    return allowedPaths.some(allowed => {
        const a = normalizeAgentPath(allowed);
        return normalised === a || normalised.startsWith(`${a}/`);
    });
}

/** Returns true when the agent may perform a write operation on `path`. */
export function isWritePathAllowed(path: string, config?: AgentPermissionConfig): boolean {
    const cfg = config ?? getAgentPermissionConfig();
    if (!cfg.writeEnabled) {
        return false;
    }
    const normalised = normalizeAgentPath(path);
    if (isBlocked(normalised, cfg.blockedPaths)) {
        return false;
    }
    return isInAllowedList(normalised, cfg.allowedPaths);
}

export function assertAgentWriteAllowed(
    path: string,
    operation: AgentWriteOperation,
    config?: AgentPermissionConfig,
): void {
    const cfg = config ?? getAgentPermissionConfig();

    if (!cfg.writeEnabled) {
        throw new AgentPermissionError(
            `Agent is in read-only mode. Set "pterodactyl.agent.mode" to "read-write" in settings to allow ${operation} operations.`,
        );
    }

    const normalised = normalizeAgentPath(path);

    if (isBlocked(normalised, cfg.blockedPaths)) {
        throw new AgentPermissionError(
            `Path "${normalised}" is blocked for agent ${operation} operations (pterodactyl.agent.blockedPaths).`,
        );
    }

    if (!isInAllowedList(normalised, cfg.allowedPaths)) {
        const hint = cfg.allowedPaths.length > 0
            ? `Allowed paths: ${cfg.allowedPaths.join(', ')}`
            : 'No allowed paths configured.';
        throw new AgentPermissionError(
            `Path "${normalised}" is not in the agent allow-list (pterodactyl.agent.allowedPaths). ${hint}`,
        );
    }
}

export function assertAgentRenameAllowed(oldPath: string, newPath: string): void {
    const cfg = getAgentPermissionConfig();
    assertAgentWriteAllowed(oldPath, 'rename', cfg);
    assertAgentWriteAllowed(newPath, 'rename', cfg);
}
