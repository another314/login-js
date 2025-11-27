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

  private getRandomUserAgent(): string {
    const userAgentList: Array<string> = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/120.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/120.0',
      'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/120.0'
    ] as const;

    const randomIndex = Math.floor(Math.random() * userAgentList.length);
    const selectedAgent = userAgentList[randomIndex];

    return selectedAgent as string;
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

      // Create unique user data directory for each session to avoid rate limiting
      if (request.options?.isolateProfile !== false) {
        const userDataDir = `/tmp/chrome-profile-${sessionId}`;
        browserOptions.args.push(`--user-data-dir=${userDataDir}`);
      }

      // Add random user agent to further avoid detection
      let selectedUserAgent: string | undefined;

      if (request.options?.userAgent) {
        selectedUserAgent = request.options.userAgent;
      } else if (request.options?.randomUserAgent !== false) {
        selectedUserAgent = this.getRandomUserAgent();
      }

      if (selectedUserAgent) {
        browserOptions.args.push(`--user-agent=${selectedUserAgent}`);
      }

      const browser = await puppeteer.launch(browserOptions);
      const page = await browser.newPage();

      // if (request.options?.viewport) {
      //   await page.setViewport(request.options.viewport);
      // } else {
      //   await page.setViewport({ width: 1920, height: 1080 });
      // }

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

    // Wait for API responses to be captured before returning
    if (apiPattern && apiResponses.length === 0) {
      // If we're expecting API responses but haven't captured any yet, wait a bit longer
      console.log('Waiting for API responses...');

      let waitCount = 0;
      const maxWaitTime = 15000; // 15 seconds max wait
      const checkInterval = 1000; // Check every 1 second

      while (apiResponses.length === 0 && waitCount < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waitCount += checkInterval;

        if (waitCount % 3000 === 0) { // Log every 3 seconds
          console.log(`Still waiting for API responses... (${waitCount/1000}s elapsed)`);
        }
      }

      if (apiResponses.length === 0) {
        console.warn('No API responses captured after waiting period');
      } else {
        console.log(`API responses captured: ${apiResponses.length}`);
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

      // Clean up user data directory
      try {
        const fs = await import('fs/promises');
        const userDataDir = `/tmp/chrome-profile-${sessionId}`;
        await fs.rm(userDataDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn(`Failed to cleanup user data directory for session ${sessionId}:`, cleanupError);
      }
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