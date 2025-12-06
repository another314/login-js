import { Request, Response } from "express";
import { z } from "zod";
import { BrowserService } from "../services/BrowserService.js";
import { SiteFactory } from "../services/sites/index.js";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger.js";
import { ApiPatternEnum, ApiResponse } from "../types/index.js";

const LoginRequestSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  targetUrl: z.string().url("Invalid target URL").optional(),
  site: z.string().optional(),
  beforeLogin: z
    .array(
      z.object({
        type: z.enum(["navigate", "click", "input", "wait"]),
        selector: z.string(),
        value: z.string(),
        timeout: z.number(),
        url: z.string(),
      })
    )
    .optional(),
  afterLogin: z
    .array(
      z.object({
        type: z.enum(["navigate", "click", "input", "wait"]),
        selector: z.string(),
        value: z.string(),
        timeout: z.number(),
        url: z.string(),
      })
    )
    .optional(),
  apiPattern: z.string().optional(),
  proxy: z
    .object({
      enabled: z.boolean().default(true),
      protocol: z.enum(["http", "https", "socks5"]).default("http"),
      host: z.string().optional(),
      port: z.number().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
    })
    .optional(),
  options: z
    .object({
      headless: z.boolean().default(true),
      timeout: z.number().default(30000),
      userAgent: z.string().optional(),
      viewport: z
        .object({
          width: z.number().default(1920),
          height: z.number().default(1080),
        })
        .optional(),
    })
    .optional(),
});

export class LoginController {
  private browserService: BrowserService;

  constructor(proxyStrings: string[] = []) {
    this.browserService = new BrowserService(proxyStrings);
  }

  async autoLogin(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    let session = null;
    try {
      const validatedData = LoginRequestSchema.parse(req.body);
      const {
        username,
        password,
        targetUrl,
        site,
        beforeLogin,
        afterLogin,
        proxy,
        options,
      } = validatedData;

      // Log login attempt
      logger.logLoginAttempt(username, password, site);

      // Determine login strategy
      const siteStrategy = site
        ? SiteFactory.getSiteStrategy(site)
        : SiteFactory.getSiteStrategy("generic");

      logger.debug(`Using site strategy: ${siteStrategy.config.name}`);

      const loginRequest = {
        username,
        password,
        targetUrl,
        site,
        beforeLogin: beforeLogin || undefined,
        afterLogin: afterLogin || undefined,
        proxy: proxy || undefined,
        options: options || undefined,
      };

      session = await this.browserService.createSession(loginRequest);

      // Log browser session creation
      logger.logBrowserSession(
        session.id,
        proxy ? `${proxy.host}:${proxy.port}` : undefined
      );

      // Generate actions using site strategy
      const generatedActions = siteStrategy.generateLoginActions(loginRequest);
      const apiPatterns = siteStrategy.getApiPatterns();

      const apiResponses: ApiResponse[] = [];
      const requestUrls: ApiPatternEnum[] = [];

      logger.info(`Executing ${generatedActions.length} login actions...`);
      await this.browserService.executeActions(
        session,
        generatedActions,
        apiPatterns,
        requestUrls,
        apiResponses
      );


      // Validate login result using site strategy
      const loginSuccess = siteStrategy.validateLoginResult(apiResponses);
      const executionTime = Date.now() - startTime;

      const result = {
        success: loginSuccess,
        sessionId: session.id,
        message: loginSuccess
          ? "Login successful"
          : "Login verification failed",
        site: siteStrategy.config.name,
        apiResponses,
        executionTime,
        timestamp: new Date().toISOString(),
      };

      // Log result
      if (loginSuccess) {
        logger.logLoginSuccess(
          username,
          siteStrategy.config.name,
          session.id,
          apiResponses,
          executionTime
        );
      } else {
        logger.logLoginFailure(
          username,
          siteStrategy.config.name,
          "Login verification failed",
          executionTime
        );
      }

      // Return single JSON response with appropriate status code
      const statusCode = loginSuccess ? 200 : 400;
      res.status(statusCode).json(result);

      await this.browserService.closeSession(session.id);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      const username = req.body?.username || "unknown";
      const site = req.body?.site || "unknown";

      // Log error
      logger.error(`Login test failed for ${username}`, {
        error: errorMessage,
        executionTime,
        site,
        stack: error instanceof Error ? error.stack : undefined,
      });

      const errorResult = {
        success: false,
        sessionId: uuidv4(),
        message: errorMessage,
        apiResponses: [],
        executionTime,
        timestamp: new Date().toISOString(),
      };

      // Return single JSON error response
      res.status(500).json(errorResult);
      if (session) {
        await this.browserService.closeSession(session.id);
      }
    }
  }

  async getStatus(_req: Request, res: Response): Promise<void> {
    try {
      const activeSessions = this.browserService.getActiveSessionCount();

      res.json({
        activeSessions,
        timestamp: new Date().toISOString(),
        status: "healthy",
      });
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
      });
    }
  }

  async cleanup(): Promise<void> {
    await this.browserService.closeAllSessions();
  }
}
