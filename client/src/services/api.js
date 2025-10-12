import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// LinkedIn API
export const linkedinAPI = {
  getAuthUrl: (clerkId) => api.get(`/linkedin/auth/${clerkId}`),
  getStatus: (clerkId) => api.get(`/linkedin/status/${clerkId}`),
  disconnect: (clerkId) => api.post(`/linkedin/disconnect/${clerkId}`),
  testPost: (clerkId) => api.post(`/linkedin/test-post/${clerkId}`),
};

// Chatbot API
export const chatbotAPI = {
  generateTweet: (prompt, userId, postType = 'static') => 
    api.post('/chatbot/generate', { prompt, userId, postType }),
  generateWithImage: (prompt) => api.post('/chatbot/generate-with-image', { prompt }),
  collectContext: (userId, message) => 
    api.post('/chatbot/collect-context', { userId, message }),
};

// Business API
export const businessAPI = {
  getContext: (userId) => api.get(`/business/${userId}`),
  saveContext: (userId, context) => api.post(`/business/${userId}`, context),
};

// Posts API (LinkedIn only)
export const postsAPI = {
  schedule: (userId, content, scheduledTime, imageUrl = null, hasImage = false, postType = 'static', engagementFeatures = {}) => 
    api.post('/posts/schedule', { userId, content, scheduledTime, imageUrl, hasImage, postType, engagementFeatures }),
  getScheduled: (userId) => api.get(`/posts/scheduled/${userId}`),
  update: (postId, content, scheduledTime) => 
    api.put(`/posts/${postId}`, { content, scheduledTime }),
  delete: (postId) => api.delete(`/posts/${postId}`),
};



export default api;