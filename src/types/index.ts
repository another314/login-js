export interface ProxyConfig {
  enabled: boolean;
  host?: string;
  port?: number;
  username?: string | undefined;
  password?: string | undefined;
  protocol: 'http' | 'https' | 'socks5';
}

export interface LoginRequest {
  username: string;
  password: string;
  targetUrl?: string;
  site?: string;
  proxy?: ProxyConfig;
  beforeLogin?: ElementAction[];
  afterLogin?: ElementAction[];
  options?: {
    headless?: boolean | 'new' | 'old';
    timeout?: number;
    userAgent?: string;
    viewport?: {
      width: number;
      height: number;
    };
    // Browser profile options to avoid rate limiting
    isolateProfile?: boolean; // default: true
    randomUserAgent?: boolean; // default: true
  };
}

export interface ElementAction {
  type: 'click' | 'input' | 'wait' | 'navigate' | 'api';
  selector: string | undefined;
  value: string | undefined;
  timeout: number | undefined;
  url: string | undefined;
  apiUrl?: string;
  apiMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  apiHeaders?: Record<string, string>;
}

export interface ApiResponse {
  url: string;
  method: string;
  status: number;
  headers: Record<string, string>;
  body: any;
  timestamp: string;
}

export interface LoginResult {
  success: boolean;
  sessionId: string;
  message: string;
  apiResponses: ApiResponse[];
  screenshot?: string;
  error?: string;
  executionTime: number;
}

export interface BrowserSession {
  id: string;
  proxy: ProxyConfig | undefined;
  page?: any;
  browser?: any;
  isActive: boolean;
  createdAt: Date;
}

export interface SiteLoginConfig {
  name: string;
  loginUrl: string;
  selectors: {
    username: string[];
    password: string[];
    submit: string[];
  };
  beforeLogin?: ElementAction[];
  afterLogin?: ElementAction[];
  apiPatterns?: string[];
  waitAfterLogin?: number;
  successIndicators?: string[];
}

export interface SiteLoginStrategy {
  readonly config: SiteLoginConfig;
  generateLoginActions(request: LoginRequest): ElementAction[];
  validateLoginResult(apiResponses: ApiResponse[]): boolean;
  getApiPatterns(): string[];
}

export interface TestConfig {
  maxConcurrentRequests: number;
  requestTimeout: number;
  browserTimeout: number;
  defaultUserAgent: string;
  headless: boolean;
}