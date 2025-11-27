// Example usage of the Login API Tester
// Run with: node examples/basic-usage.js

import fetch from 'node-fetch';

async function testZscanLogin() {
  console.log('Testing Zscan login...');

  try {
    const response = await fetch('http://localhost:3000/api/login/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpassword123',
        site: 'zscan',
        options: {
          headless: true,
          timeout: 30000,
          viewport: {
            width: 1920,
            height: 1080
          }
        }
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    console.log('Response headers:', response.headers);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));

            switch (data.type) {
              case 'status':
                console.log('📡 Status:', data.message);
                break;
              case 'progress':
                console.log('⚡ Progress:', data.result.success ? '✅' : '❌', data.result.message);
                break;
              case 'complete':
                console.log('🎉 Complete!');
                console.log('Execution time:', data.result.executionTime, 'ms');
                console.log('API responses captured:', data.result.apiResponses.length);
                if (data.result.screenshot) {
                  console.log('Screenshot captured (base64 length):', data.result.screenshot.length);
                }
                break;
              case 'error':
                console.error('❌ Error:', data.result.message);
                break;
            }
          } catch (e) {
            console.warn('Failed to parse SSE data:', line);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

async function testBeforeAfterLogin() {
  console.log('\nTesting login with before/after actions...');

  try {
    const response = await fetch('http://localhost:3000/api/login/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'test@example.com',
        password: 'testpassword123',
        targetUrl: 'https://example.com/login',
        site: 'generic',
        beforeLogin: [
          {
            type: 'navigate',
            url: 'https://example.com/login',
            selector: '',
            value: '',
            timeout: 5000
          },
          {
            type: 'wait',
            selector: '',
            value: '',
            timeout: 2000
          }
        ],
        afterLogin: [
          {
            type: 'wait',
            selector: '',
            value: '',
            timeout: 3000
          },
          {
            type: 'navigate',
            url: 'https://example.com/dashboard',
            selector: '',
            value: '',
            timeout: 5000
          }
        ],
        options: {
          headless: true,
          timeout: 30000
        }
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    console.log('Response headers:', response.headers);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));

            switch (data.type) {
              case 'status':
                console.log('📡 Status:', data.message);
                break;
              case 'progress':
                console.log('⚡ Progress:', data.result.success ? '✅' : '❌', data.result.message);
                break;
              case 'complete':
                console.log('🎉 Complete!');
                console.log('Site:', data.result.site);
                console.log('Execution time:', data.result.executionTime, 'ms');
                break;
              case 'error':
                console.error('❌ Error:', data.result.message);
                break;
            }
          } catch (e) {
            console.warn('Failed to parse SSE data:', line);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

async function testLoginWithoutProxy() {
  console.log('\nTesting login without proxy...');

  try {
    const response = await fetch('http://localhost:3000/api/login/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'testuser@example.com',
        password: 'testpassword123',
        targetUrl: 'https://example.com/login',
        proxy: {
          enabled: false
        },
        options: {
          headless: true,
          timeout: 30000
        }
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    console.log('Response headers:', response.headers);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));

            switch (data.type) {
              case 'status':
                console.log('📡 Status:', data.message);
                break;
              case 'progress':
                console.log('⚡ Progress:', data.result.success ? '✅' : '❌', data.result.message);
                break;
              case 'complete':
                console.log('🎉 Complete!');
                console.log('Execution time:', data.result.executionTime, 'ms');
                break;
              case 'error':
                console.error('❌ Error:', data.result.message);
                break;
            }
          } catch (e) {
            console.warn('Failed to parse SSE data:', line);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

async function testBatchLogin() {
  console.log('\nTesting batch login...');

  const credentials = [
    {
      username: 'user1@example.com',
      password: 'password1',
      proxy: { enabled: true, protocol: 'http', host: 'proxy1.example.com', port: 8080 }
    },
    {
      username: 'user2@example.com',
      password: 'password2',
      proxy: { enabled: false } // Disable proxy for this request
    },
    {
      username: 'user3@example.com',
      password: 'password3' // No proxy config, uses global setting
    }
  ];

  try {
    const response = await fetch('http://localhost:3000/api/login/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: credentials.map(cred => ({
          username: cred.username,
          password: cred.password,
          targetUrl: 'https://example.com/login',
          apiPattern: '/api/auth',
          options: {
            headless: true,
            timeout: 30000
          }
        })),
        maxConcurrent: 2
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let results = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));

            switch (data.type) {
              case 'status':
                console.log('📡 Status:', data.message);
                break;
              case 'progress':
                const result = data.result;
                console.log(`⚡ Request ${result.index + 1}:`, result.success ? '✅' : '❌',
                           result.message, `(${result.executionTime}ms)`);
                results.push(result);
                break;
              case 'complete':
                console.log('🎉 Batch Complete!');
                console.log('Summary:', {
                  total: data.result.totalRequests,
                  successful: data.result.successfulRequests,
                  failed: data.result.failedRequests,
                  averageTime: Math.round(data.result.averageExecutionTime) + 'ms'
                });
                return;
              case 'error':
                console.error('❌ Error:', data.result.message);
                return;
            }
          } catch (e) {
            console.warn('Failed to parse SSE data:', line);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Batch request failed:', error.message);
  }
}

async function getServiceStatus() {
  console.log('\nGetting service status...');

  try {
    const response = await fetch('http://localhost:3000/api/status');
    const status = await response.json();

    console.log('🏥 Service Status:', {
      activeSessions: status.activeSessions,
      status: status.status,
      timestamp: status.timestamp
    });
  } catch (error) {
    console.error('❌ Status check failed:', error.message);
  }
}

async function main() {
  console.log('🚀 Login API Tester Examples\n');

  // Check if service is running
  try {
    await getServiceStatus();
  } catch (error) {
    console.error('❌ Service is not running. Please start the server with: npm run dev');
    return;
  }

  // Run examples
  await testZscanLogin();
  await testBeforeAfterLogin();
  await testLoginWithoutProxy();
  await testBatchLogin();

  console.log('\n✨ Examples completed!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testZscanLogin, testBeforeAfterLogin, testLoginWithoutProxy, testBatchLogin, getServiceStatus };