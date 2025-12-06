import { type SiteLoginStrategy, type SiteLoginConfig, type LoginRequest, type ElementAction, type ApiResponse, ActionStageEnum, ApiPattern } from '../../types/index.js';

export abstract class BaseSiteLoginStrategy implements SiteLoginStrategy {
  abstract readonly config: SiteLoginConfig;

  generateLoginActions(request: LoginRequest): ElementAction[] {
    const actions: ElementAction[] = [];

    
    // Generate default login actions based on site configuration
    const loginUrl = request.targetUrl || this.config.loginUrl;
    
    actions.push({
      type: 'navigate',
      selector: undefined,
      value: undefined,
      timeout: undefined,
      url: loginUrl,
      stage: ActionStageEnum.before
    });
    
    // Add before login actions (custom or site-specific)
    if (this.config.beforeLogin && this.config.beforeLogin.length > 0) {
      actions.push(...this.config.beforeLogin);
    }
    
    // Find working username selector
    for (const selector of this.config.selectors.username) {
      actions.push({
        type: 'input',
        selector,
        value: request.username,
        timeout: 5000,
        url: undefined,
        stage: ActionStageEnum.login
      });
    }

    // Find working password selector
    for (const selector of this.config.selectors.password) {
      actions.push({
        type: 'input',
        selector,
        value: request.password,
        timeout: 5000,
        url: undefined,
        stage: ActionStageEnum.login
      });
    }

    actions.push({
      type: 'wait',
      selector: undefined,
      value: undefined,
      timeout: 500,
      url: undefined,
      stage: ActionStageEnum.login
    });

    // Try to click submit button
    for (const selector of this.config.selectors.submit) {
      actions.push({
        type: 'click',
        selector,
        value: undefined,
        timeout: 5000,
        url: undefined,
        stage: ActionStageEnum.login
      });
    }

    if (this.config.afterLogin && this.config.afterLogin.length > 0) {
      actions.push(...this.config.afterLogin);
    }

    return actions;
  }

  validateLoginResult(apiResponses: ApiResponse[]): boolean {
    if (!this.config.successIndicators || this.config.successIndicators.length === 0) {
      return true; // Assume success if no validation rules defined
    }

    // Check API responses for success indicators
    for (const response of apiResponses) {
      const responseText = JSON.stringify(response.body || {}).toLowerCase();

      for (const indicator of this.config.successIndicators) {
        if (responseText.includes(indicator.toLowerCase())) {
          return true;
        }
      }
    }

    return false;
  }

  getApiPatterns(): ApiPattern[] {
    return this.config.apiPatterns || [];
  }
}