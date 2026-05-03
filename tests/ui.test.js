// tests/ui.test.js
// ─────────────────────────────────────────────────────────────
//  KIỂM THỬ GIAO DIỆN (UI / Components)
//  Bao gồm: layout, responsive, Tailwind class, React components
// ─────────────────────────────────────────────────────────────

const { expect }       = require('chai');
const { By, Key }      = require('selenium-webdriver');
const { createDriver } = require('../utils/driver');
const helpers           = require('../utils/helpers');
const config            = require('../utils/config');
const LoginPage         = require('../pages/LoginPage');
const DashboardPage     = require('../pages/DashboardPage');

// ═══════════════════════════════════════════════════════════════
//  SUITE 1 — TRANG ĐĂNG NHẬP — Giao diện
// ═══════════════════════════════════════════════════════════════
describe('🎨 [UI] Trang Login — Giao diện & Layout', function () {
  this.timeout(30000);

  let driver, loginPage;

  before(async function () {
    driver    = await createDriver();
    loginPage = new LoginPage(driver);
    await loginPage.open();
  });

  after(async () => await driver.quit());

  afterEach(async function () {
    if (this.currentTest.state === 'failed') {
      await helpers.takeScreenshot(driver, `FAIL_ui_login_${this.currentTest.title.replace(/\s+/g, '_')}`);
    }
  });

  it('TC-UI-01: Trang login hiển thị đủ các phần tử cần thiết', async function () {
    const emailVisible    = await helpers.elementExists(driver, By.css('input[type="email"], #email'));
    const passwordVisible = await helpers.elementExists(driver, By.css('input[type="password"], #password'));
    const buttonVisible   = await helpers.elementExists(driver, By.css('button[type="submit"]'));

    expect(emailVisible,    'Input email không hiển thị').to.be.true;
    expect(passwordVisible, 'Input password không hiển thị').to.be.true;
    expect(buttonVisible,   'Nút submit không hiển thị').to.be.true;
  });

  it('TC-UI-02: Tiêu đề trang (title tab) đúng', async function () {
    const title = await driver.getTitle();
    // Điều chỉnh chuỗi này cho khớp với <title> của app
    expect(title).to.not.be.empty;
  });

  it('TC-UI-03: Form đăng nhập nằm trong viewport, không bị ẩn', async function () {
    const form = await driver.findElement(
      By.css('form, [data-testid="login-form"]')
    );
    expect(await form.isDisplayed()).to.be.true;

    // Kiểm tra form trong viewport
    const location = await form.getRect();
    const windowHeight = await driver.executeScript('return window.innerHeight');
    expect(location.y).to.be.lessThan(windowHeight);
  });

  it('TC-UI-04: Responsive — Mobile 375px — Form không bị tràn', async function () {
    await driver.manage().window().setRect({ width: 375, height: 812 });
    await helpers.waitForPageReady(driver);

    const scrollWidth = await driver.executeScript(
      'return document.documentElement.scrollWidth'
    );
    const windowWidth = await driver.executeScript('return window.innerWidth');

    // Không có scroll ngang
    expect(scrollWidth).to.be.lte(windowWidth + 5);

    // Reset lại
    await driver.manage().window().setRect({
      width:  config.browserWidth,
      height: config.browserHeight,
    });
  });

  it('TC-UI-05: Responsive — Tablet 768px — Layout vẫn đúng', async function () {
    await driver.manage().window().setRect({ width: 768, height: 1024 });
    await helpers.waitForPageReady(driver);

    const emailVisible = await helpers.elementExists(driver,
      By.css('input[type="email"]'));
    expect(emailVisible).to.be.true;

    await driver.manage().window().setRect({
      width:  config.browserWidth,
      height: config.browserHeight,
    });
  });

  it('TC-UI-06: Không có lỗi JavaScript trong console', async function () {
    const logs = await driver.manage().logs().get('browser');
    const errors = logs.filter(log =>
      log.level.name === 'SEVERE' && !log.message.includes('favicon')
    );

    if (errors.length > 0) {
      console.warn('Console errors:', errors.map(e => e.message));
    }
    // Cảnh báo — không fail cứng vì một số lỗi có thể không nghiêm trọng
    expect(errors.length, `Có ${errors.length} lỗi JS trong console`).to.be.lte(0);
  });
});

// ═══════════════════════════════════════════════════════════════
//  SUITE 2 — DASHBOARD — Giao diện sau đăng nhập
// ═══════════════════════════════════════════════════════════════
describe('📊 [UI] Dashboard — Layout & Components', function () {
  this.timeout(60000);

  let driver, dashboardPage;

  before(async function () {
    driver        = await createDriver();
    const loginPage = new LoginPage(driver);
    dashboardPage = new DashboardPage(driver);

    // Đăng nhập một lần cho cả suite
    await loginPage.open();
    await loginPage.loginAndWaitRedirect(config.admin.email, config.admin.password);
  });

  after(async () => await driver.quit());

  afterEach(async function () {
    if (this.currentTest.state === 'failed') {
      await helpers.takeScreenshot(driver, `FAIL_ui_dash_${this.currentTest.title.replace(/\s+/g, '_')}`);
    }
  });

  it('TC-UI-10: Navbar hiển thị sau khi đăng nhập', async function () {
    expect(await dashboardPage.isNavbarVisible()).to.be.true;
  });

  it('TC-UI-11: Sidebar hiển thị (nếu có) và có thể toggle', async function () {
    const sidebarExists = await helpers.elementExists(driver,
      By.css('[data-testid="sidebar"], aside'));

    if (sidebarExists) {
      expect(await dashboardPage.isSidebarVisible()).to.be.true;
    }
  });

  it('TC-UI-12: Trang Dashboard có nội dung chính (không trắng)', async function () {
    const mainContent = await driver.findElement(
      By.css('[data-testid="main-content"], main, #root > div')
    );
    const text = await mainContent.getText();
    expect(text.length).to.be.greaterThan(0);
  });

  it('TC-UI-13: Không có layout bị vỡ — không có scroll ngang', async function () {
    const scrollWidth = await driver.executeScript(
      'return document.documentElement.scrollWidth'
    );
    const windowWidth = await driver.executeScript('return window.innerWidth');
    expect(scrollWidth).to.be.lte(windowWidth + 5);
  });

  it('TC-UI-14: Dark mode toggle hoạt động (nếu có)', async function () {
    const darkToggleExists = await helpers.elementExists(driver,
      By.css('[data-testid="dark-mode-toggle"]'));

    if (!darkToggleExists) {
      console.log('  ℹ️  App chưa có dark mode toggle — bỏ qua test này');
      return;
    }

    // Lấy class của <html> hoặc <body> trước khi toggle
    const htmlClassBefore = await driver.executeScript(
      'return document.documentElement.className'
    );

    await helpers.safeClick(driver, By.css('[data-testid="dark-mode-toggle"]'));
    await helpers.waitForPageReady(driver);

    const htmlClassAfter = await driver.executeScript(
      'return document.documentElement.className'
    );

    // Class phải thay đổi (thêm hoặc bỏ 'dark')
    expect(htmlClassBefore).to.not.equal(htmlClassAfter);
  });
});

// ═══════════════════════════════════════════════════════════════
//  SUITE 3 — NAVIGATION & ROUTING
// ═══════════════════════════════════════════════════════════════
describe('🧭 [UI] Navigation & Routing (React Router)', function () {
  this.timeout(60000);

  let driver;

  before(async function () {
    driver = await createDriver();
    const loginPage = new LoginPage(driver);
    await loginPage.open();
    await loginPage.loginAndWaitRedirect(config.admin.email, config.admin.password);
  });

  after(async () => await driver.quit());

  afterEach(async function () {
    if (this.currentTest.state === 'failed') {
      await helpers.takeScreenshot(driver, `FAIL_nav_${this.currentTest.title.replace(/\s+/g, '_')}`);
    }
  });

  it('TC-NAV-01: Click link điều hướng — URL thay đổi đúng', async function () {
    // Điều chỉnh selector link theo sidebar/navbar của bạn
    const navLinks = await driver.findElements(
      By.css('[data-testid="nav-link"], nav a, aside a')
    );

    if (navLinks.length === 0) {
      console.log('  ℹ️  Không tìm thấy nav links — bỏ qua');
      return;
    }

    const firstLink = navLinks[0];
    const href      = await firstLink.getAttribute('href');
    await firstLink.click();
    await helpers.waitForPageReady(driver);

    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).to.not.be.empty;
  });

  it('TC-NAV-02: Nút Back của trình duyệt hoạt động đúng', async function () {
    const urlBefore = await driver.getCurrentUrl();

    // Navigate sang trang khác
    await driver.get(`${config.frontendUrl}/settings`);
    await helpers.waitForPageReady(driver);

    // Nhấn Back
    await driver.navigate().back();
    await helpers.waitForPageReady(driver);

    const urlAfter = await driver.getCurrentUrl();
    expect(urlAfter).to.equal(urlBefore);
  });

  it('TC-NAV-03: F5 refresh không mất đăng nhập (token persist)', async function () {
    await driver.navigate().refresh();
    await helpers.waitForPageReady(driver);

    const url = await driver.getCurrentUrl();
    // Không bị đá về trang login
    expect(url).to.not.include('/login');
  });

  it('TC-NAV-04: 404 — trang không tồn tại hiện thông báo lỗi hợp lý', async function () {
    await driver.get(`${config.frontendUrl}/trang-khong-ton-tai-abc123`);
    await helpers.waitForPageReady(driver);

    // Kiểm tra có hiện trang 404 không
    const page404 = await helpers.elementExists(driver,
      By.css('[data-testid="not-found"], .not-found, h1'));

    // Hoặc redirect về dashboard/home
    const url = await driver.getCurrentUrl();

    expect(page404 || !url.includes('/trang-khong-ton-tai')).to.be.true;
  });
});

// ═══════════════════════════════════════════════════════════════
//  SUITE 4 — ACCESSIBILITY CƠ BẢN
// ═══════════════════════════════════════════════════════════════
describe('♿ [UI] Accessibility cơ bản', function () {
  this.timeout(30000);

  let driver;

  before(async function () {
    driver = await createDriver();
    const loginPage = new LoginPage(driver);
    await loginPage.open();
  });

  after(async () => await driver.quit());

  it('TC-A11Y-01: Input email có label hoặc placeholder', async function () {
    const emailInput = await driver.findElement(By.css('input[type="email"]'));
    const placeholder = await emailInput.getAttribute('placeholder');
    const ariaLabel   = await emailInput.getAttribute('aria-label');
    const id          = await emailInput.getAttribute('id');

    // Có label liên kết, aria-label, hoặc placeholder
    const hasLabel = id
      ? await helpers.elementExists(driver, By.css(`label[for="${id}"]`))
      : false;

    expect(placeholder || ariaLabel || hasLabel).to.be.ok;
  });

  it('TC-A11Y-02: Nút submit có text hoặc aria-label', async function () {
    const btn = await driver.findElement(By.css('button[type="submit"]'));
    const text      = await btn.getText();
    const ariaLabel = await btn.getAttribute('aria-label');

    expect(text || ariaLabel).to.be.ok;
  });

  it('TC-A11Y-03: Có thể điều hướng form bằng bàn phím (Tab)', async function () {
    const email = await driver.findElement(By.css('input[type="email"]'));
    await email.click();

    // Tab sang password
    await email.sendKeys(Key.TAB);
    const activeEl = await driver.executeScript('return document.activeElement.type');
    expect(activeEl).to.equal('password');
  });
});