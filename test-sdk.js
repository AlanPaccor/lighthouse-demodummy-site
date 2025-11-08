// test-sdk.js
import fetch from 'node-fetch'; // npm install node-fetch

class Lighthouse {
    constructor(config) {
        this.apiKey = config.apiKey;
        this.endpoint = config.endpoint || 'http://localhost:8080/api/sdk/traces';
        this.enabled = config.enabled !== false;
    }
    
    async trackFetch(url, options, metadata) {
        const startTime = Date.now();
        const prompt = metadata?.prompt || '';
        const provider = metadata?.provider || 'openai';
        
        try {
            const response = await fetch(url, options);
            const responseText = await response.clone().text();
            const latencyMs = Date.now() - startTime;
            const tokensUsed = Math.ceil((prompt.length + responseText.length) / 4);
            const costUsd = (tokensUsed / 1000) * 0.002;
            
            const trace = {
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
            
            await this.sendTrace(trace);
            return response;
        } catch (error) {
            const trace = {
                prompt: prompt.substring(0, 10000),
                response: `Error: ${error.message}`,
                tokensUsed: 0,
                costUsd: 0,
                latencyMs: Date.now() - startTime,
                provider: provider || 'unknown',
                metadata: { error: true, errorMessage: error.message }
            };
            await this.sendTrace(trace);
            throw error;
        }
    }
    
    async sendTrace(trace) {
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

// Test it
async function test() {
    const lighthouse = new Lighthouse({
        apiKey: 'lh_83513bd689b44ab9b53b679d689b50a9',
        endpoint: 'http://localhost:8080/api/sdk/traces'
    });
    
    console.log('Testing Lighthouse SDK...');
    
    // Test with a simple API call
    try {
        const response = await lighthouse.trackFetch(
            'https://jsonplaceholder.typicode.com/posts/1',
            { method: 'GET' },
            {
                prompt: 'Get post data',
                provider: 'custom'
            }
        );
        const data = await response.json();
        console.log('✅ Success! Trace sent to Lighthouse');
        console.log('Response:', data);
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

test();

