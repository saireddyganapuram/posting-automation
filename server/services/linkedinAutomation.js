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

  async searchPosts(topic, limit = 10) {
    try {
      console.log('Searching for posts about:', topic);
      await this.page.goto(
        `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(topic)}&sortBy=RECENT`,
        { waitUntil: 'networkidle2', timeout: 30000 }
      );

      // Wait for initial content load
      await this.page.waitForSelector('.search-results-container', { timeout: 10000 });
      
      // Scroll to load more posts
      let previousHeight;
      let scrollAttempts = 0;
      const maxScrolls = 3;

      while (scrollAttempts < maxScrolls) {
        previousHeight = await this.page.evaluate('document.body.scrollHeight');
        await this.page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await wait(2000); // Use the wait helper function
        
        const currentHeight = await this.page.evaluate('document.body.scrollHeight');
        if (currentHeight === previousHeight) break;
        
        scrollAttempts++;
      }

      // Extract posts with detailed information
      const posts = await this.page.evaluate(() => {
        const posts = [];
        const postElements = document.querySelectorAll('.search-results-container .feed-shared-update-v2');

        postElements.forEach((element) => {
          try {
            // Extract post text
            const textElement = element.querySelector('.feed-shared-text-view span');
            const text = textElement ? textElement.innerText.trim() : '';

            // Extract post link
            const linkElement = element.querySelector('a.app-aware-link[href*="/posts/"]') || 
                              element.querySelector('a.feed-shared-update-v2__content-link');
            const url = linkElement ? linkElement.href : '';

            // Extract author info
            const authorElement = element.querySelector('.update-components-actor__name');
            const author = authorElement ? authorElement.innerText.trim() : '';

            // Extract timestamp if available
            const timeElement = element.querySelector('.update-components-actor__sub-description');
            const timestamp = timeElement ? timeElement.innerText.trim() : '';

            // Extract engagement counts if available
            const reactions = element.querySelector('.social-details-social-counts__reactions-count');
            const comments = element.querySelector('.social-details-social-counts__comments');
            
            if (url && text) {
              posts.push({
                id: url.match(/(\d+)$/)?.[1] || Date.now().toString(),
                text: text.length > 300 ? text.slice(0, 300) + '...' : text,
                url,
                author,
                timestamp,
                engagement: {
                  reactions: reactions ? reactions.innerText.trim() : '0',
                  comments: comments ? comments.innerText.trim() : '0'
                }
              });
            }
          } catch (err) {
            console.error('Error extracting post data:', err);
          }
        });

        return posts.slice(0, 10); // Limit to 10 most relevant posts
      });

      console.log(`Found ${posts.length} posts matching topic: ${topic}`);
      return posts;

    } catch (error) {
      console.error('Error searching posts:', error);
      throw new Error(`Failed to search posts: ${error.message}`);
    }
  }

  async engageWithPosts(posts, actions = { like: true, comment: false }, commentText = '') {
    const results = [];
    
    for (const post of posts) {
      try {
        await this.page.goto(post.url, { waitUntil: 'networkidle2', timeout: 30000 });
        await this.page.evaluate(() => new Promise(r => setTimeout(r, 2000)));

        if (actions.like) {
          const liked = await this.likePost(post.url);
          if (liked) results.push({ url: post.url, action: 'like', success: true });
        }

        if (actions.comment && commentText) {
          const commented = await this.commentOnPost(post.url, commentText);
          if (commented) results.push({ url: post.url, action: 'comment', success: true });
        }

        // Random delay between posts to appear more human
        await this.page.evaluate(() => 
          new Promise(r => setTimeout(r, Math.random() * 3000 + 2000))
        );

      } catch (error) {
        console.error(`Failed to engage with post ${post.url}:`, error);
        results.push({ url: post.url, success: false, error: error.message });
      }
    }
    
    return results;
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
