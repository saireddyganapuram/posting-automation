# Engagement Options Update - Like and Comment

## What Changed

Previously, the engagement feature only liked posts. Now you can choose to:
- Like posts (default: enabled)
- Comment on posts (default: disabled)
- Both like AND comment on the same posts

## New UI Features

### Engagement Options Panel
After searching for posts, you will see a new blue panel with checkboxes to enable/disable liking and commenting.

### Comment Text Input
When you enable commenting, a text area appears where you can enter your comment that will be posted on all selected posts.

## How to Use

### Option 1: Like Only (Default)
1. Search for posts
2. Select posts you want to engage with
3. Keep "Like posts" checked
4. Click "Engage with X Posts"
5. Posts will be liked

### Option 2: Comment Only
1. Search for posts
2. Uncheck "Like posts"
3. Check "Comment on posts"
4. Enter your comment text
5. Select posts
6. Click "Engage with X Posts"
7. Comments will be posted

### Option 3: Like + Comment (Most Engagement)
1. Search for posts
2. Keep "Like posts" checked
3. Check "Comment on posts"
4. Enter your comment text
5. Select posts
6. Click "Engage with X Posts"
7. Posts will be liked AND commented on

## Comment Best Practices

### Good Comments
- "Great insights on AI implementation! I've had similar experiences with..."
- "This is exactly what I needed to hear today. Thanks for sharing your perspective on..."
- "Interesting approach to problem-solving. Have you considered...?"

### Avoid Generic Comments
- "Nice post"
- "Great!"
- "Thanks for sharing"

Generic comments look automated and don't add value.

## Technical Details

### Frontend Changes
- Added state for enableLike, enableComment, commentText
- Added validation to ensure at least one action is selected
- Added UI controls for selecting engagement options
- Comment text area appears conditionally

### API Request
```javascript
{
  accountId: user.id,
  posts: selectedPosts,
  actions: { 
    like: true/false, 
    comment: true/false
  },
  commentText: "Your comment here"
}
```

### Backend Processing
The backend already supports both actions through the engage-multiple endpoint. It will:
1. Loop through selected posts
2. For each post, perform enabled actions
3. Add delays between actions to appear human
4. Return results for each post

## Rate Limiting Recommendations

- Like only: 30-50 posts per day
- Comment only: 20-30 posts per day
- Like + Comment: 15-20 posts per day

Space out your engagement throughout the day to avoid LinkedIn rate limiting.
