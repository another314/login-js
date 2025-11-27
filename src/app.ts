import express, { Express } from 'express';
import cors from 'cors';
import { LoginController } from './controllers/LoginController.js';
import { errorHandler, asyncHandler } from './middleware/errorHandler.js';
import { getProxies, validateEnvironment, getProxyEnabled } from './utils/config.js';
import { SiteFactory } from './services/sites/index.js';

export function createApp(): Express {
  validateEnvironment();

  const app = express();
  const proxyEnabled = getProxyEnabled();
  const proxies = proxyEnabled ? getProxies() : [];
  const loginController = new LoginController(proxies);

  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      proxyEnabled,
      proxyCount: proxies.length
    });
  });

  app.get('/api/status', asyncHandler(async (req, res) => {
    await loginController.getStatus(req, res);
  }));

  app.post('/api/login/test', asyncHandler(async (req, res) => {
    await loginController.testLogin(req, res);
  }));

  app.post('/api/login/batch', asyncHandler(async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    await loginController.testLoginBatch(req, res);
  }));

  app.get('/api/sites', (_req, res) => {
    res.json({
      supportedSites: SiteFactory.getSupportedSites(),
      message: 'Use the site parameter to specify login strategy for different websites'
    });
  });

  app.get('/api/openapi.json', async (_req, res) => {
    try {
      // Read and serve the OpenAPI specification
      const fs = await import('fs');
      const openApiSpec = JSON.parse(fs.readFileSync('docs/openapi.json', 'utf8'));
      res.json(openApiSpec);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to load OpenAPI specification',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/docs', (_req, res) => {
    res.json({
      title: 'Login API Tester',
      version: '1.0.0',
      openApiUrl: 'http://localhost:3000/api/openapi.json',
      importInstructions: {
        postman: 'Import the OpenAPI spec in Postman using File > Import > Link and paste the OpenAPI URL',
        insomnia: 'Import using the OpenAPI URL in Insomnia import dialog',
        swagger: 'View interactive API documentation at /api/openapi.json',
        collection: 'Full API collection with examples and schemas'
      },
      endpoints: {
        'GET /health': 'Health check endpoint',
        'GET /api/status': 'Get service status and active sessions',
        'GET /api/sites': 'Get supported login sites and strategies',
        'POST /api/login/test': 'Test single login with browser automation',
        'POST /api/login/batch': 'Test multiple logins concurrently',
        'GET /api/docs': 'API documentation'
      },
      usage: {
        singleLogin: {
          method: 'POST',
          url: '/api/login/test',
          body: {
            username: 'string',
            password: 'string',
            targetUrl: 'string (optional if site is specified)',
            site: 'string (optional - generic, zscan)',
            beforeLogin: [
              {
                type: 'navigate',
                url: 'string'
              },
              {
                type: 'wait',
                timeout: 3000
              }
            ],
            afterLogin: [
              {
                type: 'navigate',
                url: 'string'
              },
              {
                type: 'input',
                selector: 'string',
                value: 'string'
              },
              {
                type: 'click',
                selector: 'string'
              }
            ],
            apiPattern: 'string (optional)',
            proxy: {
              protocol: 'http|https|socks5',
              host: 'string',
              port: 'number',
              username: 'string (optional)',
              password: 'string (optional)'
            },
            options: {
              headless: 'boolean',
              timeout: 'number',
              userAgent: 'string',
              viewport: {
                width: 'number',
                height: 'number'
              }
            }
          }
        },
        batchLogin: {
          method: 'POST',
          url: '/api/login/batch',
          body: {
            requests: [
              {
                username: 'string',
                password: 'string',
                targetUrl: 'string',
                actions: 'Array',
                apiPattern: 'string (optional)',
                proxy: 'Object (optional)',
                options: 'Object (optional)'
              }
            ],
            maxConcurrent: 'number (1-10)'
          }
        }
      }
    });
  });

  app.use(errorHandler);

  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, cleaning up...');
    await loginController.cleanup();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, cleaning up...');
    await loginController.cleanup();
    process.exit(0);
  });

  return app;
}