import * as http from 'http';
import * as crypto from 'crypto';
import { RemoteFileAgentService } from './remoteFileAgentService';

/**
 * Thin HTTP bridge that exposes RemoteFileAgentService to the out-of-process MCP server.
 * Listens only on 127.0.0.1 and requires a per-session token.
 */
export class AgentBridge {
    private server: http.Server | null = null;
    private token: string = '';
    private port: number = 0;
    private readonly service: RemoteFileAgentService;

    constructor(service: RemoteFileAgentService) {
        this.service = service;
    }

    get bridgeUrl(): string {
        return `http://127.0.0.1:${this.port}`;
    }

    get bridgeToken(): string {
        return this.token;
    }

    async start(): Promise<void> {
        if (this.server) return;
        this.token = crypto.randomBytes(32).toString('hex');
        this.server = http.createServer(this.handleRequest.bind(this));
        await new Promise<void>((resolve, reject) => {
            this.server!.listen(0, '127.0.0.1', () => {
                const addr = this.server!.address() as { port: number };
                this.port = addr.port;
                resolve();
            });
            this.server!.once('error', reject);
        });
    }

    stop(): void {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }

    private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        if (req.headers['x-ptero-token'] !== this.token) {
            res.writeHead(401).end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }

        let body = '';
        for await (const chunk of req) {
            body += chunk;
        }

        try {
            const payload = JSON.parse(body || '{}');
            const result = await this.dispatch(req.url ?? '', payload);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (err: any) {
            const status = err?.name === 'AgentPermissionError' ? 403 : 500;
            res.writeHead(status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err?.message ?? String(err) }));
        }
    }

    private async dispatch(url: string, payload: any): Promise<unknown> {
        switch (url) {
            case '/list_servers':
                return this.service.listConnectedServers();

            case '/list_directory':
                return this.service.listDirectory(payload.serverId, payload.path ?? '/');

            case '/read_file':
                return this.service.readFile(payload.serverId, payload.path);

            case '/get_file_tree':
                return this.service.getFileTree(
                    payload.serverId,
                    payload.path ?? '/',
                    payload.maxDepth ?? 3,
                    payload.excludes ?? undefined,
                );

            case '/search_text':
                return this.service.searchText(
                    payload.serverId,
                    payload.pattern,
                    payload.path ?? '/',
                    payload.maxFiles ?? 200,
                    payload.maxMatches ?? 50,
                );

            case '/get_permissions':
                return this.service.getPermissions();

            case '/write_file':
                return this.service.writeFile(
                    payload.serverId,
                    payload.path,
                    payload.content,
                    payload.encoding ?? 'utf8',
                    payload.create ?? true,
                );

            case '/delete_path':
                return this.service.deletePath(
                    payload.serverId,
                    payload.path,
                    payload.recursive ?? false,
                );

            case '/create_directory':
                return this.service.createDirectory(payload.serverId, payload.path);

            case '/rename_path':
                return this.service.renamePath(
                    payload.serverId,
                    payload.oldPath,
                    payload.newPath,
                );

            default:
                throw new Error(`Unknown endpoint: ${url}`);
        }
    }
}
