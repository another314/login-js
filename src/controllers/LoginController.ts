import { Request, Response } from 'express';
import { z } from 'zod';
import { BrowserService } from '../services/BrowserService.js';
import { SiteFactory } from '../services/sites/index.js';
import { v4 as uuidv4 } from 'uuid';

const LoginRequestSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  targetUrl: z.string().url('Invalid target URL').optional(),
  site: z.string().optional(),
  beforeLogin: z.array(z.object({
    type: z.enum(['navigate', 'click', 'input', 'wait']),
    selector: z.string(),
    value: z.string(),
    timeout: z.number(),
    url: z.string()
  })).optional(),
  afterLogin: z.array(z.object({
    type: z.enum(['navigate', 'click', 'input', 'wait']),
    selector: z.string(),
    value: z.string(),
    timeout: z.number(),
    url: z.string()
  })).optional(),
  apiPattern: z.string().optional(),
  proxy: z.object({
    enabled: z.boolean().default(true),
    protocol: z.enum(['http', 'https', 'socks5']).default('http'),
    host: z.string().optional(),
    port: z.number().optional(),
    username: z.string().optional(),
    password: z.string().optional()
  }).optional(),
  options: z.object({
    headless: z.boolean().default(true),
    timeout: z.number().default(30000),
    userAgent: z.string().optional(),
    viewport: z.object({
      width: z.number().default(1920),
      height: z.number().default(1080)
    }).optional()
  }).optional()
});

export class LoginController {
  private browserService: BrowserService;

  constructor(proxyStrings: string[] = []) {
    this.browserService = new BrowserService(proxyStrings);
  }

  async testLogin(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const validatedData = LoginRequestSchema.parse(req.body);
      const { username, password, targetUrl, site, beforeLogin, afterLogin, apiPattern, proxy, options } = validatedData;

      console.log(`Initializing browser session...`);

      // Determine login strategy
      const siteStrategy = site ? SiteFactory.getSiteStrategy(site) : SiteFactory.getSiteStrategy('generic');

      console.log(`Using site strategy: ${siteStrategy.config.name}`);

      const loginRequest = {
        username,
        password,
        targetUrl,
        site,
        beforeLogin: beforeLogin || undefined,
        afterLogin: afterLogin || undefined,
        proxy: proxy || undefined,
        options: options || undefined
      };

      const session = await this.browserService.createSession(loginRequest);

      console.log(`Session created: ${session.id}`);

      // Generate actions using site strategy
      const generatedActions = siteStrategy.generateLoginActions(loginRequest);
      const apiPatterns = siteStrategy.getApiPatterns();

      console.log(`Executing login actions...`);

      const { apiResponses } = await this.browserService.executeActions(
        session,
        generatedActions,
        apiPattern || apiPatterns.length > 0 ? apiPatterns[0] : undefined
      );

      const executionTime = Date.now() - startTime;

      // Validate login result using site strategy
      const loginSuccess = siteStrategy.validateLoginResult(apiResponses);

      const result = {
        success: loginSuccess,
        sessionId: session.id,
        message: loginSuccess ? 'Login successful' : 'Login verification failed',
        site: siteStrategy.config.name,
        apiResponses,
        executionTime,
        timestamp: new Date().toISOString()
      };

      // Return single JSON response instead of streaming
      res.json(result);

      await this.browserService.closeSession(session.id);

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorResult = {
        success: false,
        sessionId: uuidv4(),
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        apiResponses: [],
        executionTime,
        timestamp: new Date().toISOString()
      };

      // Return single JSON error response
      res.status(500).json(errorResult);
    }
  }

  async testLoginBatch(req: Request, res: Response): Promise<void> {
    const BatchRequestSchema = z.object({
      requests: z.array(LoginRequestSchema).min(1, 'At least one request is required'),
      maxConcurrent: z.number().min(1).max(10).default(3)
    });

    try {
      const { requests } = BatchRequestSchema.parse(req.body);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      console.log(`data: ${JSON.stringify({ type: 'status', message: `Starting batch test with ${requests.length} requests...` })}\n\n`);

      const results: any[] = [];

      const executeRequest = async (requestData: any, index: number) => {
        const startTime = Date.now();

        try {
          console.log(`data: ${JSON.stringify({ type: 'status', message: `Processing request ${index + 1}/${requests.length}...` })}\n\n`);

          // Determine site strategy for this request
          const siteStrategy = requestData.site ?
            SiteFactory.getSiteStrategy(requestData.site) :
            SiteFactory.getSiteStrategy('generic');

          const session = await this.browserService.createSession(requestData);

          // Generate actions using site strategy
          const generatedActions = siteStrategy.generateLoginActions(requestData);
          const apiPatterns = siteStrategy.getApiPatterns();

          const { apiResponses } = await this.browserService.executeActions(
            session,
            generatedActions,
            requestData.apiPattern || (apiPatterns.length > 0 ? apiPatterns[0] : undefined)
          );

          const screenshot = await this.browserService.takeScreenshot(session);
          const executionTime = Date.now() - startTime;

          // Validate login result using site strategy
          const loginSuccess = siteStrategy.validateLoginResult(apiResponses);

          const result = {
            index,
            success: loginSuccess,
            sessionId: session.id,
            message: loginSuccess ? 'Login successful' : 'Login verification failed',
            site: siteStrategy.config.name,
            apiResponses,
            screenshot,
            executionTime,
            timestamp: new Date().toISOString()
          };

          results.push(result);

          console.log(`data: ${JSON.stringify({ type: 'progress', result })}\n\n`);

          await this.browserService.closeSession(session.id);

          return result;

        } catch (error) {
          const executionTime = Date.now() - startTime;
          const errorResult = {
            index,
            success: false,
            sessionId: uuidv4(),
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            apiResponses: [],
            executionTime,
            timestamp: new Date().toISOString()
          };

          results.push(errorResult);

          console.log(`data: ${JSON.stringify({ type: 'progress', result: errorResult })}\n\n`);

          return errorResult;
        }
      };

      const promises = requests.map((requestData, index) =>
        executeRequest(requestData, index)
      );

      await Promise.all(promises);

      const summary = {
        totalRequests: requests.length,
        successfulRequests: results.filter(r => r.success).length,
        failedRequests: results.filter(r => !r.success).length,
        averageExecutionTime: results.reduce((sum, r) => sum + r.executionTime, 0) / results.length,
        results
      };

      console.log(`data: ${JSON.stringify({ type: 'complete', result: summary })}\n\n`);
      res.end();

    } catch (error) {
      const errorResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      };

      console.log(`data: ${JSON.stringify({ type: 'error', result: errorResult })}\n\n`);
      res.end();
    }
  }

  async getStatus(_req: Request, res: Response): Promise<void> {
    try {
      const activeSessions = this.browserService.getActiveSessionCount();

      res.json({
        activeSessions,
        timestamp: new Date().toISOString(),
        status: 'healthy'
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      });
    }
  }

  async cleanup(): Promise<void> {
    await this.browserService.closeAllSessions();
  }
}