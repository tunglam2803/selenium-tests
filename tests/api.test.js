// tests/api.test.js
// ─────────────────────────────────────────────────────────────
//  KIỂM THỬ TÍCH HỢP API (.NET Core 9.0)
//  Kết hợp: gọi API trực tiếp + kiểm tra phản ánh trên UI
// ─────────────────────────────────────────────────────────────

const { expect }       = require('chai');
const { By }           = require('selenium-webdriver');
const axios            = require('axios');
const { createDriver } = require('../utils/driver');
const helpers           = require('../utils/helpers');
const config            = require('../utils/config');
const LoginPage         = require('../pages/LoginPage');

// Helper: tạo Axios instance với base URL
const api = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 10000,
  validateStatus: () => true, // Không throw lỗi HTTP
});

// ═══════════════════════════════════════════════════════════════
//  SUITE 1 — API HEALTH CHECK (.NET Core)
// ═══════════════════════════════════════════════════════════════
describe('🏥 [API] Health Check — .NET Core Backend', function () {
  this.timeout(15000);

  it('TC-API-01: Backend khởi động và phản hồi', async function () {
    const res = await api.get('/health');
    // .NET Core có sẵn /health endpoint nếu dùng AddHealthChecks()
    expect([200, 204]).to.include(res.status);
  });

  it('TC-API-02: CORS cho phép frontend origin', async function () {
    const res = await axios.get(`${config.apiBaseUrl}/health`, {
      headers: { Origin: config.frontendUrl },
      validateStatus: () => true,
    });

    // Phải có header CORS
    const allowOrigin = res.headers['access-control-allow-origin'];
    expect(allowOrigin).to.be.oneOf([config.frontendUrl, '*']);
  });

  it('TC-API-03: API trả về JSON (Content-Type đúng)', async function () {
    const res = await api.get('/health');
    // Nếu 200, content-type phải là application/json
    if (res.status === 200) {
      const ct = res.headers['content-type'] || '';
      expect(ct).to.include('application/json');
    }
  });
});

// ═══════════════════════════════════════════════════════════════
//  SUITE 2 — AUTH API (.NET Core JWT)
// ═══════════════════════════════════════════════════════════════
describe('🔑 [API] Authentication API', function () {
  this.timeout(15000);

  let adminToken = null;
  let userToken  = null;

  it('TC-API-10: POST /auth/login → 200 + trả về JWT token', async function () {
    const res = await api.post('/auth/login', {
      email:    config.admin.email,
      password: config.admin.password,
    });

    expect(res.status).to.equal(200);
    expect(res.data).to.have.any.keys('token', 'accessToken', 'jwt');

    adminToken = res.data.token || res.data.accessToken || res.data.jwt;
    expect(adminToken).to.be.a('string').and.not.empty;
  });

  it('TC-API-11: POST /auth/login sai mật khẩu → 401', async function () {
    const res = await api.post('/auth/login', {
      email:    config.admin.email,
      password: 'SaiMatKhau@999',
    });

    expect(res.status).to.equal(401);
  });

  it('TC-API-12: POST /auth/login thiếu email → 400 validation error', async function () {
    const res = await api.post('/auth/login', {
      password: config.admin.password,
    });

    expect(res.status).to.equal(400);
  });

  it('TC-API-13: Token hợp lệ → có thể gọi endpoint bảo vệ', async function () {
    if (!adminToken) this.skip();

    const res = await api.get('/users/me', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).to.equal(200);
    expect(res.data.email).to.equal(config.admin.email);
  });

  it('TC-API-14: Không có token → 401 Unauthorized', async function () {
    const res = await api.get('/users/me');
    expect(res.status).to.equal(401);
  });

  it('TC-API-15: Token giả → 401 Unauthorized', async function () {
    const res = await api.get('/users/me', {
      headers: { Authorization: 'Bearer token.gia.mao' },
    });

    expect(res.status).to.equal(401);
  });

  it('TC-API-16: POST /auth/logout → xóa token', async function () {
    if (!adminToken) this.skip();

    const res = await api.post('/auth/logout', {}, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect([200, 204]).to.include(res.status);
  });
});

// ═══════════════════════════════════════════════════════════════
//  SUITE 3 — CRUD API + Phản ánh trên React UI
// ═══════════════════════════════════════════════════════════════
describe('📋 [API + UI] CRUD — Tích hợp API và giao diện React', function () {
  this.timeout(60000);

  let driver, adminToken;
  const createdIds = []; // Lưu ID để cleanup sau

  before(async function () {
    // Lấy token qua API
    try {
      adminToken = await helpers.loginViaApi(config.admin.email, config.admin.password);
    } catch (err) {
      console.warn('Không thể lấy token qua API:', err.message);
    }

    driver = await createDriver();

    // Đăng nhập qua UI
    const loginPage = new LoginPage(driver);
    await loginPage.open();
    await loginPage.loginAndWaitRedirect(config.admin.email, config.admin.password);
  });

  after(async function () {
    // Dọn dẹp dữ liệu test
    for (const id of createdIds) {
      try {
        await api.delete(`/items/${id}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      } catch (_) {}
    }
    await driver.quit();
  });

  afterEach(async function () {
    if (this.currentTest.state === 'failed') {
      await helpers.takeScreenshot(driver, `FAIL_crud_${this.currentTest.title.replace(/\s+/g, '_')}`);
    }
  });

  it('TC-CRUD-01: Tạo item qua API → hiển thị trên UI', async function () {
    if (!adminToken) this.skip();

    // 1. Tạo dữ liệu qua API
    const newItem = {
      name:        `Test Item ${Date.now()}`,
      description: 'Tạo bởi Selenium test',
    };

    const createRes = await api.post('/items', newItem, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(createRes.status).to.be.oneOf([200, 201]);
    const createdId = createRes.data.id;
    createdIds.push(createdId);

    // 2. Mở trang danh sách trên UI
    await driver.get(`${config.frontendUrl}/items`);
    await helpers.waitForPageReady(driver);

    // 3. Kiểm tra item xuất hiện trên UI
    const itemVisible = await helpers.elementExists(driver,
      By.xpath(`//*[contains(text(), "${newItem.name}")]`));

    expect(itemVisible, `Item "${newItem.name}" không hiển thị trên UI`).to.be.true;
  });

  it('TC-CRUD-02: Xóa item qua API → biến mất khỏi UI', async function () {
    if (!adminToken || createdIds.length === 0) this.skip();

    const idToDelete = createdIds[0];

    // 1. Mở trang danh sách
    await driver.get(`${config.frontendUrl}/items`);
    await helpers.waitForPageReady(driver);

    // 2. Xóa qua API
    const deleteRes = await api.delete(`/items/${idToDelete}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(deleteRes.status).to.be.oneOf([200, 204]);
    createdIds.shift();

    // 3. Refresh UI và kiểm tra item đã biến mất
    await driver.navigate().refresh();
    await helpers.waitForPageReady(driver);

    const itemStillVisible = await helpers.elementExists(driver,
      By.css(`[data-id="${idToDelete}"]`));

    expect(itemStillVisible).to.be.false;
  });

  it('TC-CRUD-03: Tạo item qua UI form → API trả về đúng data', async function () {
    if (!adminToken) this.skip();

    const itemName = `UI Item ${Date.now()}`;

    // 1. Tạo qua UI
    await driver.get(`${config.frontendUrl}/items/create`);
    await helpers.waitForPageReady(driver);

    const nameInputExists = await helpers.elementExists(driver,
      By.css('[data-testid="item-name"], input[name="name"]'));

    if (!nameInputExists) {
      console.log('  ℹ️  Không tìm thấy form tạo item — bỏ qua');
      return;
    }

    await helpers.fillInput(driver, By.css('[data-testid="item-name"], input[name="name"]'), itemName);
    await helpers.safeClick(driver, By.css('[data-testid="submit-btn"], button[type="submit"]'));
    await helpers.waitForPageReady(driver);

    // 2. Kiểm tra qua API
    const listRes = await api.get('/items', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(listRes.status).to.equal(200);
    const items = listRes.data.items || listRes.data || [];
    const found = items.find(i => i.name === itemName);
    expect(found, `Item "${itemName}" không thấy trong API response`).to.exist;

    if (found) createdIds.push(found.id);
  });
});

// ═══════════════════════════════════════════════════════════════
//  SUITE 4 — VALIDATION & ERROR HANDLING
// ═══════════════════════════════════════════════════════════════
describe('⚠️ [API] Validation & Error Handling', function () {
  this.timeout(15000);

  let adminToken;

  before(async function () {
    try {
      adminToken = await helpers.loginViaApi(config.admin.email, config.admin.password);
    } catch (_) {}
  });

  it('TC-VAL-01: Tạo item thiếu required field → 400 + chi tiết lỗi', async function () {
    if (!adminToken) this.skip();

    const res = await api.post('/items', {}, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).to.equal(400);
    // .NET Core ModelState validation trả về errors
    expect(res.data).to.have.any.keys('errors', 'title', 'message');
  });

  it('TC-VAL-02: GET item không tồn tại → 404', async function () {
    if (!adminToken) this.skip();

    const res = await api.get('/items/999999999', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).to.equal(404);
  });

  it('TC-VAL-03: Payload quá lớn → 413', async function () {
    if (!adminToken) this.skip();

    const hugePayload = { name: 'x'.repeat(100000) };
    const res = await api.post('/items', hugePayload, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // 413 hoặc 400 (tùy cấu hình .NET)
    expect([400, 413]).to.include(res.status);
  });
});