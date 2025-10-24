const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');

// Use stealth plugin
puppeteer.use(StealthPlugin());

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class LinkedInAutomation {
  constructor(userId = 'default') {
    this.browser = null;
    this.page = null;
    this.userId = userId;
    this.sessionDir = path.join(__dirname, '../linkedin-sessions', userId);
  }

  async initBrowser() {
    try {
      if (!fs.existsSync(this.sessionDir)) {
        fs.mkdirSync(this.sessionDir, { recursive: true });
      }
      
      console.log('Launching browser with session persistence...');
      this.browser = await puppeteer.launch({
        headless: false,
        userDataDir: this.sessionDir,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
      });
      
      console.log('Creating new page...');
      this.page = await this.browser.newPage();
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await this.page.setViewport({ width: 1366, height: 768 });
      
      console.log('Checking login status...');
      await this.page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await wait(2000);
      
      const currentUrl = this.page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('/checkpoint')) {
        console.log('Please log in manually in the browser window...');
        console.log('Waiting for login (60 seconds)...');
        await wait(60000);
      }
      
      console.log('Browser initialized');
    } catch (error) {
      console.error('Browser init error:', error.message);
      throw error;
    }
  }

  async login(email, password) {
    try {
      // Create session directory if it doesn't exist
      if (!fs.existsSync(this.sessionDir)) {
        fs.mkdirSync(this.sessionDir, { recursive: true });
      }
      
      console.log('Launching browser with session persistence...');
      this.browser = await puppeteer.launch({
        headless: false,
        userDataDir: this.sessionDir,  // Persist session
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
      });
      
      console.log('Creating new page...');
      this.page = await this.browser.newPage();
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await this.page.setViewport({ width: 1366, height: 768 });
      
      // Check if already logged in
      console.log('Checking if already logged in...');
      await this.page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await wait(3000);
      
      const currentUrl = this.page.url();
      if (currentUrl.includes('/feed') || currentUrl.includes('/in/')) {
        console.log('Already logged in! Using existing session.');
        return true;
      }
      
      // Not logged in, proceed with login
      console.log('Not logged in, navigating to login page...');
      await this.page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      await wait(2000);
      const usernameField = await this.page.$('#username');
      if (usernameField) {
        console.log('Entering credentials...');
        await this.page.type('#username', email, { delay: 100 });
        await wait(500);
        await this.page.type('#password', password, { delay: 100 });
        await wait(500);
        
        console.log('Clicking sign in button...');
        await Promise.all([
          this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
          this.page.click('button[type="submit"]')
        ]);
        
        await wait(5000);
        
        // Check if login was successful
        const finalUrl = this.page.url();
        if (finalUrl.includes('/feed') || finalUrl.includes('/in/')) {
          console.log('Login successful! Session saved.');
          return true;
        } else if (finalUrl.includes('/checkpoint')) {
          console.log('LinkedIn security checkpoint detected. Please complete verification manually.');
          await wait(30000); // Wait 30 seconds for manual verification
          return true;
        } else {
          console.log('Login may have failed. Current URL:', finalUrl);
          return false;
        }
      } else {
        console.log('Already on logged in page.');
        return true;
      }
    } catch (error) {
      console.error('Login error:', error.message);
      throw error;
    }
  }

  async likePost(postUrl) {
    try {
      const cleanUrl = postUrl.replace(/&amp;/g, '&');
      console.log('Navigating to post:', cleanUrl);
      
      await this.page.goto(cleanUrl, { waitUntil: 'load', timeout: 60000 }).catch(err => {
        throw new Error(`Navigation failed: ${err.message}`);
      });
      await wait(3000);
      
      console.log('Looking for like button...');
      const selectors = [
        'button[aria-label^="React Like"]',
        'button[aria-label^="Like"]',
        'button.reactions-react-button',
        'button.social-actions-button--reaction',
        'button[data-test-icon="thumbs-up-outline-medium"]',
        'button.react-button__trigger'
      ];
      
      for (const selector of selectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 2000 });
          const button = await this.page.$(selector);
          if (button) {
            console.log('Found like button with selector:', selector);
            await button.click();
            await wait(2000);
            console.log('Post liked successfully!');
            return true;
          }
        } catch (e) {
          continue;
        }
      }
      
      console.log('Like button not found, trying XPath...');
      const xpathSelectors = [
        '//button[contains(@aria-label, "Like")]',
        '//button[contains(@aria-label, "React Like")]',
        '//button[contains(., "Like")]'
      ];
      
      for (const xpath of xpathSelectors) {
        try {
          const [button] = await this.page.$x(xpath);
          if (button) {
            console.log('Found like button with XPath:', xpath);
            await button.click();
            await wait(2000);
            console.log('Post liked successfully!');
            return true;
          }
        } catch (e) {
          continue;
        }
      }
      
      throw new Error('Like button not found - LinkedIn may have changed their UI');
    } catch (error) {
      console.error('Like post error:', error.message);
      throw error;
    }
  }

  async commentOnPost(postUrl, comment) {
    try {
      const cleanUrl = postUrl.replace(/&amp;/g, '&');
      console.log('Navigating to post for comment:', cleanUrl);
      await this.page.goto(cleanUrl, { waitUntil: 'load', timeout: 60000 });
      await wait(3000);
      
      console.log('Looking for comment button...');
      const commentSelectors = [
        'button[aria-label*="Comment"]',
        'button.comment-button',
        'button[data-test-icon="comment-medium"]'
      ];
      
      let commentButton;
      for (const selector of commentSelectors) {
        commentButton = await this.page.$(selector);
        if (commentButton) {
          console.log('Found comment button:', selector);
          break;
        }
      }
      
      if (!commentButton) throw new Error('Comment button not found');
      
      await commentButton.click();
      await wait(2000);
      
      console.log('Looking for comment editor...');
      const editorSelectors = [
        '.ql-editor',
        'div[role="textbox"]',
        '.comments-comment-box__form textarea',
        'div[contenteditable="true"]'
      ];
      
      let editor;
      for (const selector of editorSelectors) {
        editor = await this.page.$(selector);
        if (editor) {
          console.log('Found editor:', selector);
          break;
        }
      }
      
      if (!editor) throw new Error('Comment editor not found');
      
      await editor.click();
      await wait(500);
      await this.page.keyboard.type(comment, { delay: 50 });
      await wait(1000);
      
      console.log('Looking for submit button...');
      const submitSelectors = [
        'button.comments-comment-box__submit-button--cr',
        'button[type="submit"]',
        'button.comments-comment-box__submit-button'
      ];
      
      let submitButton;
      for (const selector of submitSelectors) {
        submitButton = await this.page.$(selector);
        if (submitButton) {
          console.log('Found submit button:', selector);
          break;
        }
      }
      
      if (!submitButton) throw new Error('Submit button not found');
      
      await submitButton.click();
      await wait(3000);
      console.log('Comment posted successfully');
      return true;
    } catch (error) {
      console.error('Comment error:', error.message);
      throw error;
    }
  }

  async sharePost(postUrl, commentary = '') {
    try {
      const cleanUrl = postUrl.replace(/&amp;/g, '&');
      console.log('Navigating to post for share:', cleanUrl);
      await this.page.goto(cleanUrl, { waitUntil: 'load', timeout: 60000 });
      await wait(3000);
      
      console.log('Looking for share button...');
      const shareSelectors = [
        'button[aria-label*="Share"]',
        'button[aria-label*="Repost"]',
        'button.share-button'
      ];
      
      let shareButton;
      for (const selector of shareSelectors) {
        shareButton = await this.page.$(selector);
        if (shareButton) {
          console.log('Found share button:', selector);
          break;
        }
      }
      
      if (!shareButton) throw new Error('Share button not found');
      
      await shareButton.click();
      await wait(2000);
      
      console.log('Looking for repost option...');
      const repostSelectors = [
        'button[aria-label*="Repost"]',
        'div[role="menuitem"]',
        'button:has-text("Repost")'
      ];
      
      let repostButton;
      for (const selector of repostSelectors) {
        repostButton = await this.page.$(selector);
        if (repostButton) {
          console.log('Found repost button:', selector);
          break;
        }
      }
      
      if (!repostButton) throw new Error('Repost button not found');
      
      await repostButton.click();
      await wait(2000);
      
      if (commentary) {
        console.log('Adding commentary...');
        const editor = await this.page.$('.ql-editor');
        if (editor) {
          await editor.click();
          await wait(500);
          await this.page.keyboard.type(commentary, { delay: 50 });
          await wait(1000);
        }
      }
      
      console.log('Looking for post button...');
      const postSelectors = [
        'button[aria-label*="Post"]',
        'button[type="submit"]',
        'button.share-actions__primary-action'
      ];
      
      let postButton;
      for (const selector of postSelectors) {
        postButton = await this.page.$(selector);
        if (postButton) {
          console.log('Found post button:', selector);
          break;
        }
      }
      
      if (!postButton) throw new Error('Post button not found');
      
      await postButton.click();
      await wait(3000);
      console.log('Post shared successfully');
      return true;
    } catch (error) {
      console.error('Share error:', error.message);
      throw error;
    }
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
