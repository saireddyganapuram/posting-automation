# LinkedIn DOM Selectors Reference

## 🎯 Quick Reference for Updating Selectors

If LinkedIn changes their DOM structure and posts stop being extracted, use this guide to update the selectors.

---

## 🔍 How to Find New Selectors

### Method 1: Browser DevTools (Recommended)

1. Open LinkedIn in Chrome
2. Search for a topic: `https://www.linkedin.com/search/results/content/?keywords=YOUR_TOPIC`
3. Right-click on a post → **Inspect**
4. Find the parent container element
5. Look for unique class names or data attributes
6. Update the selectors in `linkedinAutomation.js`

### Method 2: Use the Debug Screenshot

1. Run a search that returns 0 posts
2. Check `server/linkedin-sessions/search-debug-[timestamp].png`
3. See what's actually on the page
4. Use Method 1 to inspect the live page

---

## 📦 Current Selectors (as of 2025)

### Post Container Selectors
```javascript
const containerSelectors = [
  '.search-results-container .feed-shared-update-v2',
  '.search-results__list .feed-shared-update-v2',
  '[data-view-name="search-results-container"] .feed-shared-update-v2',
  '.reusable-search__entity-result-list .feed-shared-update-v2',
  'li.reusable-search__result-container'
];
```

**What to look for:**
- Main search results container
- Individual post/update containers
- List items containing posts

---

### Post URL Selectors
```javascript
const urlSelectors = [
  'a.app-aware-link[href*="/posts/"]',
  'a[href*="/feed/update/"]',
  'a.feed-shared-update-v2__content-link',
  'a[data-control-name="view_post"]',
  'a[href*="activity-"]',
  '.update-components-header a[href*="/posts/"]'
];
```

**What to look for:**
- Links containing `/posts/`
- Links containing `/feed/update/`
- Links containing `activity-`
- Links with `data-control-name` attributes

**Fallback strategy:**
```javascript
// If no specific selector works, scan all links
const allLinks = element.querySelectorAll('a[href]');
for (const link of allLinks) {
  if (link.href.includes('/posts/') || 
      link.href.includes('activity-') || 
      link.href.includes('/feed/update/')) {
    url = link.href.split('?')[0];
    break;
  }
}
```

---

### Post Text Selectors
```javascript
const textSelectors = [
  '.feed-shared-text__text-view span[dir="ltr"]',
  '.feed-shared-text-view span',
  '.feed-shared-inline-show-more-text',
  '.feed-shared-text',
  '.break-words'
];
```

**What to look for:**
- Main post content area
- Text spans with direction attributes
- "Show more" text containers

---

### Author Name Selectors
```javascript
const authorSelectors = [
  '.update-components-actor__name span[aria-hidden="true"]',
  '.update-components-actor__name',
  '.feed-shared-actor__name',
  '.entity-result__title-text a span'
];
```

**What to look for:**
- Actor/author name containers
- Profile name links
- Entity result titles

---

### Timestamp Selectors
```javascript
const timeSelectors = [
  '.update-components-actor__sub-description',
  '.feed-shared-actor__sub-description',
  'time',
  '.entity-result__secondary-subtitle'
];
```

**What to look for:**
- Time elements
- Sub-descriptions under author names
- Secondary subtitles

---

### Engagement Count Selectors
```javascript
const reactionsElement = element.querySelector('.social-details-social-counts__reactions-count');
const commentsElement = element.querySelector('.social-details-social-counts__comments');
```

**What to look for:**
- Social counts containers
- Reaction/like counts
- Comment counts

---

## 🛠️ How to Update Selectors

### Step 1: Locate the Code
Open: `server/services/linkedinAutomation.js`

Find the `searchPosts()` method (around line 142)

### Step 2: Update Container Selectors
```javascript
// Line ~184
const containerSelectors = [
  '.your-new-selector-here',  // Add new selectors at the top
  '.search-results-container .feed-shared-update-v2',
  // ... existing selectors
];
```

### Step 3: Update URL Selectors
```javascript
// Line ~228
const urlSelectors = [
  'a.your-new-url-selector[href*="/posts/"]',  // Add new selectors at the top
  'a.app-aware-link[href*="/posts/"]',
  // ... existing selectors
];
```

### Step 4: Test
```bash
cd server
npm run dev
```

Then test the search functionality and check console logs.

---

## 🧪 Testing New Selectors

### Quick Test Script
Create `server/test-selectors.js`:

```javascript
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Login to LinkedIn first
  await page.goto('https://www.linkedin.com/login');
  await page.waitForSelector('#username');
  await page.type('#username', 'YOUR_EMAIL');
  await page.type('#password', 'YOUR_PASSWORD');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  
  // Go to search results
  await page.goto('https://www.linkedin.com/search/results/content/?keywords=test');
  await page.waitForTimeout(5000);
  
  // Test your selectors
  const posts = await page.evaluate(() => {
    const elements = document.querySelectorAll('YOUR_SELECTOR_HERE');
    return elements.length;
  });
  
  console.log(`Found ${posts} elements with your selector`);
  
  await browser.close();
})();
```

Run: `node server/test-selectors.js`

---

## 📋 Common LinkedIn DOM Patterns

### Pattern 1: Feed Update Container
```html
<div class="feed-shared-update-v2">
  <div class="update-components-header">
    <a href="/posts/username_activity-123">
      <span class="update-components-actor__name">John Doe</span>
    </a>
  </div>
  <div class="feed-shared-text">
    <span>Post content here...</span>
  </div>
</div>
```

### Pattern 2: Search Result Item
```html
<li class="reusable-search__result-container">
  <div class="entity-result">
    <a class="app-aware-link" href="/posts/username_activity-123">
      <div class="entity-result__content">
        <span class="entity-result__title-text">Author Name</span>
        <div class="break-words">Post text...</div>
      </div>
    </a>
  </div>
</li>
```

### Pattern 3: Activity Feed Item
```html
<article class="feed-shared-update-v2">
  <a href="/feed/update/urn:li:activity:123456789">
    <div class="feed-shared-actor">
      <span class="feed-shared-actor__name">Jane Smith</span>
    </div>
    <div class="feed-shared-text-view">
      <span dir="ltr">Post content...</span>
    </div>
  </a>
</article>
```

---

## 🔄 Selector Update Checklist

When LinkedIn changes their DOM:

- [ ] Check debug screenshot to see current structure
- [ ] Inspect live LinkedIn page with DevTools
- [ ] Identify new container selector
- [ ] Identify new URL selector
- [ ] Update `containerSelectors` array
- [ ] Update `urlSelectors` array
- [ ] Test with multiple search topics
- [ ] Verify URLs are valid and clickable
- [ ] Check console logs for extraction success
- [ ] Update this reference document

---

## 💡 Pro Tips

### Tip 1: Use Multiple Selectors
Always have 3-5 fallback selectors. LinkedIn uses different structures for different post types.

### Tip 2: Look for Stable Attributes
Prefer selectors with:
- `data-*` attributes (more stable)
- `aria-*` attributes (accessibility, rarely change)
- Semantic class names (e.g., `actor__name`, not `css-123abc`)

### Tip 3: Avoid Overly Specific Selectors
Bad: `.css-1234567 > div:nth-child(3) > span`
Good: `.feed-shared-actor__name`

### Tip 4: Test with Different Post Types
LinkedIn has different layouts for:
- Text-only posts
- Posts with images
- Posts with videos
- Shared articles
- Polls

Test your selectors with all types!

### Tip 5: Use Browser Console
In LinkedIn search results page, open console and run:
```javascript
// Test container selector
document.querySelectorAll('.feed-shared-update-v2').length

// Test URL selector
document.querySelectorAll('a[href*="/posts/"]').length

// Extract all post URLs
Array.from(document.querySelectorAll('a[href*="/posts/"]')).map(a => a.href)
```

---

## 🚨 Emergency Fallback

If all selectors fail, use this nuclear option:

```javascript
// Extract ALL links on the page
const allLinks = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('a[href]'))
    .map(a => a.href)
    .filter(href => 
      href.includes('/posts/') || 
      href.includes('activity-') || 
      href.includes('/feed/update/')
    )
    .slice(0, 10);
});
```

This is less precise but will catch post URLs even if the structure changes completely.

---

## 📚 Resources

- [LinkedIn DOM Explorer](https://www.linkedin.com/search/results/content/)
- [Chrome DevTools Guide](https://developer.chrome.com/docs/devtools/)
- [CSS Selectors Reference](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)
- [Puppeteer Documentation](https://pptr.dev/)

---

**Last Updated:** 2025-10-28
**Next Review:** When LinkedIn updates their UI (check quarterly)
