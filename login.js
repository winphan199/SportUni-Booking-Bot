const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false }); 
  const page = await browser.newPage();

  try {
    await page.goto('https://www.tuni.fi/sportuni/omasivu/?page=myevents&lang=en');

    await page.type('#username', 'enter your user name here'); 
    await page.type('#password', 'enter your password here'); 

    await page.click('#login-button'); 
    await page.waitForNavigation();

    const mfaElement = await page.$('#mfa-input'); 
    if (mfaElement) {
      const mfaCode = await getUserInput('Enter MFA code: '); 
      await page.type('#mfa-input', mfaCode); 
      await page.click('#mfa-submit-button'); 
      await page.waitForNavigation(); 
    }

    // Get the cookies after successful login
    const cookies = await page.cookies();
    console.log(cookies);

  } catch (error) {
    console.error('An error occurred:', error);
  } 
  finally {
    await browser.close();
  }
})();

// Implement a function to get user input for MFA code
async function getUserInput(prompt) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    readline.question(prompt, (userInput) => {
      readline.close();
      resolve(userInput);
    });
  });
}
