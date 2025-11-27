import { BaseSiteLoginStrategy } from './BaseSiteLoginStrategy.js';
import type { SiteLoginConfig } from '../../types/index.js';

export class GenericLoginStrategy extends BaseSiteLoginStrategy {
  readonly config: SiteLoginConfig = {
    name: 'Generic',
    loginUrl: '',
    selectors: {
      username: [
        'input[name="username"]',
        'input[name="user"]',
        'input[type="email"]',
        'input[name="email"]',
        '#username',
        '#email',
        '.username',
        '.email',
        'input[placeholder*="email"]',
        'input[placeholder*="username"]',
        'input[placeholder*="Email"]',
        'input[placeholder*="Username"]'
      ],
      password: [
        'input[name="password"]',
        'input[type="password"]',
        '#password',
        '.password',
        'input[placeholder*="password"]',
        'input[placeholder*="Password"]'
      ],
      submit: [
        'button[type="submit"]',
        'input[type="submit"]',
        '.login-btn',
        '.btn-login',
        '#login',
        '#submit',
        '.submit',
        'button:contains("Login")',
        'button:contains("Sign in")',
        'button:contains("Log in")',
        'button:contains("Sign In")'
      ]
    },
    waitAfterLogin: 3000,
    successIndicators: ['success', 'authenticated', 'dashboard', 'welcome', 'logout']
  };
}