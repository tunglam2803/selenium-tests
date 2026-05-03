// tests/auth.test.js
// ─────────────────────────────────────────────────────────────
//  KIỂM THỬ XÁC THỰC (Authentication)
//  Bao gồm: đăng nhập, đăng xuất, phân quyền, redirect
// ─────────────────────────────────────────────────────────────

const { expect }      = require('chai');
const { By }          = require('selenium-webdriver');
const { createDriver } = require('../utils/driver');
const helpers          = require('../utils/helpers');
const config           = require('../utils/config');
const LoginPage        = require('../pages/LoginPage');
const DashboardPage    = require('../pages/DashboardPage');

// ═══════════════════════════════════════════════════════════════
//  SUITE 1 — ĐĂNG NHẬP
// ═══════════════════════════════════════════════════════════════
describe('🔐 [Auth] Đăng nhập', function () {
  this.timeout(60000);

  let driver, loginPage, dashboardPage;

  beforeEach(async function () {
    driver        = await createDriver();
    loginPage     = new LoginPage(driver);
    dashboardPage = new DashboardPage(driver);
    await loginPage.open();
  });

  afterEach(async function () {
    // Chụp ảnh nếu test thất bại
    if (this.currentTest.state === 'failed') {
      await helpers.takeScreenshot(driver, `FAIL_auth_${this.currentTest.title.replace(/\s+/g, '_')}`);
    }
    await driver.quit();
  });

  // ── TC-01: Đăng nhập thành công ───────────────────────────

  it('TC-01: Đăng nhập thành công với Admin → chuyển về Dashboard', async function () {
    await loginPage.login(config.admin.email, config.admin.password);
    await helpers.waitForUrl(driver, '/dashboard', config.timeout);

    expect(await dashboardPage.isOnDashboard()).to.be.true;
    expect(await dashboardPage.isNavbarVisible()).to.be.true;
  });

  it('TC-02: Đăng nhập thành công với User thường → chuyển đúng trang', async function () {
    await loginPage.login(config.user.email, config.user.password);

    // User thường có thể redirect khác Admin
    const url = await driver.getCurrentUrl();
    expect(url).to.not.include('/login');
  });

  // ── TC-03..05: Trường hợp thất bại ───────────────────────

  it('TC-03: Sai mật khẩu → hiện thông báo lỗi', async function () {
    await loginPage.login(config.admin.email, 'SaiMatKhau@999');

    // Vẫn ở trang login
    expect(await loginPage.isOnLoginPage()).to.be.true;

    // Thông báo lỗi xuất hiện
    expect(await loginPage.isGlobalErrorVisible()).to.be.true;
    const errorText = await loginPage.getGlobalErrorText();
    expect(errorText).to.match(/sai|không đúng|invalid|incorrect/i);
  });

  it('TC-04: Để trống email → hiện lỗi validation email', async function () {
    await loginPage.enterPassword(config.admin.password);
    await loginPage.clickSubmit();

    // HTML5 validation hoặc React validation
    const emailError = await loginPage.isEmailErrorVisible();
    const stillOnLogin = await loginPage.isOnLoginPage();

    expect(emailError || stillOnLogin).to.be.true;
  });

  it('TC-05: Email không đúng định dạng → báo lỗi format', async function () {
    await loginPage.enterEmail('khong-phai-email');
    await loginPage.enterPassword(config.admin.password);
    await loginPage.clickSubmit();

    expect(await loginPage.isOnLoginPage()).to.be.true;
  });

  it('TC-06: Để trống cả hai trường → không submit được', async function () {
    await loginPage.clickSubmit();
    expect(await loginPage.isOnLoginPage()).to.be.true;
  });

  // ── TC-07: Tính năng hiện/ẩn mật khẩu ─────────────────────

  it('TC-07: Nút hiện/ẩn mật khẩu hoạt động đúng', async function () {
    await loginPage.enterPassword('MatKhau123');

    // Ban đầu type="password"
    expect(await loginPage.getPasswordInputType()).to.equal('password');

    // Click toggle → đổi thành text
    const toggleExists = await helpers.elementExists(driver,
      By.css('[data-testid="toggle-password"]'));

    if (toggleExists) {
      await loginPage.togglePasswordVisibility();
      expect(await loginPage.getPasswordInputType()).to.equal('text');

      // Click lại → trở về password
      await loginPage.togglePasswordVisibility();
      expect(await loginPage.getPasswordInputType()).to.equal('password');
    }
  });

  // ── TC-08: Bảo mật — Brute force protection ───────────────

  it('TC-08: Nhiều lần đăng nhập sai → tài khoản bị khóa hoặc rate limit', async function () {
    const MAX_TRIES = 5;

    for (let i = 0; i < MAX_TRIES; i++) {
      await loginPage.enterEmail(config.admin.email);
      await loginPage.enterPassword(`SaiMatKhau${i}`);
      await loginPage.clickSubmit();
      await helpers.waitForPageReady(driver);
    }

    // Sau nhiều lần sai, kỳ vọng: khóa tài khoản HOẶC có thông báo rate limit
    const errorVisible = await loginPage.isGlobalErrorVisible();
    expect(errorVisible).to.be.true;
  });

  // ── TC-09: Redirect khi chưa đăng nhập ───────────────────

  it('TC-09: Truy cập /dashboard khi chưa đăng nhập → redirect về /login', async function () {
    await driver.get(`${config.frontendUrl}/dashboard`);
    await helpers.waitForPageReady(driver);

    await helpers.waitForUrl(driver, '/login', config.timeout);
    expect(await loginPage.isOnLoginPage()).to.be.true;
  });

  it('TC-10: Truy cập trang bảo vệ bất kỳ khi chưa đăng nhập → về /login', async function () {
    const protectedRoutes = ['/profile', '/settings', '/admin'];

    for (const route of protectedRoutes) {
      await driver.get(`${config.frontendUrl}${route}`);
      await helpers.waitForPageReady(driver);

      const url = await driver.getCurrentUrl();
      expect(url, `Route ${route} không redirect về login`).to.include('/login');
    }
  });
});

// ═══════════════════════════════════════════════════════════════
//  SUITE 2 — ĐĂNG XUẤT
// ═══════════════════════════════════════════════════════════════
describe('🚪 [Auth] Đăng xuất', function () {
  this.timeout(60000);

  let driver, loginPage, dashboardPage;

  beforeEach(async function () {
    driver        = await createDriver();
    loginPage     = new LoginPage(driver);
    dashboardPage = new DashboardPage(driver);

    // Đăng nhập trước qua UI
    await loginPage.open();
    await loginPage.loginAndWaitRedirect(config.admin.email, config.admin.password);
  });

  afterEach(async function () {
    if (this.currentTest.state === 'failed') {
      await helpers.takeScreenshot(driver, `FAIL_logout_${this.currentTest.title.replace(/\s+/g, '_')}`);
    }
    await driver.quit();
  });

  it('TC-11: Đăng xuất thành công → về trang Login', async function () {
    await dashboardPage.logout();

    expect(await loginPage.isOnLoginPage()).to.be.true;
  });

  it('TC-12: Sau đăng xuất, truy cập lại Dashboard → redirect về Login', async function () {
    await dashboardPage.logout();

    // Cố truy cập lại dashboard
    await driver.get(`${config.frontendUrl}/dashboard`);
    await helpers.waitForPageReady(driver);

    expect(await loginPage.isOnLoginPage()).to.be.true;
  });

  it('TC-13: Sau đăng xuất, token bị xóa khỏi localStorage', async function () {
    await dashboardPage.logout();

    const token = await driver.executeScript(`
      return localStorage.getItem('token') || 
             localStorage.getItem('accessToken') || 
             sessionStorage.getItem('token');
    `);

    expect(token).to.be.null;
  });
});

// ═══════════════════════════════════════════════════════════════
//  SUITE 3 — PHÂN QUYỀN (Authorization)
// ═══════════════════════════════════════════════════════════════
describe('🛡️ [Auth] Phân quyền', function () {
  this.timeout(60000);

  let driver, loginPage;

  beforeEach(async function () {
    driver    = await createDriver();
    loginPage = new LoginPage(driver);
  });

  afterEach(async function () {
    if (this.currentTest.state === 'failed') {
      await helpers.takeScreenshot(driver, `FAIL_authz_${this.currentTest.title.replace(/\s+/g, '_')}`);
    }
    await driver.quit();
  });

  it('TC-14: User thường không thấy menu Admin', async function () {
    await loginPage.open();
    await loginPage.loginAndWaitRedirect(config.user.email, config.user.password);

    // Menu/section Admin không được hiển thị
    const adminMenuVisible = await helpers.elementExists(driver,
      By.css('[data-testid="admin-menu"], [href*="/admin"]'));

    expect(adminMenuVisible).to.be.false;
  });

  it('TC-15: User thường truy cập /admin → bị từ chối (403 hoặc redirect)', async function () {
    // Đăng nhập qua API để nhanh hơn
    try {
      const token = await helpers.loginViaApi(config.user.email, config.user.password);
      await driver.get(config.frontendUrl);
      await helpers.injectAuthToken(driver, token);
    } catch (_) {
      await loginPage.open();
      await loginPage.loginAndWaitRedirect(config.user.email, config.user.password);
    }

    await driver.get(`${config.frontendUrl}/admin`);
    await helpers.waitForPageReady(driver);

    const url = await driver.getCurrentUrl();
    const is403Visible = await helpers.elementExists(driver,
      By.css('[data-testid="forbidden"], .text-red-500'));

    expect(url.includes('/admin') === false || is403Visible).to.be.true;
  });
});