# Lighthouse Mock SDK demoApi

A full-stack demo application showcasing an AI-powered query system with database context integration and hallucination detection. This project consists of a React frontend and Spring Boot backend that work together to provide context-aware AI responses.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Frontend Setup](#frontend-setup)
- [Backend Setup](#backend-setup)
- [Database Setup](#database-setup)
- [How It Works Together](#how-it-works-together)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

This is a demo application that demonstrates:

- **Frontend (React + TypeScript + Vite)**: A modern web interface for querying an AI system
- **Backend (Spring Boot)**: A proxy service that connects to AI APIs (Gemini) with database context
- **Database (PostgreSQL)**: Stores data that provides context for AI queries
- **Main Lighthouse Backend**: Handles hallucination detection and trace storage

The system allows users to query an AI model that has access to database context, enabling accurate responses based on actual data.

## 🏗️ Architecture

### System Flow

```
┌─────────────────┐
│  React Frontend │  (Port 5174)
│   (Port 5174)   │
└────────┬────────┘
         │
         │ POST /api/demo/query
         │ { prompt, databaseConnectionId }
         ▼
┌─────────────────┐
│  Demo Backend   │  (Port 8081)
│  Spring Boot    │
└────────┬────────┘
         │
         ├─► Query PostgreSQL Database (Port 5432)
         │   └─► Get relevant context from mock_data table
         │
         ├─► Build Enhanced Prompt with Database Context
         │
         ├─► Call Gemini AI API
         │   └─► Get AI response with database context
         │
         └─► Send Trace to Main Lighthouse Backend (Port 8080)
             └─► POST /api/traces/query-with-db
                 └─► Hallucination Detection & Validation
                     └─► Return confidence scores
         │
         ▼
┌─────────────────┐
│  Main Lighthouse│  (Port 8080)
│     Backend     │
└─────────────────┘
```

### Components

1. **Frontend (React)**
   - User interface for entering queries
   - Database connection selector
   - Real-time status monitoring
   - Results display with hallucination detection
   - Error handling and troubleshooting

2. **Demo Backend (Spring Boot)**
   - Receives queries from frontend
   - Queries PostgreSQL database for context
   - Calls Gemini AI API with enhanced prompts
   - Sends traces to main Lighthouse backend
   - Returns responses with hallucination detection results

3. **PostgreSQL Database**
   - Stores `mock_data` table with sample data
   - Provides context for AI queries
   - Accessible on port 5432

4. **Main Lighthouse Backend**
   - Receives traces from demo backend
   - Performs hallucination detection
   - Validates responses against database
   - Stores traces and analytics

## 📦 Prerequisites

### Required Software

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Java** 17 or higher
- **Maven** 3.6+
- **PostgreSQL** 12+ (running on port 5432)
- **Main Lighthouse Backend** (running on port 8080)

### Required API Keys

- **Gemini API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Lighthouse API Key**: `lh_83513bd689b44ab9b53b679d689b50a9` (demo key)

## 📁 Project Structure

```
my-react-app/
├── src/                          # Frontend source code
│   ├── App.tsx                   # Main React component
│   ├── App.css                   # Styles
│   ├── main.tsx                  # React entry point
│   └── index.css                 # Global styles
├── public/                       # Static assets
├── vite.config.ts               # Vite configuration with proxy
├── package.json                 # Frontend dependencies
├── tsconfig.json                # TypeScript configuration
│
└── demo-backend/                 # Backend project (separate)
    ├── src/main/java/
    │   └── com/example/lighthousedummydemo/
    │       ├── controller/       # REST controllers
    │       ├── service/           # Business logic
    │       │   ├── AIService.java
    │       ├── DatabaseService.java
    │       └── LighthouseService.java
    │       └── model/            # Data models
    │       └── LighthouseDummyDemoApplication.java
    ├── src/main/resources/
    │   └── application.properties
    └── pom.xml                   # Maven dependencies
```

## 🎨 Frontend Setup

### Installation

```bash
# Install dependencies
npm install
```

### Configuration

The frontend is configured in `vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',  // Proxies to demo backend
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
```

**Key Features:**
- **Vite Dev Server**: Runs on port 5174
- **API Proxy**: All `/api/*` requests are proxied to `http://localhost:8081`
- **Hot Module Replacement**: Fast development with instant updates

### Frontend Components

#### Main App Component (`App.tsx`)

The main component includes:

1. **Lighthouse SDK Class**: Client-side SDK for tracking
   ```typescript
   class Lighthouse {
     apiKey: string;
     endpoint: string;
     baseUrl: string;
     
     async trackFetch(url, options, metadata)
     async sendTrace(trace)
     async queryWithDatabase(request)
     async getDatabaseConnections()
   }
   ```

2. **State Management**:
   - `demoPrompt`: User's query text
   - `selectedConnectionId`: Selected database connection
   - `databaseConnections`: Available database connections
   - `loading`: Loading state
   - `result`: Query results with hallucination detection
   - `error`: Error messages
   - `backendStatus`: Main Lighthouse backend status
   - `demoBackendStatus`: Demo backend status

3. **Key Functions**:
   - `testDemoBackend()`: Sends query to demo backend
   - `checkDemoBackendStatus()`: Health check for demo backend
   - `loadDatabaseConnections()`: Fetches available database connections

#### UI Features

- **Enterprise AI Query Interface**: Main query section
- **Database Connection Selector**: Dropdown for selecting database
- **Example Queries**: Quick buttons for common queries
- **Real-time Status**: Shows backend connection status
- **Results Display**: Shows AI response, trace data, and hallucination detection
- **Error Detection**: Automatically detects database connection errors

### Running the Frontend

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The frontend will be available at `http://localhost:5174`

## ⚙️ Backend Setup

### Installation

The backend is a separate Spring Boot project. Navigate to the backend directory:

```bash
cd demo-backend  # or wherever your Spring Boot project is
```

### Maven Dependencies

Ensure `pom.xml` includes:

```xml
<dependencies>
    <!-- Spring Boot Web -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    
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
    
    <!-- Gson for JSON -->
    <dependency>
        <groupId>com.google.code.gson</groupId>
        <artifactId>gson</artifactId>
        <version>2.10.1</version>
    </dependency>
</dependencies>
```

### Backend Components

#### 1. DemoBackendController

**Location**: `com.example.lighthousedummydemo.controller.DemoBackendController`

**Endpoints**:
- `POST /api/demo/query`: Main query endpoint
- `GET /api/demo/health`: Health check endpoint

**Request Body**:
```json
{
  "prompt": "What hospitals are in the database?",
  "databaseConnectionId": "mock-data-connection",
  "model": "gpt-3.5-turbo",
  "temperature": 0.7,
  "maxTokens": 1000
}
```

**Response**:
```json
{
  "response": "AI response text...",
  "success": true,
  "tokensUsed": 127,
  "costUsd": 0.0,
  "latencyMs": 852,
  "provider": "gemini",
  "confidenceScore": 95.5,
  "hallucinationsDetected": false,
  "supportedClaims": 5,
  "totalClaims": 5
}
```

#### 2. AIService

**Location**: `com.example.lighthousedummydemo.service.AIService`

**Responsibilities**:
- Calls Gemini AI API
- Integrates database context into prompts
- Calculates tokens and costs
- Measures latency

**Key Method**:
```java
public AIResponse callAI(String prompt, String databaseConnectionId)
```

**Process**:
1. Gets database context from `DatabaseService`
2. Builds enhanced prompt with database data
3. Calls Gemini API
4. Returns response with metrics

#### 3. DatabaseService

**Location**: `com.example.lighthousedummydemo.service.DatabaseService`

**Responsibilities**:
- Queries PostgreSQL database
- Detects relevant tables based on prompt keywords
- Retrieves sample data for context
- Handles database errors gracefully

**Key Method**:
```java
public String getDatabaseContext(String prompt, String databaseConnectionId)
```

**Table Detection Logic**:
- "hospital" → queries tables with "hospital" in name
- "employee", "people", "person", "name" → queries `mock_data` table
- "department" → queries tables with "department" in name
- Default → uses first available table (usually `mock_data`)

#### 4. LighthouseService

**Location**: `com.example.lighthousedummydemo.service.LighthouseService`

**Responsibilities**:
- Sends traces to main Lighthouse backend
- Calls hallucination detection endpoint
- Returns hallucination detection results

**Key Method**:
```java
public Map<String, Object> sendTraceToLighthouse(
    String prompt, 
    AIResponse aiResponse, 
    String databaseConnectionId
)
```

### Configuration (`application.properties`)

```properties
# Server Configuration
server.port=8081

# Main Lighthouse Backend
lighthouse.api.url=http://localhost:8080/api/sdk/traces
lighthouse.api.base-url=http://localhost:8080
lighthouse.api.key=lh_83513bd689b44ab9b53b679d689b50a9

# Gemini API
gemini.api.key=${GEMINI_API_KEY}
gemini.api.url=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent

# Database Configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/mock_data_db
spring.datasource.username=postgres
spring.datasource.password=your_password_here
spring.datasource.driver-class-name=org.postgresql.Driver

# Connection Pool Settings
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.maximum-pool-size=5
spring.datasource.hikari.minimum-idle=2
spring.datasource.hikari.idle-timeout=300000
spring.datasource.hikari.max-lifetime=600000

# Logging
logging.level.com.example.lighthousedummydemo=DEBUG
logging.level.com.zaxxer.hikari=DEBUG
logging.level.org.springframework.jdbc=DEBUG
```

### Running the Backend

```bash
# Using Maven
mvn spring-boot:run

# Or build and run JAR
mvn clean package
java -jar target/demo-backend-0.0.1-SNAPSHOT.jar
```

The backend will be available at `http://localhost:8081`

## 🗄️ Database Setup

### PostgreSQL Installation

1. **Install PostgreSQL** (if not already installed)
   ```bash
   # macOS
   brew install postgresql@14
   brew services start postgresql@14
   
   # Linux
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. **Create Database**
   ```sql
   CREATE DATABASE mock_data_db;
   ```

3. **Create User** (if needed)
   ```sql
   CREATE USER postgres WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE mock_data_db TO postgres;
   ```

### Import Mock Data

1. **Create Table**:
   ```sql
   \c mock_data_db
   
   CREATE TABLE mock_data (
       id SERIAL PRIMARY KEY,
       first_name VARCHAR(100),
       last_name VARCHAR(100),
       email VARCHAR(255),
       gender VARCHAR(20),
       ip_address VARCHAR(45),
       hospital_name VARCHAR(255),
       ssn VARCHAR(20),
       job_title VARCHAR(255),
       isbn VARCHAR(50),
       color VARCHAR(50),
       street_address VARCHAR(255),
       city VARCHAR(100),
       state VARCHAR(100),
       postal_code VARCHAR(20),
       country VARCHAR(100),
       phone_number VARCHAR(20),
       email_address VARCHAR(255),
       bank_country_code VARCHAR(10),
       stock_symbol VARCHAR(10),
       department VARCHAR(100),
       university VARCHAR(255),
       language VARCHAR(50),
       flight_number VARCHAR(20),
       bank_name VARCHAR(255)
   );
   ```

2. **Import CSV Data**:
   ```sql
   COPY mock_data FROM '/path/to/MOCK_DATA.csv' WITH CSV HEADER;
   ```

   Or use a CSV import tool in your PostgreSQL client.

### Verify Database

```sql
-- Check table exists
SELECT COUNT(*) FROM mock_data;

-- View sample data
SELECT * FROM mock_data LIMIT 5;
```

## 🔄 How It Works Together

### Complete Request Flow

1. **User enters query in frontend**
   - Types question in textarea
   - Selects database connection
   - Clicks "Execute AI Query"

2. **Frontend sends request**
   ```typescript
   POST /api/demo/query
   {
     prompt: "What hospitals are in the database?",
     databaseConnectionId: "mock-data-connection",
     model: "gpt-3.5-turbo",
     temperature: 0.7,
     maxTokens: 1000
   }
   ```
   - Request goes through Vite proxy to `http://localhost:8081`

3. **Demo Backend receives request**
   - `DemoBackendController.executeQuery()` extracts prompt and databaseConnectionId
   - Calls `AIService.callAI(prompt, databaseConnectionId)`

4. **AIService processes request**
   - Calls `DatabaseService.getDatabaseContext(prompt, databaseConnectionId)`
   - `DatabaseService` queries PostgreSQL:
     - Detects relevant table (e.g., `mock_data`)
     - Retrieves sample rows (LIMIT 20)
     - Returns formatted context string
   - Builds enhanced prompt:
     ```
     You have access to a database with the following context:
     
     Data from table 'mock_data':
     Columns: id, first_name, last_name, email, ...
     
     Row 1: {id=2, first_name=Alayne, last_name=Benkhe, ...}
     Row 2: {id=3, first_name=Allin, last_name=King, ...}
     ...
     
     User Question: What hospitals are in the database?
     
     Please answer based on the database context...
     ```

5. **AIService calls Gemini API**
   - Sends enhanced prompt to Gemini
   - Receives AI response with database context
   - Calculates metrics (tokens, cost, latency)

6. **LighthouseService sends trace**
   - Calls main Lighthouse backend: `POST /api/traces/query-with-db`
   - Sends prompt, response, and databaseConnectionId
   - Main Lighthouse backend:
     - Validates response against database
     - Calculates confidence score
     - Detects hallucinations
     - Returns results

7. **Demo Backend returns response**
   ```json
   {
     "response": "Based on the database, the hospitals include...",
     "success": true,
     "tokensUsed": 3168,
     "costUsd": 0.0,
     "latencyMs": 979,
     "provider": "gemini",
     "confidenceScore": 95.5,
     "hallucinationsDetected": false,
     "supportedClaims": 5,
     "totalClaims": 5
   }
   ```

8. **Frontend displays results**
   - Shows AI response
   - Displays trace data (tokens, cost, latency)
   - Shows hallucination detection results
   - Displays confidence score

## 📡 API Endpoints

### Demo Backend Endpoints

#### POST `/api/demo/query`

Main query endpoint that processes AI queries with database context.

**Request**:
```json
{
  "prompt": "What hospitals are in the database?",
  "databaseConnectionId": "mock-data-connection",
  "model": "gpt-3.5-turbo",
  "temperature": 0.7,
  "maxTokens": 1000
}
```

**Response**:
```json
{
  "response": "AI response text...",
  "success": true,
  "tokensUsed": 127,
  "costUsd": 0.0,
  "latencyMs": 852,
  "provider": "gemini",
  "confidenceScore": 95.5,
  "hallucinationsDetected": false,
  "supportedClaims": 5,
  "totalClaims": 5,
  "databaseContext": "Data from table 'mock_data'...",
  "traceId": "trace-123"
}
```

#### GET `/api/demo/health`

Health check endpoint.

**Response**:
```json
{
  "status": "ok",
  "service": "demo-backend"
}
```

### Main Lighthouse Backend Endpoints

#### POST `/api/traces/query-with-db`

Hallucination detection endpoint (called by demo backend).

**Request**:
```json
{
  "prompt": "What hospitals are in the database?",
  "response": "AI response text...",
  "databaseConnectionId": "mock-data-connection",
  "tokensUsed": 127,
  "costUsd": 0.0,
  "latencyMs": 852,
  "provider": "gemini"
}
```

**Response**:
```json
{
  "response": "AI response text...",
  "confidenceScore": 95.5,
  "hallucinationsDetected": false,
  "supportedClaims": 5,
  "totalClaims": 5,
  "databaseContext": "Data from table 'mock_data'...",
  "traceId": "trace-123"
}
```

## ⚙️ Configuration

### Environment Variables

#### Frontend
No environment variables required (uses Vite proxy).

#### Backend
Set `GEMINI_API_KEY` environment variable:
```bash
export GEMINI_API_KEY=your_gemini_api_key_here
```

Or add to `application.properties`:
```properties
gemini.api.key=your_gemini_api_key_here
```

### Port Configuration

| Service | Port | Description |
|---------|------|-------------|
| Frontend (Vite) | 5174 | React development server |
| Demo Backend | 8081 | Spring Boot application |
| Main Lighthouse Backend | 8080 | Lighthouse backend service |
| PostgreSQL | 5432 | Database server |

### Database Configuration

Update `application.properties` with your database credentials:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/mock_data_db
spring.datasource.username=postgres
spring.datasource.password=your_actual_password
```

## 🚀 Running the Application

### Step-by-Step Startup

1. **Start PostgreSQL**
   ```bash
   # macOS
   brew services start postgresql@14
   
   # Linux
   sudo systemctl start postgresql
   
   # Verify it's running
   psql -U postgres -d mock_data_db -c "SELECT 1;"
   ```

2. **Start Main Lighthouse Backend** (if separate)
   ```bash
   # Navigate to main Lighthouse backend directory
   # Start the service on port 8080
   ```

3. **Start Demo Backend**
   ```bash
   cd demo-backend
   mvn spring-boot:run
   # Should start on http://localhost:8081
   ```

4. **Start Frontend**
   ```bash
   npm run dev
   # Should start on http://localhost:5174
   ```

5. **Verify All Services**
   - Frontend: http://localhost:5174
   - Demo Backend Health: http://localhost:8081/api/demo/health
   - Main Lighthouse Backend: http://localhost:8080 (if applicable)

### Quick Start Script

Create a `start-all.sh` script:

```bash
#!/bin/bash

# Start PostgreSQL (if not running)
brew services start postgresql@14 2>/dev/null || true

# Start demo backend in background
cd demo-backend
mvn spring-boot:run &
BACKEND_PID=$!

# Wait for backend to start
sleep 10

# Start frontend
cd ..
npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT
```

## 🧪 Testing

### Manual Testing

1. **Test Database Connection**
   ```bash
   psql -h localhost -p 5432 -U postgres -d mock_data_db
   SELECT COUNT(*) FROM mock_data;
   ```

2. **Test Demo Backend Health**
   ```bash
   curl http://localhost:8081/api/demo/health
   ```

3. **Test Query Endpoint**
   ```bash
   curl -X POST http://localhost:8081/api/demo/query \
     -H "Content-Type: application/json" \
     -d '{
       "prompt": "What hospitals are in the database?",
       "databaseConnectionId": "mock-data-connection"
     }'
   ```

4. **Test from Frontend**
   - Open http://localhost:5174
   - Enter a query like "What hospitals are in the database?"
   - Click "Execute AI Query"
   - Verify response includes database data

### Example Queries

- "What hospitals are in the database?"
- "Give me 2 names of people in the db"
- "Where does Alayne live and what's their bank?"
- "List all employees in the Engineering department"
- "What countries are represented in the data?"

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Error**: `Connection to localhost:5432 refused`

**Solutions**:
- Verify PostgreSQL is running: `psql -U postgres -d mock_data_db`
- Check port in `application.properties` (should be 5432, not 5433)
- Verify database exists: `\l` in psql
- Check password in `application.properties`
- Verify user has permissions: `GRANT ALL ON DATABASE mock_data_db TO postgres;`

#### 2. Demo Backend Not Starting

**Error**: Port 8081 already in use

**Solutions**:
- Find process using port: `lsof -i :8081`
- Kill process: `kill -9 <PID>`
- Or change port in `application.properties`: `server.port=8082`

#### 3. Frontend Can't Connect to Backend

**Error**: Network error or CORS issues

**Solutions**:
- Verify backend is running: `curl http://localhost:8081/api/demo/health`
- Check Vite proxy configuration in `vite.config.ts`
- Verify proxy target is `http://localhost:8081`
- Check browser console for detailed errors

#### 4. AI Not Using Database Context

**Error**: AI responds "I don't have access to database"

**Solutions**:
- Check backend logs for database connection errors
- Verify `DatabaseService` is being called
- Check that `databaseConnectionId` is being passed
- Verify table exists: `SELECT * FROM mock_data LIMIT 1;`
- Check backend console for "Database context retrieved" message

#### 5. Hallucination Detection Not Working

**Error**: `confidenceScore` is `N/A`

**Solutions**:
- Verify main Lighthouse backend is running on port 8080
- Check `LighthouseService` is calling correct endpoint
- Verify API key is correct: `lh_83513bd689b44ab9b53b679d689b50a9`
- Check main Lighthouse backend logs for errors
- Verify main Lighthouse backend has database access (if needed)

### Debug Mode

Enable detailed logging in `application.properties`:

```properties
logging.level.com.example.lighthousedummydemo=DEBUG
logging.level.com.zaxxer.hikari=DEBUG
logging.level.org.springframework.jdbc=DEBUG
logging.level.org.springframework.web=DEBUG
```

### Checking Logs

**Backend Logs**:
- Check console output when running `mvn spring-boot:run`
- Look for "Database context retrieved" messages
- Check for connection errors

**Frontend Logs**:
- Open browser DevTools (F12)
- Check Console tab for errors
- Check Network tab for failed requests

## 📝 Additional Notes

### Development Tips

1. **Hot Reload**: Frontend has HMR enabled - changes reflect immediately
2. **Backend Restart**: Backend requires restart after `application.properties` changes
3. **Database Changes**: Restart backend after database schema changes
4. **API Keys**: Never commit API keys to version control

### Security Considerations

- This is a **demo application** - not production-ready
- API keys are hardcoded for demo purposes
- CORS is open (`@CrossOrigin(origins = "*")`)
- Database credentials are in plain text
- For production, use environment variables and proper security

### Performance

- Database queries are limited to 20 rows to avoid large prompts
- Connection pool is configured for 5 max connections
- AI responses are cached in browser (React state)
- Consider adding caching layer for production

## 🤝 Contributing

This is a demo project. For production use:
- Add proper error handling
- Implement authentication
- Add rate limiting
- Use environment variables for secrets
- Add comprehensive tests
- Implement proper logging
- Add monitoring and alerting

## 📄 License

This is a demo project for educational purposes.

---

**Built with**: React, TypeScript, Vite, Spring Boot, PostgreSQL, Gemini AI
