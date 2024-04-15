const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const dotenv = require("dotenv");
const fs = require("fs");

dotenv.config({
  path: "./config.env",
});

puppeteer.use(StealthPlugin());

const WAIT_TIME = 1000;

const PROXY_USERNAME = process.env.PROXY_USERNAME;
const PROXY_PASSWORD = process.env.PROXY_PASSWORD;

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      // "--proxy-server=https://ro.smartproxy.com:13001",
    ],
  });
  const page = await browser.newPage();

  // Authenticating the proxy server
  // await page.authenticate({ username: PROXY_USERNAME, password: PROXY_PASSWORD });

  await page.goto("https://www.instagram.com/");

  // Decline cookies
  const rejectAllButton = await page.waitForSelector(
    'xpath///button[contains(text(), "Decline optional cookies")]'
  );
  await rejectAllButton.click();

  // Fill in login form
  await page.locator("aria/Phone number, username, or email").fill(process.env.INSTAGRAM_USERNAME);
  await page.locator("aria/Password").fill(process.env.INSTAGRAM_PASSWORD);
  await new Promise((r) => setTimeout(r, 1500));

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

  await new Promise((r) => setTimeout(r, WAIT_TIME));
  const followersContainerPath = "xpath///div[@class='_aano']";

  // Scrolling to the bottom, in order to have all usernames in the DOM
  console.log("Getting followers list...");
  for (let i = 1; i <= Math.floor(Number(followersNum) / 5); i++) {
    await page.waitForSelector(followersContainerPath);
    await page.locator(followersContainerPath).scroll({
      scrollTop: 300 * i,
    });

    await new Promise((r) => setTimeout(r, 800));
  }

  // Getting the usernames and coresponding user ids

  // Opening a new page in which the GET requests will take place
  const dataPage = await browser.newPage();
  const followersList = [];
  for (let i = 1; i <= Number(followersNum); i++) {
    // Getting the username
    const follower = await page.waitForSelector(
      `${followersContainerPath}/div[1]/div/div[${i}]/div/div/div/div[2]/div/div/div/div/div/a`
    );
    const href = await follower.evaluate((el) => el.href);
    const username = href.split("/")[3];

    // Getting user id
    // GET requests in the browser (log in is required)
    const url = `https://www.instagram.com/web/search/topsearch/?query=${username}`;

    const userDoc = await dataPage.goto(url, { waitUntil: "domcontentloaded" });
    const responseBody = await userDoc.text();
    let userData = null;
    try {
      userData = JSON.parse(responseBody);
    } catch (err) {
      console.log(err);
    }
    const userId = userData?.users[0]?.user?.pk ?? "";

    followersList.push({ username, userId });

    // await new Promise((r) => setTimeout(r, 500));
  }

  // Writing to file
  const jsonString = JSON.stringify(followersList, null, 2);

  fs.writeFile("./followers.json", jsonString, (err) => {
    if (err) {
      console.error("Error writing JSON to file:", err);
    } else {
      console.log("Followers list has been saved to followers.json");
    }
  });

  await browser.close();
}

run();

/html/body/div[6]/div[1]/div/div[2]/div/div/div/div/div[2]/div/div/div[3]/div/div/div[680]
