import { useState } from 'react'
import './App.css'

// Types
interface LighthouseConfig {
  apiKey: string;
  endpoint?: string;
  enabled?: boolean;
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

interface TestResult {
  type: 'success' | 'error';
  apiResponse?: unknown;
  trace: Trace;
  message: string;
}

// Lighthouse SDK Class
class Lighthouse {
  apiKey: string;
  endpoint: string;
  enabled: boolean;

  constructor(config: LighthouseConfig) {
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint || 'http://localhost:8080/api/sdk/traces';
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
}

// Initialize Lighthouse
const lighthouse = new Lighthouse({
  apiKey: 'lh_83513bd689b44ab9b53b679d689b50a9',
  endpoint: 'http://localhost:8080/api/sdk/traces'
});

function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('Say hello!');

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

  const testCustomPrompt = async () => {
    if (!customPrompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Simulate an API call with the custom prompt
      const { response, trace } = await lighthouse.trackFetch(
        'https://jsonplaceholder.typicode.com/posts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: 'Test Post',
            body: customPrompt,
            userId: 1
          })
        },
        {
          prompt: customPrompt,
          provider: 'custom',
          model: 'test-model'
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
      const errorMessage = (err as { error?: Error }).error?.message || 'Failed to send';
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
          <h3>Custom Prompt Test</h3>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            className="prompt-input"
            rows={3}
          />
          <button 
            onClick={testCustomPrompt} 
            disabled={loading || !customPrompt.trim()}
            className="test-button"
          >
            {loading ? 'Sending...' : 'Test Custom Prompt'}
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
            
            {result.trace && (
              <div className="trace-info">
                <h4>Trace Data Sent to Lighthouse:</h4>
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
          <p><strong>Endpoint:</strong> http://localhost:8080/api/sdk/traces</p>
          <p><strong>API Key:</strong> lh_83513bd689b44ab9b53b679d689b50a9</p>
          <p className="read-the-docs">
            Check your Lighthouse dashboard at <code>http://localhost:5173</code> to see the traces!
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
