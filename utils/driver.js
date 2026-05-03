// utils/driver.js
const { Builder }       = require('selenium-webdriver');
const chrome            = require('selenium-webdriver/chrome');
const config            = require('./config');

async function createDriver(headless = config.headless) {
  const options = new chrome.Options();

  // Chế độ chạy
  if (headless) {
    options.addArguments('--headless=new');
  } else {
    options.addArguments('--start-maximized'); // Mở to màn hình cho dễ nhìn
  }

  // Cấu hình giúp Selenium ổn định hơn trên máy Lâm
  options.addArguments(`--window-size=${config.browserWidth},${config.browserHeight}`);
  options.addArguments('--ignore-certificate-errors');  // Bỏ qua lỗi SSL cổng 49265
  options.addArguments('--allow-insecure-localhost');   // Chấp nhận localhost https
  options.addArguments('--disable-blink-features=AutomationControlled'); // Giảm khả năng bị web chặn bot
  options.addArguments('--lang=vi-VN');

  // Tắt log thừa
  options.addArguments('--log-level=3');
  options.excludeSwitches(['enable-logging']);

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  // Thiết lập thời gian chờ linh hoạt
  await driver.manage().setTimeouts({
    implicit:   5000,  // Chờ 5s nếu không tìm thấy phần tử ngay lập tức
    pageLoad:   30000, 
    script:     10000,
  });

  return driver;
}

module.exports = { createDriver };