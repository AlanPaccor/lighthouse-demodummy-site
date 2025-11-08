# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Lighthouse SDK Testing

This project includes test files for the Lighthouse SDK wrapper. You can test the SDK using three different methods:

### Option 1: HTML Test File

Open `test-sdk.html` in your browser to test the SDK with a simple HTML interface. This file includes:
- Test buttons for OpenAI calls and custom fetch requests
- Inline Lighthouse SDK implementation
- Visual feedback for test results

**Usage:**
1. Make sure your Lighthouse backend is running on `http://localhost:8080`
2. Open `test-sdk.html` in your browser
3. Click the test buttons to send traces

### Option 2: Node.js Test Script

Run the Node.js test script to test the SDK from the command line.

**Setup:**
```bash
npm install node-fetch
```

**Usage:**
```bash
node test-sdk.js
```

### Option 3: cURL Test

Test the SDK endpoint directly using curl.

**Usage:**
```bash
chmod +x test-curl.sh
./test-curl.sh
```

Or run the curl command directly:
```bash
curl -X POST http://localhost:8080/api/sdk/traces \
  -H "Content-Type: application/json" \
  -H "X-API-Key: lh_83513bd689b44ab9b53b679d689b50a9" \
  -d '{
    "prompt": "Hello, this is a test!",
    "response": "This is a test response from the SDK",
    "tokensUsed": 50,
    "costUsd": 0.0001,
    "latencyMs": 150,
    "provider": "test"
  }'
```

### What to Look For

After running any test:
1. Check your dashboard at `http://localhost:5173`
2. Select "Test1" project
3. Verify the trace appears in the dashboard
4. Check that stats update (cost, requests, latency)
5. Confirm the trace shows in the Query History list
6. Verify API key authentication is working

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```



# Demo Backend Database Integration Guide

## Problem
The demo backend is receiving `databaseConnectionId` but not actually querying the database to get context for the AI prompt.

## Solution
The demo backend needs to:
1. Connect to the database using the provided connection details
2. Query the database based on the user's prompt
3. Get relevant context/data from the database
4. Include that context in the AI prompt
5. Call the AI API with the enhanced prompt
6. Send the trace to the main Lighthouse backend for hallucination detection

## Database Connection Details
Based on your IntelliJ data source configuration:
- **Host**: localhost
- **Port**: 5432
- **Database**: mock_data_db
- **User**: postgres
- **Driver**: org.postgresql.Driver
- **JDBC URL**: jdbc:postgresql://localhost:5432/mock_data_db

## Updated Demo Backend Code

### 1. Add Database Dependencies to `pom.xml`

```xml
<!-- PostgreSQL Driver -->
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <version>42.7.1</version>
</dependency>

<!-- Spring Boot JDBC -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-jdbc</artifactId>
</dependency>
```

### 2. Update `application.properties`

```properties
# Server Configuration
server.port=8081

# Main Lighthouse Backend URL
lighthouse.api.url=http://localhost:8080/api/sdk/traces
lighthouse.api.key=lh_83513bd689b44ab9b53b679d689b50a9

# OpenAI Configuration
openai.api.key=your_openai_key_here
openai.api.model=gpt-3.5-turbo
openai.api.temperature=0.7
openai.api.max-tokens=1000

# Database Configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/mock_data_db
spring.datasource.username=postgres
spring.datasource.password=your_password_here
spring.datasource.driver-class-name=org.postgresql.Driver
```

### 3. Create Database Service

```java
package com.lighthouse.demo.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class DatabaseService {
    
    @Autowired
    private JdbcTemplate jdbcTemplate;
    
    /**
     * Query the database to get relevant context based on the user's prompt
     */
    public String getDatabaseContext(String prompt, String databaseConnectionId) {
        try {
            // Simple approach: Get table names and sample data
            // You can make this more sophisticated based on your needs
            
            // Get all table names
            String sql = "SELECT table_name FROM information_schema.tables " +
                        "WHERE table_schema = 'public'";
            List<String> tables = jdbcTemplate.queryForList(sql, String.class);
            
            if (tables.isEmpty()) {
                return "No tables found in the database.";
            }
            
            StringBuilder context = new StringBuilder();
            context.append("Database: mock_data_db\n");
            context.append("Tables: ").append(String.join(", ", tables)).append("\n\n");
            
            // Get sample data from each table (limit to avoid too much data)
            for (String table : tables) {
                try {
                    String sampleSql = "SELECT * FROM " + table + " LIMIT 10";
                    List<Map<String, Object>> rows = jdbcTemplate.queryForList(sampleSql);
                    
                    if (!rows.isEmpty()) {
                        context.append("Sample data from ").append(table).append(":\n");
                        for (Map<String, Object> row : rows) {
                            context.append(row.toString()).append("\n");
                        }
                        context.append("\n");
                    }
                } catch (Exception e) {
                    // Skip tables that can't be queried
                    System.err.println("Error querying table " + table + ": " + e.getMessage());
                }
            }
            
            return context.toString();
            
        } catch (Exception e) {
            System.err.println("Error getting database context: " + e.getMessage());
            return "Error querying database: " + e.getMessage();
        }
    }
    
    /**
     * Get more targeted context based on the prompt
     */
    public String getTargetedContext(String prompt) {
        try {
            // Try to extract keywords from the prompt
            String lowerPrompt = prompt.toLowerCase();
            
            // If prompt mentions hospitals, query hospital-related tables
            if (lowerPrompt.contains("hospital")) {
                return queryTable("hospitals", 20);
            }
            
            // If prompt mentions employees, query employee-related tables
            if (lowerPrompt.contains("employee") || lowerPrompt.contains("staff")) {
                return queryTable("employees", 20);
            }
            
            // Default: get schema information
            return getSchemaInfo();
            
        } catch (Exception e) {
            System.err.println("Error getting targeted context: " + e.getMessage());
            return getSchemaInfo();
        }
    }
    
    private String queryTable(String tableName, int limit) {
        try {
            String sql = "SELECT * FROM " + tableName + " LIMIT " + limit;
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
            
            if (rows.isEmpty()) {
                return "No data found in table: " + tableName;
            }
            
            StringBuilder context = new StringBuilder();
            context.append("Data from ").append(tableName).append(":\n");
            for (Map<String, Object> row : rows) {
                context.append(row.toString()).append("\n");
            }
            return context.toString();
            
        } catch (Exception e) {
            return "Error querying table " + tableName + ": " + e.getMessage();
        }
    }
    
    private String getSchemaInfo() {
        try {
            String sql = "SELECT table_name, column_name, data_type " +
                        "FROM information_schema.columns " +
                        "WHERE table_schema = 'public' " +
                        "ORDER BY table_name, ordinal_position";
            List<Map<String, Object>> columns = jdbcTemplate.queryForList(sql);
            
            StringBuilder context = new StringBuilder();
            context.append("Database Schema:\n");
            String currentTable = "";
            for (Map<String, Object> col : columns) {
                String table = (String) col.get("table_name");
                if (!table.equals(currentTable)) {
                    context.append("\nTable: ").append(table).append("\n");
                    currentTable = table;
                }
                context.append("  - ").append(col.get("column_name"))
                       .append(" (").append(col.get("data_type")).append(")\n");
            }
            return context.toString();
        } catch (Exception e) {
            return "Error getting schema info: " + e.getMessage();
        }
    }
}
```

### 4. Update AIService to Use Database Context

```java
package com.lighthouse.demo.service;

import com.lighthouse.demo.model.AIResponse;
import com.theokanning.openai.OpenAiService;
import com.theokanning.openai.completion.chat.ChatCompletionRequest;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.completion.chat.ChatMessageRole;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class AIService {
    
    @Autowired
    private DatabaseService databaseService;
    
    @Value("${openai.api.key}")
    private String openaiApiKey;
    
    @Value("${openai.api.model:gpt-3.5-turbo}")
    private String model;
    
    @Value("${openai.api.temperature:0.7}")
    private double temperature;
    
    @Value("${openai.api.max-tokens:1000}")
    private int maxTokens;
    
    public AIResponse callAI(String prompt, String databaseConnectionId) {
        long startTime = System.currentTimeMillis();
        
        try {
            // Get database context
            String databaseContext = databaseService.getTargetedContext(prompt);
            
            // Build enhanced prompt with database context
            String enhancedPrompt = buildEnhancedPrompt(prompt, databaseContext);
            
            // Initialize OpenAI service
            OpenAiService service = new OpenAiService(openaiApiKey);
            
            // Create chat messages
            List<ChatMessage> messages = new ArrayList<>();
            messages.add(new ChatMessage(ChatMessageRole.USER.value(), enhancedPrompt));
            
            // Create completion request
            ChatCompletionRequest completionRequest = ChatCompletionRequest.builder()
                    .model(model)
                    .messages(messages)
                    .temperature(temperature)
                    .maxTokens(maxTokens)
                    .build();
            
            // Call OpenAI API
            String response = service.createChatCompletion(completionRequest)
                    .getChoices()
                    .get(0)
                    .getMessage()
                    .getContent();
            
            long latencyMs = System.currentTimeMillis() - startTime;
            
            // Estimate tokens (rough calculation)
            int tokensUsed = estimateTokens(enhancedPrompt, response);
            
            // Calculate cost
            double costUsd = calculateCost(enhancedPrompt.length(), response.length());
            
            return new AIResponse(response, tokensUsed, costUsd, latencyMs, "openai");
            
        } catch (Exception e) {
            long latencyMs = System.currentTimeMillis() - startTime;
            String errorResponse = "Error calling AI API: " + e.getMessage();
            return new AIResponse(errorResponse, 0, 0.0, latencyMs, "openai");
        }
    }
    
    private String buildEnhancedPrompt(String userPrompt, String databaseContext) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You have access to a database with the following context:\n\n");
        prompt.append(databaseContext);
        prompt.append("\n\n");
        prompt.append("User Question: ").append(userPrompt);
        prompt.append("\n\n");
        prompt.append("Please answer the user's question based on the database context provided above. ");
        prompt.append("If the information is not available in the database context, please say so clearly.");
        
        return prompt.toString();
    }
    
    private int estimateTokens(String prompt, String response) {
        return (int) Math.ceil((prompt.length() + response.length()) / 4.0);
    }
    
    private double calculateCost(int promptLength, int responseLength) {
        double inputTokens = promptLength / 4.0 / 1000.0;
        double outputTokens = responseLength / 4.0 / 1000.0;
        return (inputTokens * 0.0015) + (outputTokens * 0.002);
    }
}
```

### 5. Update DemoBackendController

```java
package com.lighthouse.demo.controller;

import com.lighthouse.demo.model.AIResponse;
import com.lighthouse.demo.service.AIService;
import com.lighthouse.demo.service.LighthouseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/demo")
@CrossOrigin(origins = "*")
public class DemoBackendController {
    
    @Autowired
    private AIService aiService;
    
    @Autowired
    private LighthouseService lighthouseService;
    
    @PostMapping("/query")
    public ResponseEntity<Map<String, Object>> executeQuery(@RequestBody Map<String, String> request) {
        try {
            String prompt = request.get("prompt");
            String databaseConnectionId = request.get("databaseConnectionId");
            
            if (prompt == null || prompt.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Prompt is required", "success", false));
            }
            
            // Call AI API with database context
            AIResponse aiResponse = aiService.callAI(prompt, databaseConnectionId);
            
            // Send trace to main Lighthouse backend (async, non-blocking)
            lighthouseService.sendTraceToLighthouse(prompt, aiResponse);
            
            // Return response to demo frontend
            Map<String, Object> response = new HashMap<>();
            response.put("response", aiResponse.getText());
            response.put("success", true);
            response.put("tokensUsed", aiResponse.getTokensUsed());
            response.put("costUsd", aiResponse.getCostUsd());
            response.put("latencyMs", aiResponse.getLatencyMs());
            response.put("provider", aiResponse.getProvider());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            errorResponse.put("success", false);
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "ok", "service", "demo-backend"));
    }
}
```

## Integration with Main Lighthouse Backend

The demo backend should also call the main Lighthouse backend's `/api/traces/query-with-db` endpoint to get hallucination detection results. Update `LighthouseService`:

```java
public void sendTraceToLighthouse(String prompt, AIResponse aiResponse, String databaseConnectionId) {
    try {
        // First, send to query-with-db endpoint for hallucination detection
        Map<String, Object> queryRequest = new HashMap<>();
        queryRequest.put("prompt", prompt);
        queryRequest.put("response", aiResponse.getText());
        queryRequest.put("databaseConnectionId", databaseConnectionId);
        queryRequest.put("tokensUsed", aiResponse.getTokensUsed());
        queryRequest.put("costUsd", aiResponse.getCostUsd());
        queryRequest.put("latencyMs", aiResponse.getLatencyMs());
        queryRequest.put("provider", aiResponse.getProvider());
        
        // Call main Lighthouse backend for hallucination detection
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:8080/api/traces/query-with-db"))
                .header("Content-Type", "application/json")
                .header("X-API-Key", lighthouseApiKey)
                .timeout(Duration.ofSeconds(30))
                .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(queryRequest)))
                .build();
        
        // Get hallucination detection results
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        
        if (response.statusCode() == 200) {
            // Parse response to get hallucination detection results
            Map<String, Object> result = gson.fromJson(response.body(), Map.class);
            // Include these results in the response to frontend
        }
        
    } catch (Exception e) {
        System.err.println("Failed to send trace to Lighthouse: " + e.getMessage());
    }
}
```

## Testing

After implementing these changes:

1. Make sure PostgreSQL is running on port 5432
2. Make sure the database `mock_data_db` exists and has data
3. Update the database password in `application.properties`
4. Restart the demo backend
5. Test with a query like "What hospitals are in the database?"

The AI should now have access to the database context and be able to answer questions about the data.

