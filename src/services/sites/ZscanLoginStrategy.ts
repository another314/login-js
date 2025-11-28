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
        timeout: 500,
        url: undefined
      }
    ],
    afterLogin: [
      {
        type: 'click',
        selector: 'button[aria-label="bookmark"]',
        value: undefined,
        timeout: 5000,
        url: undefined
      },
      {
        type: 'wait',
        selector: undefined,
        value: undefined,
        timeout: 5000,
        url: undefined
      }
    ],
    waitAfterLogin: 5000,
    successIndicators: ["two_factor"],
    apiPatterns: ['/zero/api/login']
  };
}