# Code Explainer MCP

A Cloudflare Worker that serves as an MCP (Model Context Protocol) server for code explanation. It analyzes and explains code with a comprehensive breakdown of structure and functionality.

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)

## Features

- **Architecture Diagram**: Generates an ASCII diagram showing the overall structure, relationships between components, and data flow.
- **Core Functionality Analysis**: Identifies and explains the primary purpose of the code based on pattern recognition.
- **Component Breakdown**: Lists all main classes and functions with brief descriptions of their roles.
- **Multi-language Support**: Analyzes code in various programming languages including JavaScript, TypeScript, Python, Java, C#, and more.
- **JSDoc/Docstring Recognition**: Extracts and utilizes existing documentation in the code.
- **Secure API**: Bearer token authentication to secure your endpoints.

## How It Works

The Code Explainer analyzes source code using a combination of techniques:

1. **Pattern Recognition**: Identifies code structures and common patterns
2. **Relationship Analysis**: Maps dependencies between components
3. **Documentation Extraction**: Prioritizes existing documentation comments
4. **Architecture Visualization**: Creates ASCII diagrams of the code structure
5. **Component Description**: Provides semantic descriptions of functions and classes

All processing happens within the Cloudflare Worker with no external dependencies.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (version 12 or higher)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/get-started/) (Cloudflare Workers CLI)
- A Cloudflare account

### Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/BillDuke13/code-explainer-mcp.git
   cd code-explainer-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your secret key:
   - Edit `wrangler.jsonc` and replace `YOUR_SECRET_KEY_HERE` with your chosen secret key, or
   - Use Cloudflare secrets (recommended for production):
     ```bash
     wrangler secret put SHARED_SECRET
     ```

4. Deploy to Cloudflare Workers:
   ```bash
   npm run deploy
   ```

## Usage

### API Endpoint

Send a POST request to your worker URL with the following JSON body:

```json
{
  "method": "explainCode",
  "params": ["your code here", "programming language"]
}
```

Include the Authorization header with your secret key:
```
Authorization: Bearer YOUR_SECRET_KEY_HERE
```

### Response Format

The response will be a JSON object with a `result` field containing the code analysis:

```json
{
  "result": "# Code Analysis for JavaScript Code\n\n## Architecture Diagram\n...\n\n## Core Functionality\n..."
}
```

### Example Usage

#### JavaScript (Browser)

```javascript
async function explainCode(code, language) {
  const response = await fetch('https://your-worker-url.workers.dev', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_SECRET_KEY_HERE',
    },
    body: JSON.stringify({
      method: "explainCode",
      params: [code, language]
    }),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  return data.result;
}

// Example usage
const jsCode = `function add(a, b) { return a + b; }`;
explainCode(jsCode, "javascript")
  .then(explanation => console.log(explanation))
  .catch(error => console.error('Error:', error));
```

#### Python (Requests)

```python
import requests
import json

def explain_code(code, language, api_url, secret_key):
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {secret_key}'
    }
    
    payload = {
        'method': 'explainCode',
        'params': [code, language]
    }
    
    response = requests.post(api_url, headers=headers, json=payload)
    response.raise_for_status()
    
    return response.json()['result']

# Example usage
code = "def hello(): print('Hello, world!')"
explanation = explain_code(code, "python", "https://your-worker-url.workers.dev", "YOUR_SECRET_KEY_HERE")
print(explanation)
```

#### Node.js (Axios)

```javascript
const axios = require('axios');

async function explainCode(code, language) {
  try {
    const response = await axios.post('https://your-worker-url.workers.dev', {
      method: 'explainCode',
      params: [code, language]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_SECRET_KEY_HERE'
      }
    });
    
    return response.data.result;
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Example usage
const codeToAnalyze = `
class Person {
  constructor(name) {
    this.name = name;
  }
  
  sayHello() {
    return \`Hello, my name is \${this.name}\`;
  }
}
`;

explainCode(codeToAnalyze, 'javascript')
  .then(explanation => console.log(explanation))
  .catch(err => console.error('Failed to explain code:', err));
```

## Local Development

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/BillDuke13/code-explainer-mcp.git
   cd code-explainer-mcp
   npm install
   ```

2. Run the development server:
   ```bash
   wrangler dev
   ```

3. Test the endpoint locally:
   ```bash
   curl -X POST http://localhost:8787 \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_SECRET_KEY_HERE" \
     -d '{"method":"explainCode","params":["function hello() { return \"Hello World\"; }","javascript"]}'
   ```

### Development Guidelines

- Follow TypeScript best practices
- Add comments for complex logic
- Update documentation for public API changes
- Add tests for new features

## Security

- The API is secured with Bearer token authentication
- Use environment secrets for storing the shared secret in production
- Do not commit your actual secret key to version control
- Rate limiting is recommended for production deployments

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
