// utils/config.js
const config = {
  // URL ứng dụng - Khớp với cổng 5173 và 49265 trong hình của Lâm
  frontendUrl:  process.env.FRONTEND_URL  || 'http://localhost:5173',
  backendUrl:   process.env.BACKEND_URL   || 'https://localhost:49265',
  apiBaseUrl:   process.env.API_BASE_URL  || 'https://localhost:49265/api',

  // Tài khoản test (Lâm nhớ kiểm tra xem DB đã có user này chưa nhé)
  admin: {
    email:    process.env.TEST_ADMIN_EMAIL    || 'admin@test.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'Admin@123456',
  },

  // Cấu hình trình duyệt để hiển thị
  headless:      false, // Để false để robot hiện lên cho Lâm xem
  timeout:       parseInt(process.env.TIMEOUT || '60000'), // Tăng lên 60s tránh lỗi mạng chậm
  browserWidth:  parseInt(process.env.BROWSER_WIDTH  || '1440'),
  browserHeight: parseInt(process.env.BROWSER_HEIGHT || '900'),

  screenshotDir: './screenshots',
  reportDir:     './reports',
};

module.exports = config;