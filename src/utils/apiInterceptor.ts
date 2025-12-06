import { Page } from "puppeteer";
import { ApiResponse } from "../types/index.js";

export interface ApiInterceptionOptions {
  apiPattern: string;
  onResponse?: (response: ApiResponse) => void;
  waitForRequests?: boolean;
  requestTimeout?: number;
}

export class ApiInterceptor {
  private apiResponses: ApiResponse[] = [];
  private page: Page;
  private options: ApiInterceptionOptions;
  private activeRequests: Set<string> = new Set();
  private pendingResponses: Promise<void>[] = [];

  constructor(page: Page, options: ApiInterceptionOptions) {
    this.page = page;
    this.options = options;
  }

  async setupInterception(): Promise<void> {
    await this.page.setRequestInterception(true);

    this.page.on("request", (request: any) => {
      const url = request.url();
      if (url.includes(this.options.apiPattern)) {
        const requestId = `${url}_${Date.now()}_${Math.random()}`;
        this.activeRequests.add(requestId);
      }
      request.continue();
    });

    this.page.on("response", async (response: any) => {
      const url = response.url();
      if (url.includes(this.options.apiPattern)) {
        const responsePromise = this.handleResponse(response);
        if (this.options.waitForRequests) {
          this.pendingResponses.push(responsePromise);
        }
      }
    });
  }

  private async handleResponse(response: any): Promise<void> {
    const url = response.url();

    try {
      const apiResponse = await this.createApiResponse(response);
      this.apiResponses.push(apiResponse);

      if (this.options.onResponse) {
        this.options.onResponse(apiResponse);
      }
    } catch (error) {
      console.warn(`Failed to handle response for ${url}:`, error);
    } finally {
      // Remove the request from active requests
      const requestsToRemove = Array.from(this.activeRequests).filter(requestId =>
        requestId.includes(url)
      );
      requestsToRemove.forEach(requestId => {
        this.activeRequests.delete(requestId);
      });
    }
  }

  private async createApiResponse(response: any): Promise<ApiResponse> {
    const apiResponse: ApiResponse = {
      url: response.url(),
      method: response.request().method(),
      status: response.status(),
      headers: response.headers(),
      body: null,
      timestamp: new Date().toISOString(),
    };

    try {
      const contentType = response.headers()["content-type"] || "";
      if (
        contentType.includes("application/json") ||
        contentType.includes("text/") ||
        !contentType
      ) {
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
      console.warn(
        `Failed to capture response body for ${apiResponse.url}:`,
        error
      );
    }

    return apiResponse;
  }

  getResponses(): ApiResponse[] {
    return [...this.apiResponses];
  }

  clearResponses(): void {
    this.apiResponses = [];
    this.pendingResponses = [];
  }

  removeListeners(): void {
    this.page.removeAllListeners("request");
    this.page.removeAllListeners("response");
  }

  async waitForRequests(timeout: number = 10000): Promise<ApiResponse[]> {
    if (!this.options.waitForRequests) {
      return this.getResponses();
    }

    const timeoutPromise = new Promise<ApiResponse[]>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout waiting for API requests after ${timeout}ms`));
      }, timeout);
    });

    const waitForRequestsPromise = new Promise<ApiResponse[]>((resolve) => {
      const checkRequests = () => {
        if (this.activeRequests.size === 0 && this.pendingResponses.length === 0) {
          resolve(this.getResponses());
        } else {
          setTimeout(checkRequests, 100);
        }
      };
      checkRequests();
    });

    try {
      await Promise.allSettled(this.pendingResponses);
      return await Promise.race([waitForRequestsPromise, timeoutPromise]);
    } catch (error) {
      console.warn('Error waiting for requests:', error);
      return this.getResponses();
    } finally {
      this.pendingResponses = [];
    }
  }

  getActiveRequestsCount(): number {
    return this.activeRequests.size;
  }
}

export async function setupApiInterception(
  page: Page,
  apiPattern: string,
  onResponse?: (response: ApiResponse) => void,
  waitForRequests: boolean = true,
  requestTimeout?: number
): Promise<{
  getResponses: () => ApiResponse[];
  clearResponses: () => void;
  removeListeners: () => void;
  waitForRequests: (timeout?: number) => Promise<ApiResponse[]>;
  getActiveRequestsCount: () => number;
}> {
  const interceptor = new ApiInterceptor(page, {
    apiPattern,
    onResponse,
    waitForRequests,
    requestTimeout
  });
  await interceptor.setupInterception();

  return {
    getResponses: () => interceptor.getResponses(),
    clearResponses: () => interceptor.clearResponses(),
    removeListeners: () => interceptor.removeListeners(),
    waitForRequests: (timeout?: number) => interceptor.waitForRequests(timeout),
    getActiveRequestsCount: () => interceptor.getActiveRequestsCount(),
  };
}