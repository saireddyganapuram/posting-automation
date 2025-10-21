const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Use stealth plugin
puppeteer.use(StealthPlugin());

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class LinkedInAutomation {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async login(email, password) {
    try {
      console.log('Launching browser...');
      this.browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
      });
      
      console.log('Creating new page...');
      this.page = await this.browser.newPage();
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await this.page.setViewport({ width: 1366, height: 768 });
      
      console.log('Navigating to LinkedIn login...');
      await this.page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.page.waitForSelector('#username', { timeout: 10000 });
      
      console.log('Entering credentials...');
      await this.page.type('#username', email, { delay: 100 });
      await this.page.type('#password', password, { delay: 100 });
      await this.page.click('button[type="submit"]');
      
      console.log('Waiting for login...');
      await this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      await wait(2000);
      console.log('Login successful!');
    } catch (error) {
      console.error('Login error:', error.message);
      throw error;
    }
  }

  async likePost(postUrl) {
    try {
      console.log('Navigating to post:', postUrl);
      await this.page.goto(postUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await wait(3000);
      
      console.log('Looking for like button...');
      // Try multiple selectors
      const selectors = [
        'button[aria-label*="Like"]',
        'button[aria-label*="React Like"]',
        'button.react-button__trigger',
        'button[data-control-name="like"]',
        '.social-actions-button[aria-label*="Like"]'
      ];
      
      for (const selector of selectors) {
        const button = await this.page.$(selector);
        if (button) {
          console.log('Found like button with selector:', selector);
          await button.click();
          await wait(2000);
          console.log('Post liked successfully!');
          return true;
        }
      }
      
      console.log('Like button not found with any selector');
      return false;
    } catch (error) {
      console.error('Like post error:', error.message);
      throw error;
    }
  }

  async commentOnPost(postUrl, comment) {
    await this.page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await wait(2000);
    
    const commentButton = await this.page.$('button[aria-label*="Comment"]');
    if (commentButton) {
      await commentButton.click();
      await wait(1000);
    }
    
    const editor = await this.page.$('.ql-editor');
    if (editor) {
      await editor.click();
      await this.page.keyboard.type(comment, { delay: 50 });
      await wait(1000);
      
      const submitButton = await this.page.$('button.comments-comment-box__submit-button--cr');
      if (submitButton) {
        await submitButton.click();
        await wait(2000);
        return true;
      }
    }
    return false;
  }

  async sharePost(postUrl, commentary = '') {
    await this.page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await wait(2000);
    
    const shareButton = await this.page.$('button[aria-label*="Share"]');
    if (shareButton) {
      await shareButton.click();
      await wait(1000);
      
      const repostButton = await this.page.$('button[aria-label*="Repost"]');
      if (repostButton) {
        await repostButton.click();
        await wait(1000);
        
        if (commentary) {
          const editor = await this.page.$('.ql-editor');
          if (editor) {
            await editor.click();
            await this.page.keyboard.type(commentary, { delay: 50 });
            await wait(1000);
          }
        }
        
        const postButton = await this.page.$('button[aria-label*="Post"]');
        if (postButton) {
          await postButton.click();
          await wait(2000);
          return true;
        }
      }
    }
    return false;
  }

  async close() {
    try {
      if (this.browser) {
        console.log('Closing browser...');
        await this.browser.close();
        console.log('Browser closed');
      }
    } catch (error) {
      console.error('Error closing browser:', error.message);
    }
  }
}

module.exports = LinkedInAutomation;
