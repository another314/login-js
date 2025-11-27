# Login API Tester

A Node.js application for automated login testing with browser automation, proxy support, and API response interception.

## Features

- 🔐 **Automated Login Testing**: Test login flows with customizable actions
- 🌐 **Multi-Proxy Support**: Rotate through multiple proxies using puppeteer-page-proxy for concurrent testing
- 🌍 **Site-Specific Strategies**: Built-in login strategies for popular websites (Zscan, Generic, etc.)
- 📡 **API Response Interception**: Capture and analyze API responses during login
- 🎯 **Element Interaction**: Click elements and fill input forms with CSS selectors
- ⚡ **Concurrent Processing**: Handle multiple login tests simultaneously
- 📸 **Screenshot Capture**: Take screenshots of test results
- 🚀 **Real-time Updates**: Server-Sent Events (SSE) for live progress updates
- 📋 **Postman Integration**: OpenAPI specification for easy import into API testing tools

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd login-zscan

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration
```

## Configuration

Edit `.env` file with your settings:

```env
NODE_ENV=development
PORT=3000
MAX_CONCURRENT_REQUESTS=5
REQUEST_TIMEOUT=30000
BROWSER_TIMEOUT=60000

# Proxy configuration
PROXY_ENABLED=true
# Proxy configuration (format: host:port:username:password)
PROXIES=http://proxy1.example.com:8080:user1:pass1,http://proxy2.example.com:8080:user2:pass2

# Browser settings
HEADLESS=true
USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
```

### Proxy Configuration Options

- **Global Proxy Control**: Set `PROXY_ENABLED=false` to disable all proxy usage
- **Per-Request Proxy Control**: Enable/disable proxy for individual requests
- **Proxy Rotation**: Automatic rotation through multiple proxy servers

## Quick Start

### Import to Postman (Recommended)

1. **Start the server**:
```bash
npm run dev
```

2. **Import to Postman**:
- Open Postman
- Click **Import** → **Link**
- Paste: `http://localhost:3000/api/openapi.json`
- Click **Import**

3. **Test the API**:
- Use the imported collection
- All endpoints have examples pre-configured
- Environment variables are included

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### API Endpoints

#### Single Login Test

```bash
curl -X POST http://localhost:3000/api/login/test \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass",
    "targetUrl": "https://example.com/login",
    "apiPattern": "/api/auth",
    "actions": [
      {
        "type": "navigate",
        "url": "https://example.com/login"
      },
      {
        "type": "input",
        "selector": "input[name=\"username\"]",
        "value": "testuser"
      },
      {
        "type": "input",
        "selector": "input[name=\"password\"]",
        "value": "testpass"
      },
      {
        "type": "click",
        "selector": "button[type=\"submit\"]"
      },
      {
        "type": "wait",
        "timeout": 3000
      }
    ],
    "options": {
      "headless": true,
      "timeout": 30000
    }
  }'
```

#### Batch Login Test

```bash
curl -X POST http://localhost:3000/api/login/batch \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      {
        "username": "user1",
        "password": "pass1",
        "targetUrl": "https://example.com/login"
      },
      {
        "username": "user2",
        "password": "pass2",
        "targetUrl": "https://example.com/login"
      }
    ],
    "maxConcurrent": 3
  }'
```

#### Site-Specific Login

```bash
# Facebook login
curl -X POST http://localhost:3000/api/login/test \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test@example.com",
    "password": "password123",
    "site": "facebook"
  }'

# Google login
curl -X POST http://localhost:3000/api/login/test \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test@gmail.com",
    "password": "password123",
    "site": "google"
  }'

# Zscan site login
curl -X POST http://localhost:3000/api/login/test \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass",
    "site": "zscan"
  }'

# Custom site with before/after login actions
curl -X POST http://localhost:3000/api/login/test \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass",
    "targetUrl": "https://example.com/login",
    "site": "generic",
    "beforeLogin": [
      {
        "type": "navigate",
        "url": "https://example.com/login",
        "selector": "",
        "value": "",
        "timeout": 5000
      },
      {
        "type": "wait",
        "selector": "",
        "value": "",
        "timeout": 2000
      }
    ],
    "afterLogin": [
      {
        "type": "wait",
        "selector": "",
        "value": "",
        "timeout": 3000
      },
      {
        "type": "navigate",
        "url": "https://example.com/dashboard",
        "selector": "",
        "value": "",
        "timeout": 5000
      }
    ]
  }'
```

#### Get Supported Sites

```bash
curl http://localhost:3000/api/sites
```

#### Service Status

```bash
curl http://localhost:3000/api/status
```

#### Health Check

```bash
curl http://localhost:3000/health
```

#### API Documentation

```bash
curl http://localhost:3000/api/docs
```

#### OpenAPI Specification (Postman Import)

```bash
curl http://localhost:3000/api/openapi.json
```

## Postman Integration

### Import Collection

1. **Open Postman**
2. **Click "Import"** → **"Link"**
3. **Paste the URL**: `http://localhost:3000/api/openapi.json`
4. **Click "Continue"** and **"Import"**

### Available Endpoints in Postman

After importing, you'll get a complete collection with:

- **Health Check** - `/health`
- **Service Status** - `/api/status`
- **Supported Sites** - `/api/sites`
- **Single Login Test** - `/api/login/test`
- **Batch Login Test** - `/api/login/batch`

### Example Collections

#### Basic Login Test
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/login/test`
- **Headers**: `Content-Type: application/json`
- **Body** (raw JSON):
```json
{
  "username": "test@example.com",
  "password": "password123",
  "site": "generic"
}
```

#### Zscan Login Test
```json
{
  "username": "testuser",
  "password": "testpassword123",
  "site": "zscan"
}
```

#### Login with Before/After Actions
```json
{
  "username": "test@example.com",
  "password": "password123",
  "targetUrl": "https://example.com/login",
  "site": "generic",
  "beforeLogin": [
    {
      "type": "navigate",
      "url": "https://example.com/login",
      "selector": "",
      "value": "",
      "timeout": 5000
    }
  ],
  "afterLogin": [
    {
      "type": "wait",
      "selector": "",
      "value": "",
      "timeout": 3000
    }
  ]
}
```

#### Login with Proxy
```json
{
  "username": "test@example.com",
  "password": "password123",
  "site": "generic",
  "proxy": {
    "enabled": true,
    "protocol": "http",
    "host": "proxy.example.com",
    "port": 8080,
    "username": "proxyuser",
    "password": "proxypass"
  }
}
```

### Environment Variables

Set up environment variables in Postman for easier testing:

```json
{
  "baseUrl": "http://localhost:3000",
  "testUsername": "test@example.com",
  "testPassword": "password123",
  "proxyHost": "proxy.example.com",
  "proxyPort": "8080"
}
```

Use variables in requests:
```json
{
  "username": "{{testUsername}}",
  "password": "{{testPassword}}",
  "proxy": {
    "host": "{{proxyHost}}",
    "port": "{{proxyPort}}"
  }
}
```

### Response Handling

The login endpoints return **Server-Sent Events (SSE)**. In Postman:

1. **Send the request**
2. **Look for "Stream" response** in the response body
3. **Parse the SSE data** to get real-time updates

SSE Response Format:
```
data: {"type":"status","message":"Initializing browser session..."}

data: {"type":"complete","result":{"success":true,"sessionId":"uuid-1234"}}
```

### Test Scripts

Add test scripts to your requests for validation:

```javascript
// Postman Test Script
pm.test("Login successful", function() {
    const responseText = pm.response.text();

    // Check for successful completion
    const successPattern = /"success":true/g;
    const hasSuccess = successPattern.test(responseText);

    if (hasSuccess) {
        pm.test("✅ Login test completed successfully", function() {
            pm.expect(true).to.be.true;
        });
    }
});

// Extract session ID for reuse
const sessionMatch = pm.response.text().match(/"sessionId":"([^"]+)"/);
if (sessionMatch) {
    pm.environment.set("sessionId", sessionMatch[1]);
}
```

## Action Types

The system supports various action types for browser automation:

### Navigate
```json
{
  "type": "navigate",
  "url": "https://example.com/login",
  "timeout": 30000
}
```

### Input
```json
{
  "type": "input",
  "selector": "input[name=\"username\"]",
  "value": "testuser",
  "timeout": 10000
}
```

### Click
```json
{
  "type": "click",
  "selector": "button[type=\"submit\"]",
  "timeout": 10000
}
```

### Wait
```json
{
  "type": "wait",
  "timeout": 3000
}
```

## Proxy Configuration

### Global Proxy Control

Enable/disable all proxy usage via environment variables:

```env
# Enable proxy usage (default)
PROXY_ENABLED=true
PROXIES=http://proxy1.example.com:8080:user1:pass1,http://proxy2.example.com:8080:user2:pass2

# Disable all proxy usage
PROXY_ENABLED=false
```

### Per-Request Proxy Control

Control proxy usage for individual requests:

#### Enable Proxy for Specific Request
```json
{
  "username": "testuser@example.com",
  "password": "testpass123",
  "targetUrl": "https://example.com/login",
  "proxy": {
    "enabled": true,
    "protocol": "http",
    "host": "proxy.example.com",
    "port": 8080,
    "username": "user",
    "password": "pass"
  }
}
```

#### Disable Proxy for Specific Request
```json
{
  "username": "testuser@example.com",
  "password": "testpass123",
  "targetUrl": "https://example.com/login",
  "proxy": {
    "enabled": false
  }
}
```

#### Run Without Proxy (No Proxy Config)
```json
{
  "username": "testuser@example.com",
  "password": "testpass123",
  "targetUrl": "https://example.com/login"
}
```

## Before/After Login Actions

### Action Sequence Structure

The login process is now divided into three distinct phases:

#### 1. **Before Login Actions**
Actions executed before the login form interaction:
- Navigate to login page
- Handle CAPTCHAs or security checks
- Wait for page elements to load
- Accept cookies or privacy policies

#### 2. **Login Actions** (Automatically generated)
Site-specific login actions based on the selected strategy:
- Fill username field
- Fill password field
- Submit login form
- Handle multi-factor authentication

#### 3. **After Login Actions**
Actions executed after successful login:
- Navigate to specific pages
- Handle post-login redirects
- Capture screenshots or data
- Log out or cleanup

### Using Before/After Actions

#### Basic Before/After Actions
```json
{
  "username": "test@example.com",
  "password": "password123",
  "site": "generic",
  "beforeLogin": [
    {
      "type": "navigate",
      "url": "https://example.com/login",
      "selector": "",
      "value": "",
      "timeout": 5000
    },
    {
      "type": "click",
      "selector": ".accept-cookies",
      "value": "",
      "timeout": 2000
    }
  ],
  "afterLogin": [
    {
      "type": "wait",
      "selector": "",
      "value": "",
      "timeout": 3000
    },
    {
      "type": "navigate",
      "url": "https://example.com/dashboard",
      "selector": "",
      "value": "",
      "timeout": 5000
    }
  ]
}
```

#### Handling CAPTCHA with Before Actions
```json
{
  "username": "test@example.com",
  "password": "password123",
  "site": "generic",
  "beforeLogin": [
    {
      "type": "navigate",
      "url": "https://example.com/login",
      "selector": "",
      "value": "",
      "timeout": 5000
    },
    {
      "type": "wait",
      "selector": ".captcha-container",
      "value": "",
      "timeout": 10000
    }
  ],
  "afterLogin": [
    {
      "type": "wait",
      "selector": ".dashboard-welcome",
      "value": "",
      "timeout": 5000
    }
  ]
}
```

### Action Types

All actions require the following structure:
```json
{
  "type": "navigate|click|input|wait",
  "selector": "CSS selector (required for click/input)",
  "value": "text value (required for input)",
  "timeout": "timeout in milliseconds",
  "url": "target URL (required for navigate)"
}
```

#### Navigate
```json
{
  "type": "navigate",
  "url": "https://example.com/login",
  "selector": "",
  "value": "",
  "timeout": 5000
}
```

#### Click
```json
{
  "type": "click",
  "selector": "button[type='submit']",
  "value": "",
  "timeout": 3000
}
```

#### Input
```json
{
  "type": "input",
  "selector": "input[name='search']",
  "value": "search term",
  "timeout": 2000
}
```

#### Wait
```json
{
  "type": "wait",
  "selector": "",
  "value": "",
  "timeout": 3000
}
```

## Site Login Strategies

### Supported Sites

The application includes built-in login strategies for popular websites:

#### Zscan (`site: "zscan"`)
- **Login URL**: `https://zscans.com/`
- **Username Selector**: `.v-text-field__slot>input[type=text]`
- **Password Selector**: `.v-text-field__slot>input[type=password]`
- **Submit Selector**: `[type=submit]`
- **Before Actions**: 2-second wait for page load
- **After Actions**: 3-second wait after login
- **Success Indicators**: `two_factor`

#### Generic (`site: "generic"`)
- Universal login strategy that works with most websites
- **Username Selectors**: Multiple common username/email input selectors
- **Password Selectors**: Multiple common password input selectors
- **Submit Selectors**: Multiple common submit button selectors
- **Success Indicators**: `success`, `authenticated`, `dashboard`, `welcome`, `logout`

### Creating Custom Site Strategies

You can create custom login strategies by extending the `BaseSiteLoginStrategy` class:

```typescript
import { BaseSiteLoginStrategy } from '../services/sites/BaseSiteLoginStrategy.js';

export class CustomSiteStrategy extends BaseSiteLoginStrategy {
  readonly config = {
    name: 'Custom Site',
    loginUrl: 'https://custom-site.com/login',
    selectors: {
      username: ['input[name="email"]', '#email'],
      password: ['input[name="password"]', '#pass'],
      submit: ['button[type="submit"]', '.login-btn']
    },
    apiPatterns: ['/api/login', '/auth'],
    waitAfterLogin: 3000,
    successIndicators: ['dashboard', 'welcome', 'authenticated']
  };
}

// Register the custom strategy
SiteFactory.registerSite('custom-site', () => new CustomSiteStrategy());
```

### Site Strategy Features

- **Smart Element Detection**: Tries multiple selectors for username, password, and submit fields
- **API Pattern Matching**: Automatically captures relevant API responses
- **Login Validation**: Validates successful login based on response patterns
- **Custom Actions**: Supports site-specific additional actions
- **Flexible Configuration**: Easy to extend and customize for new sites

## Response Format

### Server-Sent Events (SSE)

The API uses Server-Sent Events for real-time updates:

```json
{
  "type": "status|progress|complete|error",
  "message": "Status message",
  "result": {
    "success": true,
    "sessionId": "uuid",
    "message": "Test completed",
    "apiResponses": [
      {
        "url": "https://example.com/api/auth",
        "method": "POST",
        "status": 200,
        "headers": {},
        "body": {},
        "timestamp": "2024-01-01T00:00:00.000Z"
      }
    ],
    "screenshot": "base64-encoded-image",
    "executionTime": 5000
  }
}
```

### Batch Test Summary

```json
{
  "totalRequests": 10,
  "successfulRequests": 8,
  "failedRequests": 2,
  "averageExecutionTime": 4500,
  "results": [...]
}
```

## Default Selectors

If no custom actions are provided, the system uses default selectors:

- Username: `input[name="username"], input[type="email"], input[name="user"], #username, .username`
- Password: `input[name="password"], input[type="password"], #password, .password`
- Submit: `button[type="submit"], input[type="submit"], .login-btn, #login`

## Error Handling

The application includes comprehensive error handling:

- **Validation Errors**: Invalid request parameters
- **Browser Errors**: Puppeteer failures
- **Network Errors**: Connection issues
- **Timeout Errors**: Action timeouts
- **Proxy Errors**: Proxy authentication failures

## Examples

### JavaScript Client

```javascript
async function testLogin() {
  const response = await fetch('http://localhost:3000/api/login/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: 'testuser',
      password: 'testpass',
      targetUrl: 'https://example.com/login',
      apiPattern: '/api/auth'
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.substring(6));
        console.log('Received:', data);
      }
    }
  }
}

testLogin();
```

### Python Client

```python
import requests
import json
import sseclient

def test_login():
    response = requests.post(
        'http://localhost:3000/api/login/test',
        json={
            'username': 'testuser',
            'password': 'testpass',
            'targetUrl': 'https://example.com/login',
            'apiPattern': '/api/auth'
        },
        stream=True
    )

    client = sseclient.SSEClient(response)
    for event in client.events():
        data = json.loads(event.data)
        print(f"Event type: {data['type']}")
        print(f"Data: {data}")

if __name__ == '__main__':
    test_login()
```

## Performance Considerations

- **Concurrent Requests**: Limited by `MAX_CONCURRENT_REQUESTS` environment variable
- **Browser Resources**: Each session creates a new browser instance
- **Memory Usage**: Monitor memory when running many concurrent tests
- **Proxy Pool**: Ensure sufficient proxies for concurrent operations

## Security Notes

- Store proxy credentials securely in environment variables
- Use HTTPS for API endpoints when possible
- Validate all user inputs and selectors
- Implement rate limiting for production use
- Regularly update Puppeteer and dependencies

## Troubleshooting

### Common Issues

1. **Puppeteer Installation**
   ```bash
   npm install puppeteer
   # Or install Chromium manually
   PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install
   ```

2. **Proxy Authentication**
   - Verify proxy credentials format
   - Test proxy connectivity separately
   - Check proxy server logs

3. **Selector Issues**
   - Test selectors in browser DevTools
   - Use more specific selectors
   - Handle dynamic content with waits

4. **Memory Leaks**
   - Monitor session cleanup
   - Ensure proper browser closure
   - Limit concurrent operations

## License

MIT License - see LICENSE file for details.