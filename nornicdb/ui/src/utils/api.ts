// NornicDB API Client

export interface AuthConfig {
  devLoginEnabled: boolean;
  securityEnabled: boolean;
  oauthProviders: Array<{
    name: string;
    url: string;
    displayName: string;
  }>;
}

export interface DatabaseStats {
  status: string;
  server: {
    uptime_seconds: number;
    requests: number;
    errors: number;
    active: number;
  };
  database: {
    nodes: number;
    edges: number;
  };
}

export interface SearchResult {
  node: {
    id: string;
    labels: string[];
    properties: Record<string, unknown>;
    created_at: string;
  };
  score: number;
  rrf_score?: number;
  vector_rank?: number;
  bm25_rank?: number;
}

export interface CypherResponse {
  results: Array<{
    columns: string[];
    data: Array<{
      row: unknown[];
      meta: unknown[];
    }>;
  }>;
  errors: Array<{
    code: string;
    message: string;
  }>;
}

class NornicDBClient {
  async getAuthConfig(): Promise<AuthConfig> {
    try {
      const res = await fetch('/auth/config', { credentials: 'include' });
      if (res.ok) {
        return await res.json();
      }
      // Default config if endpoint doesn't exist
      return {
        devLoginEnabled: true,
        securityEnabled: false,
        oauthProviders: [],
      };
    } catch {
      // Auth disabled by default
      return {
        devLoginEnabled: true,
        securityEnabled: false,
        oauthProviders: [],
      };
    }
  }

  async checkAuth(): Promise<{ authenticated: boolean; user?: string }> {
    try {
      const res = await fetch('/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        return { authenticated: true, user: data.username };
      }
      return { authenticated: false };
    } catch {
      return { authenticated: false };
    }
  }

  async login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      
      if (res.ok) {
        return { success: true };
      }
      
      const data = await res.json().catch(() => ({ message: 'Login failed' }));
      return { success: false, error: data.message || 'Invalid credentials' };
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  }

  async logout(): Promise<void> {
    await fetch('/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  }

  async getHealth(): Promise<{ status: string; time: string }> {
    const res = await fetch('/health');
    return await res.json();
  }

  async getStatus(): Promise<DatabaseStats> {
    const res = await fetch('/status');
    return await res.json();
  }

  async search(query: string, limit: number = 10, labels?: string[]): Promise<SearchResult[]> {
    const res = await fetch('/nornicdb/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ query, limit, labels }),
    });
    return await res.json();
  }

  async findSimilar(nodeId: string, limit: number = 10): Promise<SearchResult[]> {
    const res = await fetch('/nornicdb/similar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ node_id: nodeId, limit }),
    });
    return await res.json();
  }

  async executeCypher(statement: string, parameters?: Record<string, unknown>): Promise<CypherResponse> {
    const res = await fetch('/db/neo4j/tx/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        statements: [{ statement, parameters }],
      }),
    });
    return await res.json();
  }
}

export const api = new NornicDBClient();
