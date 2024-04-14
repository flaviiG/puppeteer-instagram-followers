const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const dotenv = require("dotenv");
const fs = require("fs");

dotenv.config({
  path: "./config.env",
});

puppeteer.use(StealthPlugin());

const WAIT_TIME = 800;

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
    // defaultViewport: null,
    args: [
      //   "--start-maximized",
      "--proxy-server=http=brd.superproxy.io:22225",
      "--proxy-auth=brd-customer-hl_d8fb0978-zone-isp_proxy1:8kpzm52uuy6p",
    ],
  });
  const page = await browser.newPage();

  await page.goto("https://www.instagram.com/");

  // Decline cookies
  const rejectAllButton = await page.waitForSelector(
    'xpath///button[contains(text(), "Decline optional cookies")]'
  );
  await rejectAllButton.click();

  //   const usernameInput = await page.waitForSelector("aria/Phone number, username, or email");
  //   await usernameInput.fill("tbflavian");

  // Fill in login form
  await page.locator("aria/Phone number, username, or email").fill(process.env.INSTAGRAM_USERNAME);
  await page.locator("aria/Password").fill(process.env.INSTAGRAM_PASSWORD);
  await new Promise((r) => setTimeout(r, WAIT_TIME));

  // Log in
  const loginButton = await page.waitForSelector("text/Log in");
  await new Promise((r) => setTimeout(r, WAIT_TIME));
  await loginButton.click();

  await page.waitForNavigation();
  console.log("Logged in!");

  // Navigate to profile page
  const profileButton = await page.waitForSelector(
    "xpath//html/body/div[2]/div/div/div[2]/div/div/div[1]/div[1]/div[1]/div/div/div/div/div[2]/div[8]/div/span/div/a/div"
  );
  new Promise((r) => setTimeout(r, WAIT_TIME));
  await profileButton.click();

  const followersNumSpan = await page.waitForSelector(
    `xpath///a[contains(@href, '/${process.env.INSTAGRAM_USERNAME}/followers/')]/span/span`
  );
  const followersNum = await followersNumSpan.evaluate((el) => el.textContent);
  console.log("Number of followers:", followersNum);

  // Open followers list
  const followersListButton = await page.waitForSelector("text/followers");
  await new Promise((r) => setTimeout(r, WAIT_TIME));
  await followersListButton.click();

  //   /html/body/div[7]/div[1]/div/div[2]/div/div/div/div/div[2]/div/div/div[3]/div[1]/div/div[1]/div/div/div/div[2]/div/div/div/div/div/a/div/div
  await new Promise((r) => setTimeout(r, WAIT_TIME));
  const followersContainerPath = "xpath///div[@class='_aano']";

  // Getting all followers
  console.log("Getting followers list...");
  for (let i = 1; i <= Math.floor(Number(followersNum) / 5); i++) {
    await page.waitForSelector(followersContainerPath);
    await page.locator(followersContainerPath).scroll({
      scrollTop: 300 * i,
    });
    // await lastFollowerFromBatch.scrollIntoView();
    await new Promise((r) => setTimeout(r, WAIT_TIME));
    // const href = await lastFollowerFromBatch.evaluate((el) => el.href);
    // console.log(href);
  }

  const followersList = [];
  for (let i = 1; i <= Number(followersNum); i++) {
    const follower = await page.waitForSelector(
      `${followersContainerPath}/div[1]/div/div[${i}]/div/div/div/div[2]/div/div/div/div/div/a`
    );
    const href = await follower.evaluate((el) => el.href);
    const username = href.split("/")[3];

    // Getting user id
    const url = `https://www.instagram.com/web/search/topsearch/?query=${username}`;

    let userId = "";
    // TODO: get the user id of each follower
    // GET requests in the browser (log in is required)

    followersList.push({ username, userId });
  }

  const jsonString = JSON.stringify(followersList, null, 2);

  fs.writeFile("./followers.json", jsonString, (err) => {
    if (err) {
      console.error("Error writing JSON to file:", err);
    } else {
      console.log("JSON data has been saved to output.json");
    }
  });
}

run();
