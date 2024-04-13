const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const dotenv = require("dotenv");

dotenv.config({
  path: "./config.env",
});

puppeteer.use(StealthPlugin());

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
    // defaultViewport: null,
    // args: ["--start-maximized"],
  });
  const page = await browser.newPage();

  await page.goto("https://www.instagram.com/");

  const rejectAllButton = await page.waitForSelector(
    'xpath///button[contains(text(), "Decline optional cookies")]'
  );
  await rejectAllButton.click();

  //   const usernameInput = await page.waitForSelector("aria/Phone number, username, or email");
  //   await usernameInput.fill("tbflavian");

  await page.locator("aria/Phone number, username, or email").fill(process.env.INSTAGRAM_USERNAME);
  await page.locator("aria/Password").fill(process.env.INSTAGRAM_PASSWORD);
  await new Promise((r) => setTimeout(r, 1000));
  //  /html/body/div[2]/div/div/div[2]/div/div/div[1]/section/main/article/div[2]/div[1]/div[2]/form/div/div[3]/button
  const loginButton = await page.waitForSelector("text/Log in");
  await new Promise((r) => setTimeout(r, 1000));

  await loginButton.click();
  await page.waitForNavigation();

  console.log("Logged in!");
  const profileButton = await page.waitForSelector(
    "xpath//html/body/div[2]/div/div/div[2]/div/div/div[1]/div[1]/div[1]/div/div/div/div/div[2]/div[8]/div/span/div/a/div"
  );
  new Promise((r) => setTimeout(r, 1000));
  await profileButton.click();
}

run();
