import * as vscode from 'vscode';
import {
    assertAgentRenameAllowed,
    assertAgentWriteAllowed,
    getAgentPermissionConfig,
    AgentPermissionConfig,
} from './agentPermissions';

const TEXT_EXTENSIONS = new Set([
    'txt', 'md', 'json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf',
    'properties', 'xml', 'html', 'htm', 'css', 'js', 'ts', 'py', 'rb',
    'java', 'kt', 'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd',
    'log', 'env', 'gitignore', 'gitattributes', 'editorconfig',
    'gradle', 'pom', 'lock', 'sql', 'lua', 'php', 'go', 'rs', 'cpp',
    'c', 'h', 'cs', 'swift', 'dart', 'r', 'tf', 'hcl', 'dockerfile',
    'makefile', 'rakefile', 'gemfile',
]);

const DEFAULT_EXCLUDES = ['world', 'world_nether', 'world_the_end', 'logs', 'crash-reports', 'cache'];

const MAX_FILE_SIZE_SEARCH = 2 * 1024 * 1024; // 2 MB

export interface ConnectedServer {
    serverId: string;
    name: string;
    rootUri: string;
}

export interface DirectoryEntry {
    name: string;
    type: 'file' | 'directory' | 'symlink';
}

export interface TreeNode {
    name: string;
    type: 'file' | 'directory' | 'symlink';
    children?: TreeNode[];
}

export interface SearchMatch {
    path: string;
    line: number;
    text: string;
}

export interface WriteResult {
    path: string;
    success: true;
}

function fileTypeLabel(t: vscode.FileType): DirectoryEntry['type'] {
    if (t === vscode.FileType.Directory) return 'directory';
    if (t === vscode.FileType.SymbolicLink) return 'symlink';
    return 'file';
}

function isLikelyText(name: string): boolean {
    const lower = name.toLowerCase();
    const dot = lower.lastIndexOf('.');
    if (dot === -1) {
        const base = lower.split('/').pop() ?? lower;
        return ['dockerfile', 'makefile', 'rakefile', 'gemfile', 'vagrantfile'].includes(base);
    }
    return TEXT_EXTENSIONS.has(lower.slice(dot + 1));
}

export class RemoteFileAgentService {
    getPermissions(): AgentPermissionConfig {
        return getAgentPermissionConfig();
    }

    listConnectedServers(): ConnectedServer[] {
        const folders = vscode.workspace.workspaceFolders ?? [];
        return folders
            .filter(f => f.uri.scheme === 'ptero')
            .map(f => ({
                serverId: f.uri.authority,
                name: f.name.replace(/^🦕\s*/, ''),
                rootUri: `ptero://${f.uri.authority}/`,
            }));
    }

    private makeUri(serverId: string, path: string): vscode.Uri {
        const normalised = path.startsWith('/') ? path : `/${path}`;
        return vscode.Uri.parse(`ptero://${serverId}${normalised}`);
    }

    async listDirectory(serverId: string, path: string): Promise<DirectoryEntry[]> {
        const uri = this.makeUri(serverId, path);
        const entries = await vscode.workspace.fs.readDirectory(uri);
        return entries.map(([name, type]) => ({ name, type: fileTypeLabel(type) }));
    }

    async readFile(serverId: string, path: string): Promise<{ content: string; encoding: 'utf8' | 'base64' }> {
        const uri = this.makeUri(serverId, path);
        const bytes = await vscode.workspace.fs.readFile(uri);
        if (isLikelyText(path)) {
            return { content: Buffer.from(bytes).toString('utf8'), encoding: 'utf8' };
        }
        return { content: Buffer.from(bytes).toString('base64'), encoding: 'base64' };
    }

    async writeFile(
        serverId: string,
        path: string,
        content: string,
        encoding: 'utf8' | 'base64' = 'utf8',
        create: boolean = true,
    ): Promise<WriteResult> {
        assertAgentWriteAllowed(path, 'write');
        const uri = this.makeUri(serverId, path);
        const bytes = encoding === 'base64'
            ? Buffer.from(content, 'base64')
            : Buffer.from(content, 'utf8');

        if (create) {
            try {
                await vscode.workspace.fs.stat(uri);
            } catch {
                // Ensure parent directories exist for new files
                const parts = path.split('/').filter(Boolean);
                if (parts.length > 1) {
                    const parentPath = '/' + parts.slice(0, -1).join('/');
                    try {
                        await vscode.workspace.fs.createDirectory(this.makeUri(serverId, parentPath));
                    } catch {
                        // parent may already exist
                    }
                }
            }
        }

        await vscode.workspace.fs.writeFile(uri, bytes);
        return { path, success: true };
    }

    async deletePath(
        serverId: string,
        path: string,
        recursive: boolean = false,
    ): Promise<WriteResult> {
        assertAgentWriteAllowed(path, 'delete');
        const uri = this.makeUri(serverId, path);
        await vscode.workspace.fs.delete(uri, { recursive, useTrash: false });
        return { path, success: true };
    }

    async createDirectory(serverId: string, path: string): Promise<WriteResult> {
        assertAgentWriteAllowed(path, 'create');
        const uri = this.makeUri(serverId, path);
        await vscode.workspace.fs.createDirectory(uri);
        return { path, success: true };
    }

    async renamePath(serverId: string, oldPath: string, newPath: string): Promise<WriteResult> {
        assertAgentRenameAllowed(oldPath, newPath);
        const oldUri = this.makeUri(serverId, oldPath);
        const newUri = this.makeUri(serverId, newPath);
        await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: false });
        return { path: newPath, success: true };
    }

    async getFileTree(
        serverId: string,
        path: string,
        maxDepth: number = 3,
        excludes: string[] = DEFAULT_EXCLUDES,
    ): Promise<TreeNode> {
        return this._walkTree(serverId, path, maxDepth, excludes, 0);
    }

    private async _walkTree(
        serverId: string,
        path: string,
        maxDepth: number,
        excludes: string[],
        depth: number,
    ): Promise<TreeNode> {
        const parts = path.split('/');
        const name = parts[parts.length - 1] || '/';
        if (depth >= maxDepth) {
            return { name, type: 'directory' };
        }
        let entries: [string, vscode.FileType][];
        try {
            const uri = this.makeUri(serverId, path);
            entries = await vscode.workspace.fs.readDirectory(uri);
        } catch {
            return { name, type: 'directory' };
        }

        const children: TreeNode[] = await Promise.all(
            entries
                .filter(([n]) => !excludes.includes(n))
                .map(async ([n, t]) => {
                    const childPath = path.endsWith('/') ? `${path}${n}` : `${path}/${n}`;
                    if (t === vscode.FileType.Directory) {
                        return this._walkTree(serverId, childPath, maxDepth, excludes, depth + 1);
                    }
                    return { name: n, type: fileTypeLabel(t) };
                }),
        );

        return { name, type: 'directory', children };
    }

    async searchText(
        serverId: string,
        pattern: string,
        path: string = '/',
        maxFiles: number = 200,
        maxMatches: number = 50,
    ): Promise<SearchMatch[]> {
        let regex: RegExp;
        try {
            regex = new RegExp(pattern, 'g');
        } catch {
            throw new Error(`Invalid regex pattern: ${pattern}`);
        }

        const matches: SearchMatch[] = [];
        const filesChecked = { count: 0 };
        await this._searchInDir(serverId, path, regex, matches, filesChecked, maxFiles, maxMatches);
        return matches;
    }

    private async _searchInDir(
        serverId: string,
        path: string,
        regex: RegExp,
        matches: SearchMatch[],
        filesChecked: { count: number },
        maxFiles: number,
        maxMatches: number,
    ): Promise<void> {
        if (matches.length >= maxMatches || filesChecked.count >= maxFiles) return;

        let entries: [string, vscode.FileType][];
        try {
            const uri = this.makeUri(serverId, path);
            entries = await vscode.workspace.fs.readDirectory(uri);
        } catch {
            return;
        }

        for (const [name, type] of entries) {
            if (matches.length >= maxMatches || filesChecked.count >= maxFiles) break;
            const childPath = path.endsWith('/') ? `${path}${name}` : `${path}/${name}`;
            if (type === vscode.FileType.Directory) {
                if (!DEFAULT_EXCLUDES.includes(name)) {
                    await this._searchInDir(serverId, childPath, regex, matches, filesChecked, maxFiles, maxMatches);
                }
            } else if (type === vscode.FileType.File && isLikelyText(name)) {
                filesChecked.count++;
                try {
                    const uri = this.makeUri(serverId, childPath);
                    const stat = await vscode.workspace.fs.stat(uri);
                    if (stat.size > MAX_FILE_SIZE_SEARCH) continue;
                    const bytes = await vscode.workspace.fs.readFile(uri);
                    const text = Buffer.from(bytes).toString('utf8');
                    const lines = text.split('\n');
                    for (let i = 0; i < lines.length && matches.length < maxMatches; i++) {
                        regex.lastIndex = 0;
                        if (regex.test(lines[i])) {
                            matches.push({ path: childPath, line: i + 1, text: lines[i].trim() });
                        }
                    }
                } catch {
                    // skip unreadable files
                }
            }
        }
    }
}
