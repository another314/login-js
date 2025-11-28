import puppeteer from 'puppeteer';
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
          '--window-size=1920,1080',
          '--blink-settings=imagesEnabled=false',
          '--disable-images',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-default-apps',
          '--disable-component-extensions-with-background-pages',
          '--disable-features=TranslateUI,BlinkGenPropertyTrees',
          '--disable-background-networking',
          '--disable-sync',
          '--metrics-recording-only',
          '--disable-default-browser-check',
          '--no-report-upload',
          '--disable-permissions-api',
          '--disable-web-security',
          '--no-first-run'
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

      // Add proxy server to launch args if enabled and specified
      if (proxy && proxy.enabled && proxy.host && proxy.port) {
        browserOptions.args.push(`--proxy-server=${proxy.protocol}://${proxy.host}:${proxy.port}`);
        console.log(`Proxy server configured: ${proxy.protocol}://${proxy.host}:${proxy.port}`);
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

      // Set viewport
      if (request.options?.viewport) {
        await page.setViewport(request.options.viewport);
      } else {
        await page.setViewport({ width: 1280, height: 720 });
      }

      // Authenticate proxy on the page if username and password are provided
      if (proxy && proxy.enabled && proxy.host && proxy.port && proxy.username && proxy.password) {
        try {
          await page.authenticate({
            username: proxy.username,
            password: proxy.password
          });
          console.log(`Proxy authenticated for user: ${proxy.username}`);
        } catch (proxyError) {
          console.warn(`Failed to authenticate proxy: ${proxyError instanceof Error ? proxyError.message : 'Unknown error'}`);
          // Continue without proxy authentication if it fails
        }
      } else if (proxy && proxy.enabled && proxy.host && proxy.port) {
        console.log(`Proxy enabled without authentication: ${proxy.host}:${proxy.port}`);
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

      page.on('response', async (response: any) => {
        const url = response.url();
        if (url.includes(apiPattern)) {
          const apiResponse = {
            url: url,
            method: response.request().method(),
            status: response.status(),
            headers: response.headers(),
            body: null,
            timestamp: new Date().toISOString()
          };

          // Try to capture response body
          try {
            const contentType = response.headers()['content-type'] || '';
            if (contentType.includes('application/json') ||
                contentType.includes('text/') ||
                !contentType) {

              const responseText = await response.text();
              if (responseText) {
                try {
                  apiResponse.body = JSON.parse(responseText);
                } catch {
                  apiResponse.body = responseText;
                }
              }
            }
          } catch (error) {
            console.warn(`Failed to capture response body for ${url}:`, error);
          }

          apiResponses.push(apiResponse);
        }
      });
    }

    for (const action of actions) {
      try {
        switch (action.type) {
          case 'navigate':
            if (action.url) {
              await page.goto(action.url, {
                waitUntil: 'domcontentloaded',
                timeout: Math.min(action.timeout || 10000, 10000)
              });
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
            await new Promise(resolve => setTimeout(resolve, Math.min(action.timeout || 300, 1000)));
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