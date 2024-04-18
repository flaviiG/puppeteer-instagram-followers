/* eslint-disable no-await-in-loop */
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config({
  path: './config.env',
});

puppeteer.use(StealthPlugin());

const WAIT_TIME = 1400;

const { PROXY_SERVER } = process.env;
const { PROXY_USERNAME } = process.env;
const { PROXY_PASSWORD } = process.env;

// Another account can be used to scrape the followers
// as long as it follows the account to be scraped
const usernameToScrape = process.argv[2];

async function run() {
  const browserArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
  ];

  if (PROXY_SERVER && PROXY_USERNAME && PROXY_PASSWORD) {
    console.log('Proxy server added');
    browserArgs.push(`--proxy-server=${PROXY_SERVER}`);
  }

  const browser = await puppeteer.launch({
    headless: false,
    args: browserArgs,
  });

  // TODO: Do not load images

  const page = await browser.newPage();
  await page.setViewport({
    width: 1024,
    height: 768,
    deviceScaleFactor: 1,
  });
  // Authenticating the proxy server
  await page.authenticate({
    username: PROXY_USERNAME,
    password: PROXY_PASSWORD,
  });

  await page.setRequestInterception(true);

  page.on('request', (req) => {
    if (req.resourceType() === 'image') {
      req.abort();
    } else {
      req.continue();
    }
  });

  await page.goto('https://www.instagram.com/');

  // Decline cookies
  const rejectAllButton = await page.waitForSelector(
    'xpath///button[contains(text(), "Decline optional cookies")]',
  );
  await rejectAllButton.click();

  // Fill in login form
  await page.locator('aria/Phone number, username, or email').fill(process.env.INSTAGRAM_USERNAME);
  await page.locator('aria/Password').fill(process.env.INSTAGRAM_PASSWORD);
  await new Promise((r) => {
    setTimeout(r, WAIT_TIME);
  });

  // Log in
  const loginButton = await page.waitForSelector('text/Log in');
  await new Promise((r) => {
    setTimeout(r, WAIT_TIME);
  });
  await loginButton.click();
  await new Promise((r) => {
    setTimeout(r, WAIT_TIME);
  });

  await page.waitForNavigation();
  console.log('Logged in!');

  await page.goto(`https://www.instagram.com/${usernameToScrape}`);
  await new Promise((r) => {
    setTimeout(r, WAIT_TIME);
  });

  const source = await page.content({ waitUntil: 'domcontentloaded' });

  // Finding the user id in the source
  const regex = /"profilePage_([^"]+)"/;
  const match = source.match(regex);
  const userToScrapeId = match ? match[1] : 'User ID not found';
  console.log('User id:', userToScrapeId);

  const followersNumSpan = await page.waitForSelector(
    `xpath///a[contains(@href, '/${usernameToScrape}/followers/')]/span/span`,
  );
  const followersNum = await followersNumSpan.evaluate((el) => el.textContent);
  console.log('Number of followers:', followersNum);

  // Open followers list
  const followersListButton = await page.waitForSelector('text/followers');
  await new Promise((r) => {
    setTimeout(r, WAIT_TIME);
  });

  const followersSet = new Set();

  page.on('response', async (response) => {
    const url = response.url();

    // Check if the URL matches the one you are interested in
    if (url.includes(`https://www.instagram.com/api/v1/friendships/${userToScrapeId}`)) {
      const responseData = await response.json();
      const followersData = responseData.users;
      if (followersData) {
        followersData.forEach((follower) => {
          console.log(follower.username, follower.pk);
          followersSet.add(JSON.stringify({ username: follower.username, userId: follower.pk }));
        });
      }
    }
  });

  console.log('Getting followers...');

  await followersListButton.click();

  await new Promise((r) => {
    setTimeout(r, 3000);
  });
  const followersContainerPath = "xpath///div[@class='_aano']";

  // Scrolling to the bottom, in order to have all usernames in the DOM
  for (let i = 1; i <= Math.ceil(Number(followersNum) / 5); i += 1) {
    await page.waitForSelector(followersContainerPath);
    await page.locator(followersContainerPath).scroll({
      scrollTop: 300 * i,
    });

    await new Promise((r) => {
      setTimeout(r, 1200);
    });
  }

  await browser.close();

  // Writing to file
  const followersList = Array.from(followersSet).map((user) => JSON.parse(user));
  const jsonString = JSON.stringify(followersList, null, 2);

  fs.writeFile('./followers.json', jsonString, (err) => {
    if (err) {
      console.error('Error writing JSON to file:', err);
    } else {
      console.log('Followers list has been saved to followers.json');
    }
  });
}

run();
