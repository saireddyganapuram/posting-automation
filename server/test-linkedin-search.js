/**
 * LinkedIn Search Diagnostic Tool
 * 
 * This script helps diagnose why posts aren't being extracted.
 * It will:
 * 1. Login to LinkedIn
 * 2. Navigate to search results
 * 3. Take screenshots
 * 4. Print DOM structure information
 * 5. Try to extract posts with different methods
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function diagnosticSearch() {
  let browser;
  
  try {
    console.log('=== LinkedIn Search Diagnostic Tool ===\n');
    
    // Get credentials from environment or prompt
    const email = process.env.LINKEDIN_EMAIL || 'ganapuramsaireddy@gmail.com';
    const password = process.env.LINKEDIN_PASSWORD || 'YOUR_PASSWORD_HERE';
    const searchTopic = process.argv[2] || 'artificial intelligence';
    
    console.log(`Email: ${email}`);
    console.log(`Search Topic: ${searchTopic}\n`);
    
    // Launch browser
    console.log('1. Launching browser...');
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    
    // Login
    console.log('2. Logging into LinkedIn...');
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#username');
    await page.type('#username', email, { delay: 100 });
    await page.type('#password', password, { delay: 100 });
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await wait(3000);
    console.log('✅ Login successful\n');
    
    // Navigate to search
    console.log('3. Navigating to search results...');
    const searchUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(searchTopic)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(5000);
    console.log('✅ Search page loaded\n');
    
    // Take screenshot
    console.log('4. Taking screenshot...');
    const screenshotPath = path.join(__dirname, 'linkedin-sessions', `diagnostic-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`✅ Screenshot saved: ${screenshotPath}\n`);
    
    // Analyze page structure
    console.log('5. Analyzing page structure...');
    const analysis = await page.evaluate(() => {
      const results = {
        pageTitle: document.title,
        pageUrl: window.location.href,
        bodyTextSample: document.body.innerText.substring(0, 300),
        
        // Check for common containers
        containers: {
          'search-results-container': document.querySelectorAll('.search-results-container').length,
          'search-results__list': document.querySelectorAll('.search-results__list').length,
          'reusable-search__entity-result-list': document.querySelectorAll('.reusable-search__entity-result-list').length,
          'feed-shared-update-v2': document.querySelectorAll('.feed-shared-update-v2').length,
          'entity-result': document.querySelectorAll('.entity-result').length,
          'reusable-search__result-container': document.querySelectorAll('li.reusable-search__result-container').length
        },
        
        // Find all divs with 'search' in class name
        searchRelatedDivs: Array.from(document.querySelectorAll('div[class*="search"]'))
          .slice(0, 15)
          .map(d => d.className),
        
        // Find all links that might be posts
        postLikeLinks: {
          'posts': Array.from(document.querySelectorAll('a[href*="/posts/"]')).length,
          'activity': Array.from(document.querySelectorAll('a[href*="activity-"]')).length,
          'feed-update': Array.from(document.querySelectorAll('a[href*="/feed/update/"]')).length
        },
        
        // Sample of actual post URLs found
        sampleUrls: Array.from(document.querySelectorAll('a[href]'))
          .filter(a => a.href.includes('/posts/') || a.href.includes('activity-'))
          .slice(0, 5)
          .map(a => a.href)
      };
      
      return results;
    });
    
    console.log('\n=== PAGE ANALYSIS ===');
    console.log(JSON.stringify(analysis, null, 2));
    console.log('\n');
    
    // Try different extraction methods
    console.log('6. Testing extraction methods...\n');
    
    // Method 1: Standard selectors
    console.log('Method 1: Standard container selectors');
    const method1 = await page.evaluate(() => {
      const selectors = [
        '.feed-shared-update-v2',
        '.search-results-container .feed-shared-update-v2',
        'li.reusable-search__result-container',
        '.entity-result'
      ];
      
      const results = {};
      selectors.forEach(sel => {
        results[sel] = document.querySelectorAll(sel).length;
      });
      return results;
    });
    console.log('Results:', method1);
    console.log('');
    
    // Method 2: Link extraction
    console.log('Method 2: Direct link extraction');
    const method2 = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      const postLinks = allLinks.filter(link => 
        link.href.includes('/posts/') || 
        link.href.includes('activity-') ||
        link.href.includes('/feed/update/')
      );
      
      const uniqueUrls = [...new Set(postLinks.map(l => l.href.split('?')[0]))];
      
      return {
        totalLinks: allLinks.length,
        postLinks: postLinks.length,
        uniquePostUrls: uniqueUrls.length,
        sampleUrls: uniqueUrls.slice(0, 5)
      };
    });
    console.log('Results:', JSON.stringify(method2, null, 2));
    console.log('');
    
    // Method 3: Article/Post elements
    console.log('Method 3: Article/semantic elements');
    const method3 = await page.evaluate(() => {
      return {
        articles: document.querySelectorAll('article').length,
        'data-id-activity': document.querySelectorAll('[data-id*="activity"]').length,
        'data-urn': document.querySelectorAll('[data-urn]').length,
        'role-article': document.querySelectorAll('[role="article"]').length
      };
    });
    console.log('Results:', method3);
    console.log('');
    
    // Save full HTML for manual inspection
    console.log('7. Saving page HTML...');
    const html = await page.content();
    const htmlPath = path.join(__dirname, 'linkedin-sessions', `page-source-${Date.now()}.html`);
    fs.writeFileSync(htmlPath, html);
    console.log(`✅ HTML saved: ${htmlPath}\n`);
    
    console.log('=== DIAGNOSTIC COMPLETE ===');
    console.log('\nNext steps:');
    console.log('1. Check the screenshot to see what LinkedIn is showing');
    console.log('2. Review the page analysis above');
    console.log('3. If Method 2 found URLs, the alternative extraction should work');
    console.log('4. If no URLs found, LinkedIn might be showing CAPTCHA or rate limiting');
    console.log('5. Check the saved HTML file for manual inspection\n');
    
    // Keep browser open for manual inspection
    console.log('Browser will stay open for 30 seconds for manual inspection...');
    await wait(30000);
    
  } catch (error) {
    console.error('Error during diagnostic:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
}

// Run diagnostic
diagnosticSearch().catch(console.error);
