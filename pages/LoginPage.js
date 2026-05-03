// pages/LoginPage.js
// ─────────────────────────────────────────────────────────────
//  Page Object Model cho trang Đăng nhập
//  React + Tailwind CSS v4 — điều chỉnh selector theo app của bạn
// ─────────────────────────────────────────────────────────────

const { By, until } = require('selenium-webdriver');
const helpers        = require('../utils/helpers');
const config         = require('../utils/config');

class LoginPage {
  constructor(driver) {
    this.driver = driver;

    // ── Selectors ────────────────────────────────────────────
    // Ưu tiên dùng data-testid để không bị ảnh hưởng khi đổi Tailwind class
    this.sel = {
      // Form fields
      emailInput:    By.css('[data-testid="email-input"], input[type="email"], #email'),
      passwordInput: By.css('[data-testid="password-input"], input[type="password"], #password'),
      submitBtn:     By.css('[data-testid="login-btn"], button[type="submit"]'),

      // Validation & errors
      emailError:    By.css('[data-testid="email-error"], #email-error, .text-red-500'),
      passwordError: By.css('[data-testid="password-error"], #password-error'),
      globalError:   By.css('[data-testid="login-error"], [role="alert"].text-red-500'),

      // UI elements
      pageTitle:     By.css('[data-testid="login-title"], h1, h2'),
      showPasswordToggle: By.css('[data-testid="toggle-password"]'),
      forgotPasswordLink: By.css('[data-testid="forgot-password"], a[href*="forgot"]'),
      registerLink:  By.css('[data-testid="register-link"], a[href*="register"], a[href*="signup"]'),

      // Loading
      loadingSpinner: By.css('[data-testid="loading-spinner"], .animate-spin'),
    };
  }

  // ── Navigation ────────────────────────────────────────────

  async open() {
    await this.driver.get(`${config.frontendUrl}/login`);
    await helpers.waitForPageReady(this.driver);
    await helpers.waitForVisible(this.driver, this.sel.emailInput);
  }

  // ── Actions ───────────────────────────────────────────────

  async enterEmail(email) {
    await helpers.fillInput(this.driver, this.sel.emailInput, email);
  }

  async enterPassword(password) {
    await helpers.fillInput(this.driver, this.sel.passwordInput, password);
  }

  async clickSubmit() {
    await helpers.safeClick(this.driver, this.sel.submitBtn);
  }

  async togglePasswordVisibility() {
    await helpers.safeClick(this.driver, this.sel.showPasswordToggle);
  }

  /**
   * Điền form và submit — dùng trong hầu hết test case
   */
  async login(email, password) {
    await this.enterEmail(email);
    await this.enterPassword(password);
    await this.clickSubmit();
  }

  /**
   * Đăng nhập hoàn chỉnh: gõ → submit → chờ chuyển trang
   */
  async loginAndWaitRedirect(email, password, redirectPath = '/dashboard') {
    await this.login(email, password);
    await helpers.waitForUrl(this.driver, redirectPath);
  }

  // ── Getters ───────────────────────────────────────────────

  async getEmailErrorText() {
    return helpers.getText(this.driver, this.sel.emailError);
  }

  async getPasswordErrorText() {
    return helpers.getText(this.driver, this.sel.passwordError);
  }

  async getGlobalErrorText() {
    return helpers.getText(this.driver, this.sel.globalError);
  }

  async getPasswordInputType() {
    const el = await this.driver.findElement(this.sel.passwordInput);
    return el.getAttribute('type');
  }

  // ── State checks ──────────────────────────────────────────

  async isOnLoginPage() {
    const url = await this.driver.getCurrentUrl();
    return url.includes('/login');
  }

  async isSubmitButtonDisabled() {
    const el = await this.driver.findElement(this.sel.submitBtn);
    return !(await el.isEnabled());
  }

  async isLoadingVisible() {
    return helpers.elementExists(this.driver, this.sel.loadingSpinner);
  }

  async isEmailErrorVisible() {
    return helpers.elementExists(this.driver, this.sel.emailError);
  }

  async isGlobalErrorVisible() {
    return helpers.elementExists(this.driver, this.sel.globalError);
  }
}

module.exports = LoginPage;