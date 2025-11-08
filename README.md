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
