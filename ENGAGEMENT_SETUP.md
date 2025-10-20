# LinkedIn Engagement Automation Setup

## 📦 Installation

### 1. Install Puppeteer Dependencies

```bash
cd server
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
```

### 2. Verify Installation

Check that these packages are added to `server/package.json`:
- `puppeteer`
- `puppeteer-extra`
- `puppeteer-extra-plugin-stealth`

---

## 🚀 Usage

### 1. Add Component to Dashboard

Edit `client/src/pages/Dashboard.jsx`:

```javascript
import LinkedInEngagement from '../components/LinkedInEngagement'

// Add inside the return statement:
<LinkedInEngagement />
```

### 2. Start the Application

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

### 3. Use the Engagement Feature

1. Navigate to Dashboard
2. Scroll to "LinkedIn Engagement Automation" section
3. Enter your LinkedIn credentials
4. Paste the post URL you want to interact with
5. Click Like, Comment, or Share

---

## 🎯 Features

### ✅ Like Posts
- Automatically likes any LinkedIn post
- Works with public and connection posts

### ✅ Comment on Posts
- Posts comments on any LinkedIn post
- Supports text formatting

### ✅ Share Posts
- Shares posts to your feed
- Optional commentary when sharing

---

## ⚙️ How It Works

1. **Browser Automation**: Opens a real Chrome browser
2. **Login**: Logs into LinkedIn with your credentials
3. **Navigate**: Goes to the target post URL
4. **Interact**: Clicks buttons like a real user
5. **Close**: Closes browser after completion

---

## ⚠️ Important Warnings

### Security
- ❌ **Never share your LinkedIn credentials**
- ✅ Credentials are used only for the session
- ✅ Not stored in database

### LinkedIn Terms
- ⚠️ Automation violates LinkedIn Terms of Service
- ⚠️ Risk of account suspension
- ⚠️ Use at your own risk
- ✅ Limit actions to avoid detection

### Rate Limiting
- Max 50-100 actions per day
- Add delays between actions
- Don't run continuously

---

## 🔧 Troubleshooting

### Browser Not Opening
```bash
# Install Chromium manually
npx puppeteer browsers install chrome
```

### Login Fails
- Check credentials are correct
- LinkedIn may require 2FA (not supported)
- Try logging in manually first

### Selectors Not Found
- LinkedIn changes their HTML frequently
- Update selectors in `linkedinAutomation.js`
- Check browser console for errors

---

## 🎨 Customization

### Change Browser Visibility

Edit `server/services/linkedinAutomation.js`:

```javascript
this.browser = await puppeteer.launch({
  headless: true,  // Change to true to hide browser
  // ...
});
```

### Add Delays

```javascript
await this.page.waitForTimeout(5000); // Wait 5 seconds
```

### Custom Selectors

Update button selectors if LinkedIn changes their UI:

```javascript
const likeButton = await this.page.$('button[aria-label*="React Like"]');
```

---

## 📊 Example Usage

### Like a Post
```javascript
POST /api/engagement/like
{
  "email": "your-email@example.com",
  "password": "your-password",
  "postUrl": "https://www.linkedin.com/posts/username_activity-123456789"
}
```

### Comment on a Post
```javascript
POST /api/engagement/comment
{
  "email": "your-email@example.com",
  "password": "your-password",
  "postUrl": "https://www.linkedin.com/posts/username_activity-123456789",
  "comment": "Great post! Thanks for sharing."
}
```

### Share a Post
```javascript
POST /api/engagement/share
{
  "email": "your-email@example.com",
  "password": "your-password",
  "postUrl": "https://www.linkedin.com/posts/username_activity-123456789",
  "commentary": "This is valuable content!"
}
```

---

## 🚀 Ready to Use!

Your LinkedIn engagement automation is now set up and ready to use. Remember to use it responsibly! 🎉
