# 🧪 Bộ Kiểm Thử Selenium

### Stack: .NET Core 9.0 + React + Vite + Tailwind CSS v4

---

## 📁 Cấu Trúc Thư Mục

```
selenium-tests/
├── tests/
│   ├── auth.test.js     ← Kiểm thử xác thực (đăng nhập/xuất/phân quyền)
│   ├── ui.test.js       ← Kiểm thử giao diện React + Tailwind
│   └── api.test.js      ← Kiểm thử tích hợp API .NET Core
├── pages/
│   ├── LoginPage.js     ← Page Object: trang đăng nhập
│   └── DashboardPage.js ← Page Object: trang dashboard
├── utils/
│   ├── config.js        ← Cấu hình môi trường
│   ├── driver.js        ← Khởi tạo Selenium WebDriver
│   └── helpers.js       ← Hàm tiện ích dùng chung
├── screenshots/         ← Ảnh chụp khi test thất bại (tự tạo)
├── reports/             ← Báo cáo HTML (tự tạo)
├── .env.example         ← Mẫu cấu hình môi trường
└── package.json
```

---

## ⚡ Cài Đặt & Khởi Động Nhanh

### Bước 1: Cài dependencies

```bash
cd selenium-tests
npm install
```

### Bước 2: Cấu hình môi trường

```bash
cp .env.example .env
# Mở .env và điền thông tin thực tế của bạn
```

```env  
FRONTEND_URL=http://localhost:5173 # Vite dev server
BACKEND_URL=https://localhost:49265 # .NET Core API
API_BASE_URL=https://localhost:49265/api
    

TEST_ADMIN_EMAIL=admin@yourapp.com
TEST_ADMIN_PASSWORD=Admin@123456

TEST_USER_EMAIL=user@yourapp.com
TEST_USER_PASSWORD=User@123456
```

### Bước 3: Khởi động ứng dụng

```bash
# Terminal 1 — Khởi động .NET Core backend
cd your-backend
dotnet run

# Terminal 2 — Khởi động React + Vite frontend
cd your-frontend
npm run dev
```

### Bước 4: Chạy test

```bash
# Terminal 3 — Chạy kiểm thử
npm test                      # Tất cả test
npm run test:auth             # Chỉ test xác thực
npm run test:ui               # Chỉ test giao diện
npm run test:api              # Chỉ test API
npm run test:headless         # Chạy ẩn (không hiện trình duyệt)
npm run test:all              # Tất cả + tạo báo cáo HTML
```

---

## 🧩 Danh Sách Test Case

### 🔐 Auth Tests (`tests/auth.test.js`)

| Mã    | Mô tả                                | Kỳ vọng                           |
| ----- | ------------------------------------ | --------------------------------- |
| TC-01 | Đăng nhập Admin đúng thông tin       | Redirect về `/dashboard`          |
| TC-02 | Đăng nhập User thường                | Không ở trang login               |
| TC-03 | Sai mật khẩu                         | Hiện thông báo lỗi                |
| TC-04 | Để trống email                       | Validation báo lỗi                |
| TC-05 | Email sai định dạng                  | Không submit                      |
| TC-06 | Để trống cả hai trường               | Không submit                      |
| TC-07 | Toggle hiện/ẩn mật khẩu              | `type` đổi giữa `password`/`text` |
| TC-08 | Đăng nhập sai nhiều lần              | Rate limit / khóa tài khoản       |
| TC-09 | Truy cập `/dashboard` khi chưa login | Redirect về `/login`              |
| TC-10 | Truy cập trang bảo vệ khi chưa login | Redirect về `/login`              |
| TC-11 | Đăng xuất                            | Về trang login                    |
| TC-12 | Sau logout, truy cập dashboard       | Redirect về login                 |
| TC-13 | Sau logout, token bị xóa             | `localStorage` trống              |
| TC-14 | User thường — không thấy menu Admin  | Menu ẩn                           |
| TC-15 | User thường vào `/admin`             | Bị từ chối                        |

### 🎨 UI Tests (`tests/ui.test.js`)

| Mã             | Mô tả                                                   |
| -------------- | ------------------------------------------------------- |
| TC-UI-01       | Đủ phần tử trên form login                              |
| TC-UI-02       | Tiêu đề trang đúng                                      |
| TC-UI-03       | Form trong viewport                                     |
| TC-UI-04       | Responsive mobile 375px                                 |
| TC-UI-05       | Responsive tablet 768px                                 |
| TC-UI-06       | Không lỗi JS trong console                              |
| TC-UI-10..14   | Dashboard: navbar, sidebar, nội dung, scroll, dark mode |
| TC-NAV-01..04  | Navigation, Back button, F5 refresh, 404                |
| TC-A11Y-01..03 | Labels, ARIA, điều hướng bàn phím                       |

### 🔌 API Tests (`tests/api.test.js`)

| Mã             | Mô tả                              |
| -------------- | ---------------------------------- |
| TC-API-01..03  | Backend online, CORS, Content-Type |
| TC-API-10..16  | JWT login/logout, token validation |
| TC-CRUD-01..03 | Tạo/xóa qua API phản ánh trên UI   |
| TC-VAL-01..03  | Validation, 404, payload lớn       |

---

## 🎯 Thêm Selector `data-testid` Vào React App

Để test ổn định, thêm `data-testid` vào các component React:

```jsx
// LoginForm.jsx
<form data-testid="login-form">
  <input data-testid="email-input" type="email" />
  <input data-testid="password-input" type="password" />
  <button data-testid="login-btn" type="submit">Đăng nhập</button>
  <p data-testid="login-error" className="text-red-500">{error}</p>
</form>

// Navbar.jsx
<nav data-testid="navbar">
  <button data-testid="user-avatar" onClick={openMenu}>...</button>
  <button data-testid="logout-btn" onClick={logout}>Đăng xuất</button>
</nav>

// LoadingSpinner.jsx
<div data-testid="loading-spinner" className="animate-spin">...</div>
```

---

## 🔧 Cấu Hình .NET Core cho Test

### Thêm Health Check endpoint

```csharp
// Program.cs
builder.Services.AddHealthChecks();
app.MapHealthChecks("/api/health");
```

### Cấu hình CORS cho localhost

```csharp
builder.Services.AddCors(options => {
    options.AddPolicy("Dev", policy => {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});
app.UseCors("Dev");
```

---

## 🚀 Chạy Trong CI/CD (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Selenium Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET 9
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: "9.0.x"

      - name: Start Backend
        run: |
          cd backend
          dotnet run &
          sleep 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Start Frontend
        run: |
          cd frontend
          npm ci && npm run build
          npx serve -s dist -p 5173 &
          sleep 5

      - name: Run Selenium Tests
        run: |
          cd selenium-tests
          npm ci
          HEADLESS=true npm test
        env:
          FRONTEND_URL: http://localhost:5173
          BACKEND_URL: http://localhost:5000
          TEST_ADMIN_EMAIL: ${{ secrets.TEST_ADMIN_EMAIL }}
          TEST_ADMIN_PASSWORD: ${{ secrets.TEST_ADMIN_PASSWORD }}

      - name: Upload screenshots nếu fail
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: screenshots
          path: selenium-tests/screenshots/
```

---

## 💡 Tips Quan Trọng

1. **Ưu tiên `data-testid`** — Không phụ thuộc vào Tailwind class (class thay đổi khi đổi design)
2. **Tránh `time.sleep`** — Dùng `driver.wait(until...)` để test nhanh và ổn định
3. **Screenshot khi fail** — Đã tích hợp sẵn, xem thư mục `screenshots/`
4. **Chạy độc lập** — Mỗi `describe` suite có `before/after` riêng, không phụ thuộc nhau
5. **Token injection** — `helpers.injectAuthToken()` bỏ qua bước login UI để test nhanh hơn
