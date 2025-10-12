# LinkedIn Content Scheduler

A full-stack MERN application for scheduling LinkedIn posts with AI-generated content using Google Gemini API.

## Features

- 🔐 User authentication with Clerk
- 💼 LinkedIn OAuth 2.0 integration
- 🤖 AI-powered content generation with Google Gemini
- 📅 Calendar-based post scheduling
- ⏰ Automatic LinkedIn posting with cron jobs
- 📱 Responsive design with Tailwind CSS
- 🎯 Dynamic vs Static post types
- 💬 Business context-aware content generation

## Tech Stack

**Frontend:**
- React (Vite)
- Tailwind CSS
- Clerk Authentication
- FullCalendar
- Axios

**Backend:**
- Node.js
- Express.js
- MongoDB (Mongoose)
- LinkedIn API
- Google Gemini AI
- node-cron

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Environment Variables

**Backend (.env in server folder):**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/linkedin-scheduler
JWT_SECRET=your_jwt_secret_here
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:5000/api/linkedin/callback
GEMINI_API_KEY=your_gemini_api_key_here
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
CLIENT_URL=http://localhost:5173
PORT=5000
```

**Frontend (.env in client folder):**
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here
VITE_API_URL=http://localhost:5000/api
```

### 3. API Keys Setup

#### MongoDB Atlas
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string and replace in `MONGODB_URI`

#### Clerk Authentication
1. Create account at [Clerk](https://clerk.com)
2. Create new application
3. Copy publishable key to `VITE_CLERK_PUBLISHABLE_KEY`

#### LinkedIn API
1. Create LinkedIn Developer account at [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create new app with required permissions:
   - `r_liteprofile` (Read basic profile)
   - `r_emailaddress` (Read email address)
   - `w_member_social` (Write posts)
3. Add callback URL: `http://localhost:5000/api/linkedin/callback`
4. Copy Client ID and Secret to environment variables

#### Google Gemini API
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Add to `GEMINI_API_KEY`

#### Hugging Face API (Optional - for image generation)
1. Create account at [Hugging Face](https://huggingface.co/)
2. Get API token from settings
3. Add to `HUGGINGFACE_API_KEY`

### 4. Run the Application

```bash
# Start backend server
cd server
npm run dev

# Start frontend (in new terminal)
cd client
npm run dev
```

## Usage

1. **Sign Up/Login:** Create account using Clerk authentication
2. **Connect LinkedIn:** Link your LinkedIn account via OAuth
3. **Set Business Context:** Share your business details with the AI chatbot
4. **Generate Content:** Use AI to create personalized LinkedIn posts
   - **Static Posts:** Professional, informative content
   - **Dynamic Posts:** Engaging, interactive content with CTAs
5. **Schedule Posts:** Set date/time for automatic posting
6. **Manage Calendar:** View, edit, and delete scheduled posts

## Key Features

### AI Content Generation
- **Business Context Aware:** AI learns your business details for personalized content
- **Post Type Selection:** Choose between dynamic (engaging) or static (informative) posts
- **Image Generation:** Optional AI-generated images for posts
- **Character Optimization:** Optimized for LinkedIn's 3000 character limit

### Smart Scheduling
- **Calendar Interface:** Visual scheduling with FullCalendar
- **Day View:** Detailed view of all posts scheduled for a specific date
- **Edit Before Posting:** Modify content and timing before scheduled time
- **Automatic Posting:** Cron job posts content automatically

## Deployment

### Frontend (Vercel)
```bash
cd client
npm run build
# Deploy dist folder to Vercel
```

### Backend (Render)
1. Connect GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy from `server` folder

### Environment Variables for Production
- Update `CLIENT_URL` to your frontend domain
- Update `LINKEDIN_REDIRECT_URI` to production callback URL
- Set `VITE_API_URL` to your backend domain

## Project Structure

```
content-scheduler/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API calls
│   │   └── App.jsx
│   └── package.json
├── server/                 # Node.js backend
│   ├── models/             # MongoDB schemas
│   │   ├── User.js         # User & LinkedIn credentials
│   │   ├── Post.js         # LinkedIn posts
│   │   └── BusinessContext.js # Business information
│   ├── routes/             # API routes
│   │   ├── linkedin.js     # LinkedIn OAuth
│   │   ├── chatbot.js      # AI content generation
│   │   ├── posts.js        # Post management
│   │   └── business.js     # Business context
│   ├── services/           # Business logic
│   └── index.js
└── README.md
```

## API Endpoints

### LinkedIn Integration
- `GET /api/linkedin/auth/:clerkId` - Get LinkedIn OAuth URL
- `GET /api/linkedin/status/:clerkId` - Check LinkedIn connection
- `POST /api/linkedin/disconnect/:clerkId` - Disconnect LinkedIn

### Content Management
- `POST /api/chatbot/generate` - Generate post with AI
- `POST /api/chatbot/generate-with-image` - Generate post with image
- `POST /api/chatbot/collect-context` - Extract business context

### Post Scheduling
- `POST /api/posts/schedule` - Schedule new post
- `GET /api/posts/scheduled/:userId` - Get user's scheduled posts
- `PUT /api/posts/:postId` - Update scheduled post
- `DELETE /api/posts/:postId` - Delete scheduled post

### Business Context
- `GET /api/business/:userId` - Get business context
- `POST /api/business/:userId` - Save business context

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

MIT License