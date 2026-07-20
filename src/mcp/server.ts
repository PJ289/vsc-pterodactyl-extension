/**
 * Standalone MCP stdio server for the Pterodactyl SFTP extension.
 * Reads PTERO_BRIDGE_URL and PTERO_BRIDGE_TOKEN from environment variables
 * and proxies tool calls to the extension host via the AgentBridge HTTP server.
 *
 * Compiled to out/mcp/server.js — do NOT import vscode here.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod';
import * as https from 'https';
import * as http from 'http';

const BRIDGE_URL = process.env.PTERO_BRIDGE_URL ?? '';
const BRIDGE_TOKEN = process.env.PTERO_BRIDGE_TOKEN ?? '';

if (!BRIDGE_URL || !BRIDGE_TOKEN) {
    process.stderr.write('[pterodactyl-mcp] PTERO_BRIDGE_URL or PTERO_BRIDGE_TOKEN not set\n');
    process.exit(1);
}

function bridgeCall(endpoint: string, payload: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const url = new URL(endpoint, BRIDGE_URL);
        const mod = url.protocol === 'https:' ? https : http;
        const req = mod.request(
            {
                hostname: url.hostname,
                port: Number(url.port) || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body),
                    'x-ptero-token': BRIDGE_TOKEN,
                },
            },
            (res) => {
                let data = '';
                res.on('data', (chunk: string) => (data += chunk));
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (res.statusCode && res.statusCode >= 400) {
                            reject(new Error(parsed?.error ?? `HTTP ${res.statusCode}`));
                        } else {
                            resolve(parsed);
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            },
        );
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

const server = new McpServer({
    name: 'pterodactyl-sftp',
    version: '2.0.7',
});

server.registerTool(
    'list_servers',
    {
        title: 'List Connected Servers',
        description:
            'Returns all Pterodactyl servers that are currently connected in the workspace. ' +
            'Use this first to discover available serverId values before calling other tools.',
        annotations: { readOnlyHint: true },
    },
    async () => {
        const result = await bridgeCall('/list_servers', {});
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
);

server.registerTool(
    'list_directory',
    {
        title: 'List Remote Directory',
        description:
            'Lists files and subdirectories at a given path on a connected Pterodactyl server. ' +
            'Returns an array of {name, type} objects where type is "file", "directory", or "symlink".',
        inputSchema: {
            serverId: z.string().describe('The server identifier from list_servers'),
            path: z.string().default('/').describe('Remote path to list, e.g. "/plugins"'),
        },
        annotations: { readOnlyHint: true },
    },
    async ({ serverId, path }) => {
        const result = await bridgeCall('/list_directory', { serverId, path });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
);

server.registerTool(
    'read_file',
    {
        title: 'Read Remote File',
        description:
            'Reads the contents of a single file from a connected Pterodactyl server. ' +
            'Returns {content, encoding} where encoding is "utf8" for text files or "base64" for binary files.',
        inputSchema: {
            serverId: z.string().describe('The server identifier from list_servers'),
            path: z.string().describe('Remote file path, e.g. "/server.properties"'),
        },
        annotations: { readOnlyHint: true },
    },
    async ({ serverId, path }) => {
        const result = await bridgeCall('/read_file', { serverId, path });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
);

server.registerTool(
    'get_file_tree',
    {
        title: 'Get Remote File Tree',
        description:
            'Returns a recursive tree of file/directory names for a path on a connected Pterodactyl server. ' +
            'Use maxDepth to control depth (default 3). Heavy directories like logs are excluded by default.',
        inputSchema: {
            serverId: z.string().describe('The server identifier from list_servers'),
            path: z.string().default('/').describe('Root path for the tree'),
            maxDepth: z.number().int().min(1).max(8).default(3).describe('Max recursion depth'),
            excludes: z
                .array(z.string())
                .optional()
                .describe('Directory names to skip, e.g. ["logs","world"]'),
        },
        annotations: { readOnlyHint: true },
    },
    async ({ serverId, path, maxDepth, excludes }) => {
        const result = await bridgeCall('/get_file_tree', { serverId, path, maxDepth, excludes });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
);

server.registerTool(
    'search_text',
    {
        title: 'Search Text in Remote Files',
        description:
            'Searches for a regex pattern inside text files on a connected Pterodactyl server. ' +
            'Returns an array of {path, line, text} matches. Files over 2 MB and binary files are skipped.',
        inputSchema: {
            serverId: z.string().describe('The server identifier from list_servers'),
            pattern: z.string().describe('JavaScript-compatible regex pattern to search for'),
            path: z.string().default('/').describe('Directory to search in'),
            maxFiles: z.number().int().min(1).max(500).default(200).describe('Max files to scan'),
            maxMatches: z.number().int().min(1).max(200).default(50).describe('Max results to return'),
        },
        annotations: { readOnlyHint: true },
    },
    async ({ serverId, pattern, path, maxFiles, maxMatches }) => {
        const result = await bridgeCall('/search_text', { serverId, pattern, path, maxFiles, maxMatches });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
);

server.registerTool(
    'get_permissions',
    {
        title: 'Get Agent Permissions',
        description:
            'Returns the current agent permission config: mode (read-only/read-write), allowedPaths, blockedPaths, writeEnabled. ' +
            'Call this before write operations to check if modifications are permitted.',
        annotations: { readOnlyHint: true },
    },
    async () => {
        const result = await bridgeCall('/get_permissions', {});
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
);

server.registerTool(
    'write_file',
    {
        title: 'Write Remote File',
        description:
            'Creates or overwrites a file on a connected Pterodactyl server. Requires read-write mode and path must be allowed. ' +
            'Use encoding "utf8" for text or "base64" for binary.',
        inputSchema: {
            serverId: z.string().describe('The server identifier from list_servers'),
            path: z.string().describe('Remote file path to write'),
            content: z.string().describe('File content (utf8 text or base64)'),
            encoding: z.enum(['utf8', 'base64']).default('utf8').describe('Content encoding'),
            create: z.boolean().default(true).describe('Create file if it does not exist'),
        },
    },
    async ({ serverId, path, content, encoding, create }) => {
        const result = await bridgeCall('/write_file', { serverId, path, content, encoding, create });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
);

server.registerTool(
    'delete_path',
    {
        title: 'Delete Remote File or Directory',
        description:
            'Deletes a file or directory on a connected Pterodactyl server. Requires read-write mode and allowed path. ' +
            'Set recursive=true to delete non-empty directories.',
        inputSchema: {
            serverId: z.string().describe('The server identifier from list_servers'),
            path: z.string().describe('Remote path to delete'),
            recursive: z.boolean().default(false).describe('Delete directory contents recursively'),
        },
    },
    async ({ serverId, path, recursive }) => {
        const result = await bridgeCall('/delete_path', { serverId, path, recursive });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
);

server.registerTool(
    'create_directory',
    {
        title: 'Create Remote Directory',
        description:
            'Creates a directory on a connected Pterodactyl server. Requires read-write mode and allowed path.',
        inputSchema: {
            serverId: z.string().describe('The server identifier from list_servers'),
            path: z.string().describe('Remote directory path to create'),
        },
    },
    async ({ serverId, path }) => {
        const result = await bridgeCall('/create_directory', { serverId, path });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
);

server.registerTool(
    'rename_path',
    {
        title: 'Rename or Move Remote Path',
        description:
            'Renames or moves a file/directory on a connected Pterodactyl server. Both old and new paths must be allowed.',
        inputSchema: {
            serverId: z.string().describe('The server identifier from list_servers'),
            oldPath: z.string().describe('Current remote path'),
            newPath: z.string().describe('New remote path'),
        },
    },
    async ({ serverId, oldPath, newPath }) => {
        const result = await bridgeCall('/rename_path', { serverId, oldPath, newPath });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
);

const transport = new StdioServerTransport();
server.connect(transport).catch((err: Error) => {
    process.stderr.write(`[pterodactyl-mcp] Fatal: ${err.message}\n`);
    process.exit(1);
});
