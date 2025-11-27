import { config } from 'dotenv';
import { TestConfig } from '../types/index.js';

config();

export const testConfig: TestConfig = {
  maxConcurrentRequests: parseInt(process.env['MAX_CONCURRENT_REQUESTS'] || '5', 10),
  requestTimeout: parseInt(process.env['REQUEST_TIMEOUT'] || '30000', 10),
  browserTimeout: parseInt(process.env['BROWSER_TIMEOUT'] || '60000', 10),
  defaultUserAgent: process.env['USER_AGENT'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  headless: process.env['HEADLESS'] !== 'false'
};

export const getProxyEnabled = (): boolean => {
  return process.env['PROXY_ENABLED'] !== 'false';
};

export const getProxies = (): string[] => {
  const proxyString = process.env['PROXIES'];
  if (!proxyString) {
    return [];
  }

  return proxyString.split(',').map(proxy => proxy.trim()).filter(proxy => proxy.length > 0);
};

export const getPort = (): number => {
  return parseInt(process.env['PORT'] || '3000', 10);
};

export const validateEnvironment = (): void => {
  const requiredEnvVars: string[] = [];

  if (requiredEnvVars.length > 0) {
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }
};