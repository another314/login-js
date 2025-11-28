import { BaseSiteLoginStrategy } from './BaseSiteLoginStrategy.js';
import type { SiteLoginConfig } from '../../types/index.js';

export class ZscanLoginStrategy extends BaseSiteLoginStrategy {
  readonly config: SiteLoginConfig = {
    name: 'Zscan',
    loginUrl: 'https://zscans.com/',
    selectors: {
      username: [
        '.v-text-field__slot>input[type=text]'
      ],
      password: [
        '.v-text-field__slot>input[type=password]'
      ],
      submit: [
        '[type=submit]'
      ]
    },
    beforeLogin: [
      {
        type: 'click',
        selector: 'button[aria-label="member"]',
        value: undefined,
        timeout: 2000,
        url: undefined
      }
    ],
    afterLogin: [
    ],
    waitAfterLogin: 4000,
    successIndicators: [],
    apiPatterns: ['/zero/api/login']
  };
}