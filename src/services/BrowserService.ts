import puppeteer from 'puppeteer';
import useProxy from 'puppeteer-page-proxy';
import type { ProxyConfig, BrowserSession, LoginRequest, ElementAction, ApiResponse } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export class BrowserService {
  private activeSessions = new Map<string, BrowserSession>();
  private availableProxies: ProxyConfig[] = [];
  private proxyIndex = 0;

  constructor(proxies: string[] = []) {
    this.initializeProxies(proxies);
  }

  private initializeProxies(proxyStrings: string[]): void {
    this.availableProxies = proxyStrings.map(proxyString => {
      const parts = proxyString.split(':');
      if (parts.length >= 2 && parts[0]) {
        return {
          enabled: true,
          protocol: 'http' as const,
          host: parts[0],
          port: parseInt(parts[1] || '80', 10),
          ...(parts[2] && { username: parts[2] }),
          ...(parts[3] && { password: parts[3] })
        };
      }
      throw new Error(`Invalid proxy format: ${proxyString}`);
    });
  }

  private getNextProxy(): ProxyConfig | undefined {
    if (this.availableProxies.length === 0) return undefined;

    const proxy = this.availableProxies[this.proxyIndex];
    this.proxyIndex = (this.proxyIndex + 1) % this.availableProxies.length;
    return proxy;
  }

  async createSession(request: LoginRequest): Promise<BrowserSession> {
    const sessionId = uuidv4();
    const proxy = request.proxy || this.getNextProxy();

    try {
      const headlessOption = request.options?.headless;
      let headlessMode: boolean | "new" | "old";

      if (typeof headlessOption === 'string') {
        headlessMode = headlessOption as 'new' | 'old';
      } else if (headlessOption === false) {
        headlessMode = false;
      } else {
        // Default to new headless mode
        headlessMode = "new";
      }

      let browserOptions: any = {
        headless: headlessMode,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080'
        ]
      };

      // Add Chrome path from environment variable if specified
      const chromePath = process.env['CHROME_PATH'] || process.env['CHROME_EXECUTABLE_PATH'];
      if (chromePath) {
        browserOptions.executablePath = chromePath;
      }

      if (request.options?.userAgent) {
        browserOptions.args.push(`--user-agent=${request.options.userAgent}`);
      }

      const browser = await puppeteer.launch(browserOptions);
      const page = await browser.newPage();

      if (request.options?.viewport) {
        await page.setViewport(request.options.viewport);
      } else {
        await page.setViewport({ width: 1920, height: 1080 });
      }

      // Apply proxy using puppeteer-page-proxy if enabled and specified
      if (proxy && proxy.enabled && proxy.host && proxy.port) {
        const proxyUrl = `${proxy.protocol}://`;
        const authString = (proxy.username && proxy.password)
          ? `${proxy.username}:${proxy.password}@`
          : '';
        const proxyString = `${proxyUrl}${authString}${proxy.host}:${proxy.port}`;

        try {
          await useProxy(page, proxyString);
          console.log(`Proxy enabled: ${proxy.host}:${proxy.port}`);
        } catch (proxyError) {
          console.warn(`Failed to apply proxy: ${proxyError instanceof Error ? proxyError.message : 'Unknown error'}`);
          // Continue without proxy if it fails
        }
      } else {
        console.log(`Proxy disabled or not configured. Running without proxy.`);
      }

      const session: BrowserSession = {
        id: sessionId,
        proxy,
        page,
        browser,
        isActive: true,
        createdAt: new Date()
      };

      this.activeSessions.set(sessionId, session);
      return session;

    } catch (error) {
      throw new Error(`Failed to create browser session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async executeActions(session: BrowserSession, actions: ElementAction[], apiPattern?: string): Promise<{ apiResponses: ApiResponse[] }> {
    const { page } = session;
    const apiResponses: ApiResponse[] = [];

    if (!page) {
      throw new Error('Browser page not initialized');
    }

    if (apiPattern) {
      await page.setRequestInterception(true);

      page.on('request', (request: any) => {
        const url = request.url();
        if (url.includes(apiPattern)) {
          request.continue();
        } else {
          request.continue();
        }
      });

      page.on('response', (response: any) => {
        const url = response.url();
        if (url.includes(apiPattern)) {
          apiResponses.push({
            url: url,
            method: response.request().method(),
            status: response.status(),
            headers: response.headers(),
            body: null,
            timestamp: new Date().toISOString()
          });
        }
      });
    }

    for (const action of actions) {
      try {
        switch (action.type) {
          case 'navigate':
            if (action.url) {
              await page.goto(action.url, { waitUntil: 'networkidle2', timeout: action.timeout || 30000 });
            }
            break;

          case 'click':
            if (action.selector) {
              await page.waitForSelector(action.selector, { timeout: action.timeout || 10000 });
              await page.click(action.selector);
            }
            break;

          case 'input':
            if (action.selector && action.value) {
              await page.waitForSelector(action.selector, { timeout: action.timeout || 10000 });
              await page.type(action.selector, action.value);
            }
            break;

          case 'wait':
            await new Promise(resolve => setTimeout(resolve, action.timeout || 1000));
            break;
        }
      } catch (error) {
        throw new Error(`Failed to execute action ${action.type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }


    return { apiResponses };
  }

  async takeScreenshot(session: BrowserSession): Promise<string> {
    if (!session.page) {
      throw new Error('Browser page not initialized');
    }

    try {
      const screenshot = await session.page.screenshot({ encoding: 'base64', fullPage: true });
      return screenshot as string;
    } catch (error) {
      throw new Error(`Failed to take screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      try {
        if (session.page) {
          await session.page.close();
        }
        if (session.browser) {
          await session.browser.close();
        }
      } catch (error) {
        console.warn(`Error closing session ${sessionId}:`, error);
      }

      session.isActive = false;
      this.activeSessions.delete(sessionId);
    }
  }

  async closeAllSessions(): Promise<void> {
    const closePromises = Array.from(this.activeSessions.keys()).map(sessionId =>
      this.closeSession(sessionId).catch(error =>
        console.warn(`Error closing session ${sessionId}:`, error)
      )
    );

    await Promise.allSettled(closePromises);
  }

  getActiveSessionCount(): number {
    return Array.from(this.activeSessions.values()).filter(session => session.isActive).length;
  }

  getSession(sessionId: string): BrowserSession | undefined {
    return this.activeSessions.get(sessionId);
  }
}