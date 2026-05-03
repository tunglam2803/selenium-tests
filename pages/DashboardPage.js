// pages/DashboardPage.js
// ─────────────────────────────────────────────────────────────
//  Page Object Model cho trang Dashboard chính
// ─────────────────────────────────────────────────────────────

const { By } = require('selenium-webdriver');
const helpers  = require('../utils/helpers');
const config   = require('../utils/config');

class DashboardPage {
  constructor(driver) {
    this.driver = driver;

    this.sel = {
      // Navbar / Header
      navbar:          By.css('[data-testid="navbar"], nav, header'),
      userAvatar:      By.css('[data-testid="user-avatar"]'),
      userMenu:        By.css('[data-testid="user-menu"]'),
      logoutBtn:       By.css('[data-testid="logout-btn"], button[data-action="logout"]'),
      userName:        By.css('[data-testid="user-name"]'),

      // Sidebar (nếu có)
      sidebar:         By.css('[data-testid="sidebar"], aside'),
      sidebarToggle:   By.css('[data-testid="sidebar-toggle"]'),

      // Nội dung dashboard
      pageTitle:       By.css('[data-testid="page-title"], main h1'),
      statsCards:      By.css('[data-testid="stat-card"]'),
      mainContent:     By.css('[data-testid="main-content"], main'),

      // Loading
      loadingSpinner:  By.css('[data-testid="loading-spinner"], .animate-spin'),
    };
  }

  // ── Navigation ────────────────────────────────────────────

  async open() {
    await this.driver.get(`${config.frontendUrl}/dashboard`);
    await helpers.waitForPageReady(this.driver);
  }

  async goToSection(path) {
    await this.driver.get(`${config.frontendUrl}${path}`);
    await helpers.waitForPageReady(this.driver);
  }

  // ── Actions ───────────────────────────────────────────────

  async clickUserAvatar() {
    await helpers.safeClick(this.driver, this.sel.userAvatar);
  }

  async logout() {
    await this.clickUserAvatar();
    await helpers.safeClick(this.driver, this.sel.logoutBtn);
    await helpers.waitForUrl(this.driver, '/login');
  }

  async toggleSidebar() {
    await helpers.safeClick(this.driver, this.sel.sidebarToggle);
  }

  // ── Getters ───────────────────────────────────────────────

  async getPageTitle() {
    return helpers.getText(this.driver, this.sel.pageTitle);
  }

  async getUserName() {
    return helpers.getText(this.driver, this.sel.userName);
  }

  async getStatCardCount() {
    const cards = await this.driver.findElements(this.sel.statsCards);
    return cards.length;
  }

  // ── State checks ──────────────────────────────────────────

  async isOnDashboard() {
    const url = await this.driver.getCurrentUrl();
    return url.includes('/dashboard');
  }

  async isNavbarVisible() {
    return helpers.elementExists(this.driver, this.sel.navbar);
  }

  async isSidebarVisible() {
    return helpers.elementExists(this.driver, this.sel.sidebar);
  }
}

module.exports = DashboardPage;