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

      console.log('Waiting for search results to load...');
      // Wait for search results with multiple possible selectors
      await Promise.race([
        this.page.waitForSelector('.search-results-container', { timeout: 15000 }),
        this.page.waitForSelector('.search-results__list', { timeout: 15000 }),
        this.page.waitForSelector('[data-view-name="search-results-container"]', { timeout: 15000 }),
        this.page.waitForSelector('.reusable-search__entity-result-list', { timeout: 15000 })
      ]).catch(() => console.log('Initial selector wait timed out, continuing...'));
      
      await wait(5000); // Wait longer for dynamic content to load
      
      // Take a screenshot before extraction for debugging
      await this.takeDebugScreenshot(`before-extraction-${Date.now()}.png`);
      console.log('Screenshot taken before extraction');
      
      // Scroll to load more posts
      console.log('Scrolling to load more posts...');
      let previousHeight;
      let scrollAttempts = 0;
      const maxScrolls = 3;

      while (scrollAttempts < maxScrolls) {
        previousHeight = await this.page.evaluate('document.body.scrollHeight');
        await this.page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await wait(2000);
        
        const currentHeight = await this.page.evaluate('document.body.scrollHeight');
        if (currentHeight === previousHeight) break;
        
        scrollAttempts++;
      }

      console.log('Extracting post data from page...');
      
      // First, let's see what's actually on the page
      const pageInfo = await this.page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          bodyText: document.body.innerText.substring(0, 500),
          hasSearchContainer: !!document.querySelector('.search-results-container'),
          hasSearchList: !!document.querySelector('.search-results__list'),
          hasFeedUpdates: document.querySelectorAll('.feed-shared-update-v2').length,
          hasResultContainers: document.querySelectorAll('li.reusable-search__result-container').length,
          allDivClasses: Array.from(document.querySelectorAll('div[class*="search"]')).slice(0, 10).map(d => d.className)
        };
      });
      
      console.log('Page info:', JSON.stringify(pageInfo, null, 2));
      
      // Extract posts with detailed information using multiple selector strategies
      const posts = await this.page.evaluate((limitCount) => {
        const posts = [];
        
        // Try multiple container selectors
        const containerSelectors = [
          '.feed-shared-update-v2',  // Try without parent first
          '.search-results-container .feed-shared-update-v2',
          '.search-results__list .feed-shared-update-v2',
          '[data-view-name="search-results-container"] .feed-shared-update-v2',
          '.reusable-search__entity-result-list .feed-shared-update-v2',
          'li.reusable-search__result-container',
          '.entity-result',  // Try entity results
          '[data-chameleon-result-urn]',  // Try data attributes
          'div[data-id*="urn:li:activity"]'  // Try activity URNs
        ];
        
        let postElements = [];
        let usedSelector = '';
        
        for (const selector of containerSelectors) {
          postElements = document.querySelectorAll(selector);
          if (postElements.length > 0) {
            console.log(`Found ${postElements.length} posts with selector: ${selector}`);
            usedSelector = selector;
            break;
          } else {
            console.log(`No posts found with selector: ${selector}`);
          }
        }

        if (postElements.length === 0) {
          console.log('No posts found with any selector');
          console.log('Available classes on page:', Array.from(document.querySelectorAll('[class]')).slice(0, 20).map(el => el.className).join(', '));
          return [];
        }

        postElements.forEach((element, index) => {
          try {
            // Extract post text with multiple selectors - more specific to actual post content
            let text = '';
            
            // Helper function to clean extracted text
            const cleanText = (rawText) => {
              if (!rawText) return '';
              
              let cleaned = rawText.trim();
              
              // Filter out common UI text that's not post content
              const unwantedPhrases = [
                'See translation',
                'See more',
                'See less',
                '…see more',
                '... see more',
                'Like\n',
                'Comment\n',
                'Share\n',
                'Send\n',
                'Repost\n',
                'Follow\n',
                'Connect\n',
                'Show all comments',
                'Report this post',
                'Copy link to post',
                'Embed this post'
              ];
              
              // Remove unwanted phrases
              unwantedPhrases.forEach(phrase => {
                cleaned = cleaned.replace(new RegExp(phrase, 'gi'), '');
              });
              
              // Remove multiple consecutive newlines
              cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
              
              // Remove leading/trailing whitespace again
              cleaned = cleaned.trim();
              
              return cleaned;
            };
            
            const textSelectors = [
              '.feed-shared-update-v2__description',
              '.feed-shared-text__text-view',
              '.feed-shared-inline-show-more-text',
              '.update-components-text',
              '.feed-shared-text',
              '.break-words'
            ];
            
            for (const selector of textSelectors) {
              const textElement = element.querySelector(selector);
              if (textElement) {
                // Try to get just the text content, avoiding nested elements
                let rawText = '';
                
                // First try to get direct text nodes only
                const walker = document.createTreeWalker(
                  textElement,
                  NodeFilter.SHOW_TEXT,
                  null,
                  false
                );
                
                let node;
                while (node = walker.nextNode()) {
                  // Skip text from buttons and links
                  const parent = node.parentElement;
                  if (parent && !parent.matches('button, a.app-aware-link[data-control-name]')) {
                    rawText += node.textContent + ' ';
                  }
                }
                
                // If that didn't work, fall back to innerText
                if (!rawText.trim()) {
                  rawText = textElement.innerText;
                }
                
                text = cleanText(rawText);
                
                // Only accept text that's substantial (more than just a few words)
                if (text.length > 20) {
                  break;
                }
              }
            }
            
            // If still no good text, try to get text from the entire post container but clean it
            if (!text || text.length < 20) {
              const contentContainer = element.querySelector('.feed-shared-update-v2__description-wrapper') || 
                                      element.querySelector('.update-components-text-view');
              if (contentContainer) {
                text = cleanText(contentContainer.innerText);
                // Take first substantial paragraph
                const paragraphs = text.split('\n').filter(p => p.trim().length > 20);
                if (paragraphs.length > 0) {
                  text = paragraphs[0];
                }
                text = text.substring(0, 500); // Limit length
              }
            }

            // Extract post URL with multiple strategies
            let url = '';
            const urlSelectors = [
              'a.app-aware-link[href*="/posts/"]',
              'a[href*="/feed/update/"]',
              'a.feed-shared-update-v2__content-link',
              'a[data-control-name="view_post"]',
              'a[href*="activity-"]',
              '.update-components-header a[href*="/posts/"]'
            ];
            
            for (const selector of urlSelectors) {
              const linkElement = element.querySelector(selector);
              if (linkElement && linkElement.href) {
                url = linkElement.href;
                // Clean up URL - remove query parameters
                url = url.split('?')[0];
                break;
              }
            }
            
            // If still no URL, try to find any link with activity ID
            if (!url) {
              const allLinks = element.querySelectorAll('a[href]');
              for (const link of allLinks) {
                if (link.href.includes('/posts/') || link.href.includes('activity-') || link.href.includes('/feed/update/')) {
                  url = link.href.split('?')[0];
                  break;
                }
              }
            }

            // Extract author info
            let author = '';
            const authorSelectors = [
              '.update-components-actor__name span[aria-hidden="true"]',
              '.update-components-actor__name',
              '.feed-shared-actor__name',
              '.entity-result__title-text a span'
            ];
            
            for (const selector of authorSelectors) {
              const authorElement = element.querySelector(selector);
              if (authorElement && authorElement.innerText) {
                author = authorElement.innerText.trim();
                break;
              }
            }

            // Extract timestamp
            let timestamp = '';
            const timeSelectors = [
              '.update-components-actor__sub-description',
              '.feed-shared-actor__sub-description',
              'time',
              '.entity-result__secondary-subtitle'
            ];
            
            for (const selector of timeSelectors) {
              const timeElement = element.querySelector(selector);
              if (timeElement && timeElement.innerText) {
                timestamp = timeElement.innerText.trim();
                break;
              }
            }

            // Extract engagement counts
            const reactionsElement = element.querySelector('.social-details-social-counts__reactions-count');
            const commentsElement = element.querySelector('.social-details-social-counts__comments');
            
            // Only add post if we have at least a URL
            if (url) {
              const postData = {
                id: url.match(/(\d+)$/)?.[1] || `post-${index}-${Date.now()}`,
                text: text.length > 300 ? text.slice(0, 300) + '...' : (text || 'No text available'),
                url,
                author: author || 'Unknown Author',
                timestamp: timestamp || 'Recently',
                engagement: {
                  reactions: reactionsElement ? reactionsElement.innerText.trim() : '0',
                  comments: commentsElement ? commentsElement.innerText.trim() : '0'
                }
              };
              posts.push(postData);
              console.log(`Extracted post ${posts.length}:`);
              console.log(`  Author: ${postData.author}`);
              console.log(`  Text preview: ${postData.text.substring(0, 100)}...`);
              console.log(`  URL: ${url.substring(0, 60)}...`);
            } else {
              console.log(`Skipping post ${index} - no URL found`);
            }
          } catch (err) {
            console.error('Error extracting post data:', err.message);
          }
        });

        return posts.slice(0, limitCount);
      }, limit);

      console.log(`Successfully extracted ${posts.length} posts matching topic: ${topic}`);
      
      if (posts.length === 0) {
        console.log('WARNING: No posts were extracted. Trying alternative extraction method...');
        
        // Alternative method: Extract ALL links that look like posts
        const alternativePosts = await this.page.evaluate(() => {
          const allLinks = Array.from(document.querySelectorAll('a[href]'));
          const postLinks = allLinks.filter(link => 
            link.href.includes('/posts/') || 
            link.href.includes('activity-') ||
            link.href.includes('/feed/update/')
          );
          
          console.log(`Found ${postLinks.length} links that look like posts`);
          
          const uniqueUrls = new Set();
          const posts = [];
          
          postLinks.forEach((link, index) => {
            const url = link.href.split('?')[0];
            if (!uniqueUrls.has(url)) {
              uniqueUrls.add(url);
              
              // Try to find nearby text content
              let text = '';
              let parent = link.closest('article') || link.closest('li') || link.closest('div[class*="update"]');
              if (parent) {
                text = parent.innerText.substring(0, 300);
              }
              
              posts.push({
                id: `alt-${index}`,
                text: text || 'No text available',
                url: url,
                author: 'Unknown Author',
                timestamp: 'Recently',
                engagement: { reactions: '0', comments: '0' }
              });
            }
          });
          
          return posts.slice(0, 10);
        });
        
        if (alternativePosts.length > 0) {
          console.log(`✅ Alternative method found ${alternativePosts.length} posts!`);
          return alternativePosts;
        }
        
        console.log('WARNING: No posts were extracted. This might be due to:');
        console.log('1. LinkedIn DOM structure changes');
        console.log('2. Login issues or rate limiting');
        console.log('3. No matching posts for the topic');
        console.log('4. CAPTCHA or security check');
      }
      
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

  async takeDebugScreenshot(filename = 'debug-screenshot.png') {
    try {
      if (this.page) {
        const screenshotPath = `./linkedin-sessions/${filename}`;
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Debug screenshot saved to: ${screenshotPath}`);
        return screenshotPath;
      }
    } catch (error) {
      console.error('Error taking screenshot:', error.message);
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
