import { BaseSiteLoginStrategy } from "./BaseSiteLoginStrategy.js";
import { ActionStageEnum, ApiPatternEnum, type SiteLoginConfig } from "../../types/index.js";

export class ZscanLoginStrategy extends BaseSiteLoginStrategy {
  readonly config: SiteLoginConfig = {
    name: "Zscan",
    loginUrl: "https://zscans.com/",
    selectors: {
      username: [".v-text-field__slot>input[type=text]"],
      password: [".v-text-field__slot>input[type=password]"],
      submit: ["[type=submit]"],
    },
    beforeLogin: [
      {
        type: "click",
        selector: 'button[aria-label="member"]',
        value: undefined,
        timeout: 500,
        url: undefined,
        stage: ActionStageEnum.before
      },
    ],
    afterLogin: [
      {
        type: "waitApi",
        selector: undefined,
        value: ApiPatternEnum.login.toString(),
        timeout: 10000,
        url: undefined,
        stage: ActionStageEnum.after
      },
      {
        type: "click",
        selector: 'button[aria-label="bookmark"]',
        value: undefined,
        timeout: 5000,
        url: undefined,
        stage: ActionStageEnum.after
      },
      {
        type: "waitApi",
        selector: undefined,
        value: ApiPatternEnum.bookmark.toString(),
        timeout: 10000,
        url: undefined,
        stage: ActionStageEnum.after
      },
      {
        type: "click",
        selector: "span.v-badge--avatar>.v-avatar",
        value: undefined,
        timeout: 5000,
        url: undefined,
        stage: ActionStageEnum.after
      },
      {
        type: "click",
        selector:
          "#app > div.v-menu__content.theme--dark.menuable__content__active > div > div.v-list.v-sheet.theme--dark.v-list--dense.v-list--nav > div:nth-child(2)",
        value: undefined,
        timeout: 5000,
        url: undefined,
        stage: ActionStageEnum.after
      },
      {
        type: "waitApi",
        selector: undefined,
        value: ApiPatternEnum.history.toString(),
        timeout: 10000,
        url: undefined,
        stage: ActionStageEnum.after
      },
    ],
    waitAfterLogin: 5000,
    successIndicators: ["two_factor"],
    apiPatterns: [
      {
        name: ApiPatternEnum.login,
        pattern: "/zero/api/login",
      },
      {
        name: ApiPatternEnum.history,
        pattern: "/swordflake/history",
      },
      {
        name: ApiPatternEnum.bookmark,
        pattern: "/zero/api/user",
      },
    ],
  };
}
