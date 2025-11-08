import { useState, useEffect } from 'react'
import './App.css'

// Types
interface LighthouseConfig {
  apiKey: string;
  endpoint?: string;
  enabled?: boolean;
  baseUrl?: string;
}

interface Trace {
  prompt: string;
  response: string;
  tokensUsed: number;
  costUsd: number;
  latencyMs: number;
  provider: string;
  metadata: Record<string, unknown>;
}

interface QueryWithDbRequest {
  prompt: string;
  databaseConnectionId: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface QueryWithDbResponse {
  response: string;
  confidenceScore?: number;
  hallucinationsDetected?: boolean;
  supportedClaims?: number;
  totalClaims?: number;
  databaseContext?: string;
  traceId?: string;
  tokensUsed?: number;
  costUsd?: number;
  latencyMs?: number;
}

interface DemoBackendResponse {
  response: string;
  success: boolean;
  tokensUsed?: number;
  costUsd?: number;
  latencyMs?: number;
  provider?: string;
  error?: string;
  // Hallucination detection fields (from main Lighthouse backend)
  confidenceScore?: number;
  hallucinationsDetected?: boolean;
  supportedClaims?: number;
  totalClaims?: number;
  databaseContext?: string;
  traceId?: string;
}

interface DatabaseConnection {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive';
}

interface TestResult {
  type: 'success' | 'error';
  apiResponse?: unknown;
  trace: Trace;
  message: string;
  queryResult?: QueryWithDbResponse;
}

// Lighthouse SDK Class
class Lighthouse {
  apiKey: string;
  endpoint: string;
  baseUrl: string;
  enabled: boolean;

  constructor(config: LighthouseConfig) {
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint || 'http://localhost:8080/api/sdk/traces';
    this.baseUrl = config.baseUrl || 'http://localhost:8080';
    this.enabled = config.enabled !== false;
  }

  async trackFetch(url: string, options?: RequestInit, metadata?: Record<string, unknown>): Promise<{ response: Response; trace: Trace }> {
    const startTime = Date.now();
    let prompt = '';
    if (metadata?.prompt) {
      prompt = String(metadata.prompt);
    } else if (options?.body) {
      try {
        const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
        prompt = body.prompt || '';
      } catch {
        prompt = '';
      }
    }
    const provider = (metadata?.provider as string) || 'openai';

    try {
      const response = await fetch(url, options);
      const responseText = await response.clone().text();
      const latencyMs = Date.now() - startTime;
      const tokensUsed = Math.ceil((prompt.length + responseText.length) / 4);
      const costUsd = (tokensUsed / 1000) * 0.002; // OpenAI rate

      const trace: Trace = {
        prompt: prompt.substring(0, 10000),
        response: responseText.substring(0, 50000),
        tokensUsed,
        costUsd,
        latencyMs,
        provider,
        metadata: {
          url,
          method: options?.method || 'GET',
          statusCode: response.status,
          ...metadata
        }
      };

      // Send trace (async, non-blocking)
      this.sendTrace(trace).catch(err => console.warn('Lighthouse error:', err));

      return { response, trace };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const trace: Trace = {
        prompt: prompt.substring(0, 10000),
        response: `Error: ${errorMessage}`,
        tokensUsed: 0,
        costUsd: 0,
        latencyMs: Date.now() - startTime,
        provider: provider || 'unknown',
        metadata: { error: true, errorMessage }
      };
      this.sendTrace(trace).catch(err => console.warn('Lighthouse error:', err));
      throw { error, trace };
    }
  }

  async sendTrace(trace: Trace): Promise<unknown> {
    if (!this.enabled) return;
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      body: JSON.stringify(trace)
    });
    if (!response.ok) {
      throw new Error(`Lighthouse API error: ${response.status}`);
    }
    return response.json();
  }

  async queryWithDatabase(request: QueryWithDbRequest): Promise<QueryWithDbResponse> {
    // Use relative URL when baseUrl is empty (dev mode with Vite proxy)
    // Otherwise use full URL
    const url = this.baseUrl ? `${this.baseUrl}/api/traces/query-with-db` : '/api/traces/query-with-db';
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Lighthouse API error: ${response.status} - ${errorText}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('NetworkError'))) {
        const errorMsg = this.baseUrl 
          ? `Network error: Cannot connect to Lighthouse backend at ${url}. Make sure the backend is running on port 8081.`
          : `Network error: Cannot connect to Lighthouse backend via proxy. Make sure the backend is running on port 8081 and Vite dev server is running.`;
        throw new Error(errorMsg);
      }
      throw error;
    }
  }

  async getDatabaseConnections(): Promise<DatabaseConnection[]> {
    const url = this.baseUrl ? `${this.baseUrl}/api/database-connections` : '/api/database-connections';
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        }
      });

      if (!response.ok) {
        // If endpoint doesn't exist, return empty array
        if (response.status === 404) {
          return [];
        }
        throw new Error(`Failed to fetch database connections: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('Could not connect to database connections endpoint:', error);
        return [];
      }
      throw error;
    }
  }

  async createDatabaseConnection(name: string, type: string, config: Record<string, unknown>): Promise<DatabaseConnection> {
    const url = this.baseUrl ? `${this.baseUrl}/api/database-connections` : '/api/database-connections';
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          name,
          type,
          config
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create database connection: ${response.status} - ${errorText}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Network error: Cannot connect to Lighthouse backend at ${url}. Make sure the backend is running.`);
      }
      throw error;
    }
  }
}

// Initialize Lighthouse
// In development, use proxy through Vite dev server to avoid CORS issues
const isDevelopment = import.meta.env.DEV;
// Use empty string in dev to use relative URLs (Vite proxy), full URL in production
const baseUrl = isDevelopment ? '' : 'http://localhost:8081';

const lighthouse = new Lighthouse({
  apiKey: 'lh_83513bd689b44ab9b53b679d689b50a9',
  endpoint: isDevelopment ? '/api/sdk/traces' : 'http://localhost:8081/api/sdk/traces',
  baseUrl: baseUrl // Empty string in dev = use relative URLs with Vite proxy
});

function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [databaseConnections, setDatabaseConnections] = useState<DatabaseConnection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [demoBackendStatus, setDemoBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [demoPrompt, setDemoPrompt] = useState('What hospitals are in the database?');

  const testMockAPI = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { response, trace } = await lighthouse.trackFetch(
        'https://jsonplaceholder.typicode.com/posts/1',
        { method: 'GET' },
        {
          prompt: 'Get post data',
          provider: 'custom',
          model: 'json-api'
        }
      );

      const data = await response.json();
      setResult({
        type: 'success',
        apiResponse: data,
        trace: trace,
        message: '✅ Trace sent to Lighthouse!'
      });
    } catch (err: unknown) {
      const errorMessage = (err as { error?: Error }).error?.message || 'Failed to fetch';
      const trace = (err as { trace?: Trace }).trace;
      setError(errorMessage);
      if (trace) {
        setResult({
          type: 'error',
          trace,
          message: '❌ Error occurred, but trace was still sent'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const checkBackendStatus = async () => {
    // Always use relative URL in development (Vite proxy), or full URL if baseUrl is set
    const url = lighthouse.baseUrl ? `${lighthouse.baseUrl}/api/health` : '/api/health';
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': lighthouse.apiKey
        }
      });
      setBackendStatus(response.ok ? 'online' : 'offline');
    } catch (err) {
      console.warn('Backend status check failed:', err);
      setBackendStatus('offline');
    }
  };

  const checkDemoBackendStatus = async () => {
    // Demo backend runs on port 8081
    const url = isDevelopment ? '/api/demo/health' : 'http://localhost:8081/api/demo/health';
    try {
      const response = await fetch(url, {
        method: 'GET'
      });
      setDemoBackendStatus(response.ok ? 'online' : 'offline');
    } catch (err) {
      console.warn('Demo backend status check failed:', err);
      setDemoBackendStatus('offline');
    }
  };

  const testDemoBackend = async () => {
    if (!demoPrompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    if (!selectedConnectionId) {
      setError('Please select a database connection');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Use relative URL in dev (Vite proxy), full URL in production
      const url = isDevelopment ? '/api/demo/query' : 'http://localhost:8081/api/demo/query';
      
      const requestBody = {
        prompt: demoPrompt,
        databaseConnectionId: selectedConnectionId,
        // Optional: You can also send model parameters if needed
        model: 'gpt-3.5-turbo', // or 'gemini-pro'
        temperature: 0.7,
        maxTokens: 1000
      };
      
      // Debug: Log what we're sending
      console.log('Sending request to demo backend:', {
        url,
        body: requestBody
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Demo backend error:', response.status, errorText);
        throw new Error(`Demo backend error: ${response.status} - ${errorText}`);
      }

      const data: DemoBackendResponse = await response.json();
      
      // Debug: Log the response
      console.log('Demo backend response:', data);
      
      // Check if response indicates database wasn't queried or connection failed
      const responseText = data.response?.toLowerCase() || '';
      const noDbContextIndicators = [
        'i do not have access',
        'i cannot access',
        'i need to know',
        'please provide me with information',
        'what kind of data',
        'what database'
      ];
      const dbConnectionErrorIndicators = [
        'failed to obtain jdbc connection',
        'jdbc connection',
        'cannot access',
        'database context indicates an error',
        'connection refused',
        'connection timeout'
      ];
      const seemsNoDbContext = noDbContextIndicators.some(indicator => 
        responseText.includes(indicator)
      );
      const hasDbConnectionError = dbConnectionErrorIndicators.some(indicator =>
        responseText.includes(indicator)
      );

      if (data.success) {
        // Create a trace object for display
        const trace: Trace = {
          prompt: demoPrompt,
          response: data.response,
          tokensUsed: data.tokensUsed || 0,
          costUsd: data.costUsd || 0,
          latencyMs: data.latencyMs || 0,
          provider: data.provider || 'openai',
          metadata: {
            source: 'demo-backend',
            endpoint: '/api/demo/query',
            databaseConnectionId: selectedConnectionId,
            confidenceScore: data.confidenceScore,
            hallucinationsDetected: data.hallucinationsDetected,
            supportedClaims: data.supportedClaims,
            totalClaims: data.totalClaims
          }
        };

        // Create query result object if hallucination detection data is present
        const queryResult: QueryWithDbResponse | undefined = data.confidenceScore !== undefined ? {
          response: data.response,
          confidenceScore: data.confidenceScore,
          hallucinationsDetected: data.hallucinationsDetected,
          supportedClaims: data.supportedClaims,
          totalClaims: data.totalClaims,
          databaseContext: data.databaseContext,
          traceId: data.traceId,
          tokensUsed: data.tokensUsed,
          costUsd: data.costUsd,
          latencyMs: data.latencyMs
        } : undefined;

        // Show warning if database context doesn't seem to be used or connection failed
        let message = data.hallucinationsDetected 
          ? `⚠️ Hallucinations detected! Confidence: ${data.confidenceScore?.toFixed(1)}%`
          : `✅ Query successful! Confidence: ${data.confidenceScore?.toFixed(1) || 'N/A'}%`;
        
        if (hasDbConnectionError) {
          message += '\n❌ Database Connection Error: The backend cannot connect to the database.';
          message += '\n   Backend Troubleshooting:';
          message += '\n   1) Verify application.properties has correct database config:';
          message += '\n      spring.datasource.url=jdbc:postgresql://localhost:5432/mock_data_db';
          message += '\n      spring.datasource.username=postgres';
          message += '\n      spring.datasource.password=your_password';
          message += '\n      spring.datasource.driver-class-name=org.postgresql.Driver';
          message += '\n   2) Check if DatabaseService is properly autowired in AIService';
          message += '\n   3) Verify PostgreSQL JDBC dependency is in pom.xml';
          message += '\n   4) Check backend console logs for detailed error messages';
          message += '\n   5) Restart the Spring Boot application after config changes';
        } else if (seemsNoDbContext && !data.databaseContext) {
          message += '\n⚠️ Warning: The backend may not be querying the database. Check backend logs.';
        }

        setResult({
          type: data.hallucinationsDetected ? 'error' : 'success',
          trace: trace,
          queryResult: queryResult,
          message: message
        });
      } else {
        throw new Error(data.error || 'Query failed');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to query demo backend';
      setError(errorMessage);
      setResult({
        type: 'error',
        trace: {
          prompt: demoPrompt,
          response: `Error: ${errorMessage}`,
          tokensUsed: 0,
          costUsd: 0,
          latencyMs: 0,
          provider: 'unknown',
          metadata: { error: true, errorMessage, source: 'demo-backend' }
        },
        message: '❌ Demo backend query failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDatabaseConnections = async () => {
    setConnectionLoading(true);
    try {
      const connections = await lighthouse.getDatabaseConnections();
      if (connections.length > 0) {
        setDatabaseConnections(connections);
        if (!selectedConnectionId) {
          setSelectedConnectionId(connections[0].id);
        }
      } else {
        // If no connections from backend, create default for demo backend's database
        const defaultConnection: DatabaseConnection = {
          id: 'mock-data-connection',
          name: 'mock_data_db@localhost',
          type: 'postgresql',
          status: 'active'
        };
        setDatabaseConnections([defaultConnection]);
        if (!selectedConnectionId) {
          setSelectedConnectionId(defaultConnection.id);
        }
      }
      setBackendStatus('online');
    } catch (err) {
      console.warn('Could not load database connections:', err);
      setBackendStatus('offline');
      // Create default connection for demo backend's database
      const defaultConnection: DatabaseConnection = {
        id: 'mock-data-connection',
        name: 'mock_data_db@localhost',
        type: 'postgresql',
        status: 'active'
      };
      setDatabaseConnections([defaultConnection]);
      if (!selectedConnectionId) {
        setSelectedConnectionId(defaultConnection.id);
      }
    } finally {
      setConnectionLoading(false);
    }
  };

  // Load database connections on mount and check backend status
  useEffect(() => {
    checkBackendStatus();
    checkDemoBackendStatus();
    loadDatabaseConnections();
  }, []);

  return (
    <div className="app">
      <h1>🚀 Lighthouse SDK Demo</h1>
      <p className="subtitle">Test the Lighthouse SDK integration</p>

      <div className="card">
        <div className="button-group">
          <button 
            onClick={testMockAPI} 
            disabled={loading}
            className="test-button"
          >
            {loading ? 'Testing...' : 'Test Mock API Call'}
          </button>
        </div>

        <div className="custom-prompt-section">
          <h3>Query with Database & Hallucination Detection</h3>
          <p className="section-description">
            This section queries the demo backend (port 8081) which uses the database for context and sends traces to the main Lighthouse backend (port 8080) for hallucination detection.
          </p>
          
          <div className="database-connection-selector">
            <label htmlFor="db-connection">Database Connection:</label>
            <select
              id="db-connection"
              value={selectedConnectionId}
              onChange={(e) => setSelectedConnectionId(e.target.value)}
              className="db-select"
              disabled={connectionLoading}
            >
              {connectionLoading ? (
                <option>Loading connections...</option>
              ) : databaseConnections.length > 0 ? (
                databaseConnections.map(conn => (
                  <option key={conn.id} value={conn.id}>
                    {conn.name} ({conn.status})
                  </option>
                ))
              ) : (
                <option value="mock-data-connection">mock_data_db@localhost (active)</option>
              )}
            </select>
            <button
              onClick={loadDatabaseConnections}
              className="refresh-button"
              disabled={connectionLoading}
            >
              🔄 Refresh
            </button>
          </div>

          <textarea
            value={demoPrompt}
            onChange={(e) => setDemoPrompt(e.target.value)}
            placeholder="Enter your question about the database data..."
            className="prompt-input"
            rows={4}
          />
          <div className="prompt-examples">
            <p className="examples-label">Example queries:</p>
            <button
              className="example-button"
              onClick={() => setDemoPrompt('What hospitals are in the database?')}
            >
              What hospitals are in the database?
            </button>
            <button
              className="example-button"
              onClick={() => setDemoPrompt('List all employees in the Engineering department')}
            >
              List all employees in the Engineering department
            </button>
            <button
              className="example-button"
              onClick={() => setDemoPrompt('What countries are represented in the data?')}
            >
              What countries are represented in the data?
            </button>
          </div>
          <button 
            onClick={testDemoBackend} 
            disabled={loading || !demoPrompt.trim() || !selectedConnectionId}
            className="test-button primary"
          >
            {loading ? 'Querying...' : 'Query with Database'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className={`result-box ${result.type}`}>
            <div className="result-header">
              <strong>{result.message}</strong>
            </div>
            
            {result.queryResult && (
              <div className="hallucination-results">
                <h4>Hallucination Detection Results</h4>
                <div className="confidence-score">
                  <div className={`score-badge ${result.queryResult.confidenceScore && result.queryResult.confidenceScore >= 80 ? 'high' : result.queryResult.confidenceScore && result.queryResult.confidenceScore >= 60 ? 'medium' : 'low'}`}>
                    <span className="score-label">Confidence Score</span>
                    <span className="score-value">
                      {result.queryResult.confidenceScore?.toFixed(1) || 'N/A'}%
                    </span>
                  </div>
                  {result.queryResult.supportedClaims !== undefined && result.queryResult.totalClaims !== undefined && (
                    <div className="claims-breakdown">
                      <span>Supported Claims: {result.queryResult.supportedClaims} / {result.queryResult.totalClaims}</span>
                    </div>
                  )}
                  {result.queryResult.hallucinationsDetected && (
                    <div className="hallucination-warning">
                      ⚠️ Hallucinations detected in AI response
                    </div>
                  )}
                </div>
                {result.queryResult.databaseContext && (
                  <details className="database-context">
                    <summary>View Database Context Used</summary>
                    <pre>{result.queryResult.databaseContext}</pre>
                  </details>
                )}
              </div>
            )}

            {result.queryResult && (
              <div className="ai-response">
                <h4>AI Response:</h4>
                <div className="response-text">{result.queryResult.response}</div>
              </div>
            )}

            {/* Show AI response for demo backend queries (when there's no queryResult but there's a trace) */}
            {!result.queryResult && result.trace && result.trace.response && (
              <div className="ai-response">
                <h4>AI Response:</h4>
                <div className="response-text">{result.trace.response}</div>
              </div>
            )}

            {result.trace && (
              <div className="trace-info">
                <h4>Trace Data:</h4>
                <div className="trace-stats">
                  <div className="stat">
                    <span className="stat-label">Provider:</span>
                    <span className="stat-value">{result.trace.provider}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Tokens Used:</span>
                    <span className="stat-value">{result.trace.tokensUsed}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Cost (USD):</span>
                    <span className="stat-value">${result.trace.costUsd.toFixed(6)}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Latency:</span>
                    <span className="stat-value">{result.trace.latencyMs}ms</span>
                  </div>
                </div>
                <details className="trace-details">
                  <summary>View Full Trace Data</summary>
                  <pre>{JSON.stringify(result.trace, null, 2)}</pre>
                </details>
              </div>
            )}

            {result.apiResponse !== undefined && (
              <div className="api-response">
                <h4>API Response:</h4>
                <pre>{JSON.stringify(result.apiResponse, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        <div className="info-box">
          <div className="backend-status">
            <div style={{ marginBottom: '1rem' }}>
              <strong>Main Lighthouse Backend:</strong>{' '}
              <span className={`status-indicator ${backendStatus}`}>
                {backendStatus === 'checking' && '🔄 Checking...'}
                {backendStatus === 'online' && '✅ Online'}
                {backendStatus === 'offline' && '❌ Offline'}
              </span>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Demo Backend (Port 8081):</strong>{' '}
              <span className={`status-indicator ${demoBackendStatus}`}>
                {demoBackendStatus === 'checking' && '🔄 Checking...'}
                {demoBackendStatus === 'online' && '✅ Online'}
                {demoBackendStatus === 'offline' && '❌ Offline'}
              </span>
              <button
                onClick={checkDemoBackendStatus}
                className="refresh-button"
                style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
              >
                🔄 Refresh
              </button>
            </div>
            {demoBackendStatus === 'offline' && (
              <div className="status-help">
                <p>⚠️ Make sure your demo backend (Spring Boot) is running on port 8081</p>
                <p>Expected configuration:</p>
                <ul>
                  <li>Port: 8081</li>
                  <li>Endpoint: /api/demo/query</li>
                  <li>Gemini API key configured in application.properties</li>
                  <li>Lighthouse API URL: http://localhost:8080/api/sdk/traces</li>
                </ul>
                <p><strong>Database Connection (for demo backend):</strong></p>
                <ul>
                  <li>Host: localhost</li>
                  <li>Port: 5432</li>
                  <li>Database: mock_data_db</li>
                  <li>User: postgres</li>
                </ul>
              </div>
            )}
            {backendStatus === 'offline' && (
              <div className="status-help">
                <p>⚠️ Make sure your main Lighthouse backend is running on port 8080</p>
                <p>The main Lighthouse backend receives traces from the demo backend and handles hallucination detection, storage, and analytics.</p>
                <p><strong>Note:</strong> The main Lighthouse backend does NOT need the mock_data_db database. The database is only used by the demo backend (port 8081).</p>
              </div>
            )}
          </div>
          <p><strong>Base URL:</strong> {lighthouse.baseUrl || 'http://localhost:5174 (via proxy)'}</p>
          <p><strong>Demo Backend URL:</strong> {isDevelopment ? 'http://localhost:8081 (via proxy)' : 'http://localhost:8081'}</p>
          <p><strong>Demo Backend Endpoint:</strong> /api/demo/query</p>
          <p><strong>Main Lighthouse Backend:</strong> http://localhost:8080</p>
          <p><strong>API Key:</strong> lh_83513bd689b44ab9b53b679d689b50a9</p>
          <p className="read-the-docs">
            <strong>Query Flow:</strong> Frontend → Demo Backend (8081) → Database (mock_data_db on port 5432) → AI API (Gemini) with Database Context → Demo Backend → Main Lighthouse Backend (8080) for Hallucination Detection
          </p>
          <p className="read-the-docs">
            All queries go through the demo backend on port 8081, which connects to the PostgreSQL database (mock_data_db on port 5432) for context and sends traces to the main Lighthouse backend on port 8080 for hallucination detection.
            The main Lighthouse backend handles hallucination detection, storage, and analytics but does NOT need database access.
          </p>
          <p className="read-the-docs">
            Check your Lighthouse dashboard to see the traces!
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
