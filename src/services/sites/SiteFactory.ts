import type { SiteLoginStrategy } from '../../types/index.js';
import { GenericLoginStrategy } from './GenericLoginStrategy.js';
import { ZscanLoginStrategy } from './ZscanLoginStrategy.js';

export class SiteFactory {
  private static strategies = new Map<string, () => SiteLoginStrategy>([
    ['generic', () => new GenericLoginStrategy()],
    ['zscan', () => new ZscanLoginStrategy()]
  ]);

  static registerSite(siteId: string, strategyFactory: () => SiteLoginStrategy): void {
    this.strategies.set(siteId.toLowerCase(), strategyFactory);
  }

  static getSiteStrategy(siteId: string): SiteLoginStrategy {
    const normalizedId = siteId.toLowerCase();
    const strategyFactory = this.strategies.get(normalizedId);

    if (!strategyFactory) {
      console.warn(`Unknown site: ${siteId}. Falling back to generic strategy.`);
      return new GenericLoginStrategy();
    }

    return strategyFactory();
  }

  static getSupportedSites(): string[] {
    return Array.from(this.strategies.keys());
  }

  static isSiteSupported(siteId: string): boolean {
    return this.strategies.has(siteId.toLowerCase());
  }
}