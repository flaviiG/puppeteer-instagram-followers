/* eslint-disable no-await-in-loop */
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config({
  path: './config.env',
});

puppeteer.use(StealthPlugin());

const WAIT_TIME = 1000;

const { PROXY_USERNAME } = process.env;
const { PROXY_PASSWORD } = process.env;

// Another account can be used to scrape the followers
// as long as it follows the account to be scraped
const usernameToScrape = 'tbflavian';

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
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

  await page.waitForNavigation();
  console.log('Logged in!');

  await page.goto(`https://www.instagram.com/${usernameToScrape}`);
  await new Promise((r) => {
    setTimeout(r, WAIT_TIME);
  });

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
  await followersListButton.click();

  await new Promise((r) => {
    setTimeout(r, WAIT_TIME);
  });
  const followersContainerPath = "xpath///div[@class='_aano']";

  // Scrolling to the bottom, in order to have all usernames in the DOM
  console.log('Getting followers list...');
  for (let i = 1; i <= Math.ceil(Number(followersNum) / 5); i += 1) {
    await page.waitForSelector(followersContainerPath);
    await page.locator(followersContainerPath).scroll({
      scrollTop: 300 * i,
    });

    await new Promise((r) => {
      setTimeout(r, 600);
    });
  }

  // Getting usernames
  const usernameList = [];
  for (let i = 1; i <= Number(followersNum); i += 1) {
    // Getting the username
    try {
      const follower = await page.waitForSelector(
        `${followersContainerPath}/div[1]/div/div[${i}]/div/div/div/div[2]/div/div/div/div/div/a`,
      );
      const href = await follower.evaluate((el) => el.href);
      const username = href.split('/')[3];
      usernameList.push(username);
    } catch (err) {
      console.log('End of username list');
      break;
    }
  }

  await browser.close();

  // Open another browser, so that the user is not logged in, with a proxy to bypass rate limit
  const browser2 = await puppeteer.launch({
    headless: false,
    args: ['--proxy-server=https://gate.smartproxy.com:7000'],
  });
  const idPage = await browser2.newPage();

  // Authenticating the proxy server
  await idPage.authenticate({ username: PROXY_USERNAME, password: PROXY_PASSWORD });

  // Getting user ids
  const followersList = [];
  for (let i = 0; i < usernameList.length; i += 1) {
    const username = usernameList[i];
    const url = `https://www.instagram.com/${username}`;
    await idPage.goto(url, { waitUntil: 'domcontentloaded' });
    const source = await idPage.content({ waitUntil: 'domcontentloaded' });

    // Finding the user id in the source
    const regex = /"profilePage_([^"]+)"/;
    const match = source.match(regex);
    const userId = match ? match[1] : 'User ID not found';

    followersList.push({ username, userId });
  }

  await browser2.close();

  // Writing to file
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
