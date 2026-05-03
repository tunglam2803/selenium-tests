// utils/helpers.js
// ─────────────────────────────────────────────────────────────
//  Các hàm tiện ích dùng chung trong tất cả test case
// ─────────────────────────────────────────────────────────────

const { until, By } = require('selenium-webdriver');
const fs             = require('fs');
const path           = require('path');
const config         = require('./config');

// ── Chờ đợi ────────────────────────────────────────────────────

/**
 * Chờ phần tử xuất hiện và trả về element
 */
async function waitForElement(driver, locator, timeout = config.timeout) {
  return driver.wait(until.elementLocated(locator), timeout);
}

/**
 * Chờ phần tử hiển thị (visible)
 */
async function waitForVisible(driver, locator, timeout = config.timeout) {
  const el = await waitForElement(driver, locator, timeout);
  await driver.wait(until.elementIsVisible(el), timeout);
  return el;
}

/**
 * Chờ phần tử biến mất (loading spinner...)
 */
async function waitForHidden(driver, locator, timeout = config.timeout) {
  try {
    const el = await driver.findElement(locator);
    await driver.wait(until.elementIsNotVisible(el), timeout);
  } catch (_) {
    // Phần tử không tồn tại = đã ẩn → OK
  }
}

/**
 * Chờ URL chứa chuỗi nhất định (sau khi navigate)
 */
async function waitForUrl(driver, urlPart, timeout = config.timeout) {
  await driver.wait(until.urlContains(urlPart), timeout,
    `Timeout: URL không chứa "${urlPart}"`);
}

/**
 * Chờ React/Vite render xong (spinner tắt hoặc loading state biến mất)
 * Điều chỉnh selector spinner cho khớp với app của bạn
 */
async function waitForPageReady(driver, timeout = config.timeout) {
  // Chờ document.readyState = complete
  await driver.wait(async () => {
    const state = await driver.executeScript('return document.readyState');
    return state === 'complete';
  }, timeout);

  // Chờ spinner/loading của React tắt (nếu có)
  await waitForHidden(driver, By.css('[data-testid="loading-spinner"]'), 5000);
}

// ── Tương tác ──────────────────────────────────────────────────

/**
 * Click an toàn — chờ element clickable trước
 */
async function safeClick(driver, locator, timeout = config.timeout) {
  const el = await driver.wait(until.elementLocated(locator), timeout);
  await driver.wait(until.elementIsEnabled(el), timeout);
  await driver.executeScript('arguments[0].scrollIntoView({block:"center"})', el);
  await el.click();
  return el;
}

/**
 * Điền vào input — xóa trước rồi gõ
 */
async function fillInput(driver, locator, text) {
  const el = await waitForVisible(driver, locator);
  await el.clear();
  await el.sendKeys(text);
  return el;
}

/**
 * Lấy text của phần tử (trim khoảng trắng)
 */
async function getText(driver, locator) {
  const el = await waitForVisible(driver, locator);
  return (await el.getText()).trim();
}

/**
 * Kiểm tra phần tử có tồn tại không (không throw)
 */
async function elementExists(driver, locator) {
  try {
    const el = await driver.findElement(locator);
    return await el.isDisplayed();
  } catch (_) {
    return false;
  }
}

// ── Tailwind / React đặc thù ────────────────────────────────────

/**
 * Lấy danh sách class CSS của phần tử (để kiểm tra Tailwind class)
 */
async function getClasses(driver, locator) {
  const el = await driver.findElement(locator);
  const classAttr = await el.getAttribute('class');
  return classAttr ? classAttr.split(' ').filter(Boolean) : [];
}

/**
 * Kiểm tra phần tử có Tailwind class nhất định không
 */
async function hasTailwindClass(driver, locator, className) {
  const classes = await getClasses(driver, locator);
  return classes.includes(className);
}

// ── Screenshot ─────────────────────────────────────────────────

/**
 * Chụp ảnh màn hình — tự động đặt tên theo timestamp
 */
async function takeScreenshot(driver, name = 'screenshot') {
  const dir = path.resolve(config.screenshotDir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename  = path.join(dir, `${name}_${timestamp}.png`);
  const image     = await driver.takeScreenshot();

  fs.writeFileSync(filename, image, 'base64');
  console.log(`📸 Screenshot: ${filename}`);
  return filename;
}

// ── Toast / Notification (Tailwind + React Toast) ──────────────

/**
 * Chờ toast notification xuất hiện và lấy nội dung
 * Điều chỉnh selector khớp với thư viện toast của bạn (Sonner, react-hot-toast...)
 */
async function waitForToast(driver, timeout = 8000) {
  const toastSelectors = [
    '[data-sonner-toast]',           // Sonner
    '[class*="Toastify__toast"]',    // react-toastify
    '[data-testid="toast"]',         // custom
    '[role="alert"]',                // generic
  ];

  for (const sel of toastSelectors) {
    try {
      const el = await driver.wait(until.elementLocated(By.css(sel)), timeout / toastSelectors.length);
      if (await el.isDisplayed()) return (await el.getText()).trim();
    } catch (_) { continue; }
  }
  throw new Error('Không tìm thấy toast notification');
}

// ── API Helpers (gọi trực tiếp .NET Core API) ──────────────────

/**
 * Đăng nhập qua API để lấy token (bỏ qua UI khi cần)
 */
async function loginViaApi(email, password) {
  const axios = require('axios');
  const res = await axios.post(`${config.apiBaseUrl}/auth/login`, { email, password });
  return res.data.token || res.data.accessToken;
}

/**
 * Inject JWT token vào localStorage (bỏ qua bước đăng nhập trong test)
 */
async function injectAuthToken(driver, token) {
  await driver.executeScript(`
    localStorage.setItem('token', '${token}');
    localStorage.setItem('accessToken', '${token}');
  `);
  await driver.navigate().refresh();
  await waitForPageReady(driver);
}

module.exports = {
  waitForElement,
  waitForVisible,
  waitForHidden,
  waitForUrl,
  waitForPageReady,
  safeClick,
  fillInput,
  getText,
  elementExists,
  getClasses,
  hasTailwindClass,
  takeScreenshot,
  waitForToast,
  loginViaApi,
  injectAuthToken,
};