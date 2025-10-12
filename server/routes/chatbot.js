const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Initialize Gemini AI for text generation
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Hugging Face API configuration (using free model)
const HF_API_URL = 'https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5';
const HF_HEADERS = {
  'Content-Type': 'application/json'
};

// Add API key if available
if (process.env.HUGGINGFACE_API_KEY && process.env.HUGGINGFACE_API_KEY !== 'your_huggingface_api_key_here') {
  HF_HEADERS['Authorization'] = `Bearer ${process.env.HUGGINGFACE_API_KEY}`;
}

router.post('/generate', async (req, res) => {
  try {
    const { prompt, userId, postType = 'static' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Get business context for personalization
    const BusinessContext = require('../models/BusinessContext');
    const context = await BusinessContext.findOne({ userId }) || {};

    // Create personalized prompt based on business context
    let tweetPrompt = `Create a ${postType} Twitter tweet about: ${prompt}\n\n`;
    
    if (context.businessName) {
      tweetPrompt += `Business: ${context.businessName}\n`;
    }
    if (context.industry) {
      tweetPrompt += `Industry: ${context.industry}\n`;
    }
    if (context.targetAudience) {
      tweetPrompt += `Target Audience: ${context.targetAudience}\n`;
    }
    if (context.tone) {
      tweetPrompt += `Tone: ${context.tone}\n`;
    }
    
    tweetPrompt += `\nRequirements:\n- Keep under 280 characters\n`;
    
    if (postType === 'dynamic') {
      tweetPrompt += `- Make it HIGHLY engaging and interactive\n- Include a question or call-to-action\n- Encourage replies and engagement\n`;
    } else {
      tweetPrompt += `- Make it informative and professional\n- Focus on value and insights\n`;
    }
    
    if (context.contentPreferences?.includeHashtags) {
      tweetPrompt += `- Include 1-2 relevant hashtags\n`;
    }
    if (context.contentPreferences?.includeEmojis) {
      tweetPrompt += `- Use 1-2 appropriate emojis\n`;
    }
    
    tweetPrompt += `\nTweet:`;

    console.log('Generating personalized tweet...');
    const result = await textModel.generateContent(tweetPrompt);
    const response = await result.response;
    let generatedTweet = response.text().trim();

    // Clean up the response
    generatedTweet = generatedTweet.replace(/^["']|["']$/g, '');
    generatedTweet = generatedTweet.replace(/^Tweet:\s*/i, '');
    
    if (generatedTweet.length > 280) {
      generatedTweet = generatedTweet.substring(0, 277) + '...';
    }

    // Analyze engagement features
    const engagementFeatures = {
      hasQuestion: /\?/.test(generatedTweet),
      hasCall2Action: /(share|comment|reply|tell us|what do you think|let me know)/i.test(generatedTweet),
      hasHashtags: /#\w+/.test(generatedTweet)
    };

    res.json({ 
      tweet: generatedTweet,
      postType,
      engagementFeatures
    });
    
  } catch (error) {
    console.error('Gemini API error:', error);
    
    const templates = [
      `Exploring ${req.body.prompt} and its incredible potential! 🚀 #Innovation`,
      `Just discovered something fascinating about ${req.body.prompt}! 💡 #Future`
    ];
    
    res.json({ 
      tweet: templates[Math.floor(Math.random() * templates.length)],
      fallback: true,
      postType: req.body.postType || 'static'
    });
  }
});



// Generate tweet with image
router.post('/generate-with-image', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    // Generate tweet text
    const tweetPrompt = `Create a single engaging Twitter tweet (max 240 characters) about: ${prompt}

Requirements:
- Keep it under 240 characters (leaving space for image)
- Make it engaging and shareable
- Include 1-2 relevant hashtags
- Use emojis sparingly
- Don't include quotes around the tweet

Tweet:`;

    console.log('Generating tweet and image with Gemini 2.5...');
    
    // Generate tweet text
    const textResult = await textModel.generateContent(tweetPrompt);
    const textResponse = await textResult.response;
    let generatedTweet = textResponse.text().trim();

    // Clean up tweet
    generatedTweet = generatedTweet.replace(/^["']|["']$/g, '');
    generatedTweet = generatedTweet.replace(/^Tweet:\s*/i, '');
    
    if (generatedTweet.length > 240) {
      generatedTweet = generatedTweet.substring(0, 237) + '...';
    }

    // Try to generate detailed prompt with Gemini, fallback to simple prompt
    let imagePrompt;
    try {
      const imagePromptRequest = `Create a concise, visual image prompt for: ${prompt}. Make it professional and modern.`;
      console.log('Generating image prompt with Gemini...');
      const promptResult = await textModel.generateContent(imagePromptRequest);
      const promptResponse = await promptResult.response;
      imagePrompt = promptResponse.text().trim().replace(/^["']|["']$/g, '');
    } catch (geminiError) {
      console.log('Gemini unavailable, using simple prompt');
      imagePrompt = `${prompt}, professional, modern, clean design, high quality`;
    }
    
    console.log('Using image prompt:', imagePrompt);
    console.log('Generating image with Hugging Face...');
    
    // Generate image using free API (Pollinations.ai)
    const imageApiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=512&height=512&model=flux`;
    
    const hfResponse = await axios.get(imageApiUrl, {
      responseType: 'arraybuffer'
    });
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Save image to filesystem
    const filename = `tweet-image-${Date.now()}.png`;
    const filepath = path.join(uploadsDir, filename);
    
    fs.writeFileSync(filepath, Buffer.from(hfResponse.data));
    
    const imageUrl = `/uploads/${filename}`;

    res.json({ 
      tweet: generatedTweet,
      imageUrl: imageUrl,
      hasImage: true
    });
    
  } catch (error) {
    console.error('Gemini image generation error:', error);
    
    // Fallback to text-only
    const templates = [
      `Exploring ${req.body.prompt} and its incredible potential! 🚀 #Innovation`,
      `Just discovered something fascinating about ${req.body.prompt}! 💡 #Future`
    ];
    
    const fallbackTweet = templates[Math.floor(Math.random() * templates.length)];
    
    res.json({ 
      tweet: fallbackTweet,
      imageUrl: null,
      hasImage: false,
      fallback: true,
      error: 'Image generation failed: ' + error.message
    });
  }
});

// Business context collection chat
router.post('/collect-context', async (req, res) => {
  try {
    const { userId, message } = req.body;
    
    const contextPrompt = `Extract business information from this message: "${message}"
    
    Return a JSON object with these fields (only include if mentioned):
    {
      "businessName": "extracted business name",
      "industry": "extracted industry",
      "targetAudience": "extracted target audience",
      "businessDescription": "extracted description",
      "tone": "professional/casual/friendly/authoritative/creative",
      "keywords": ["keyword1", "keyword2"],
      "goals": ["goal1", "goal2"]
    }
    
    Only return the JSON object, no other text.`;
    
    const result = await textModel.generateContent(contextPrompt);
    const response = await result.response;
    let extractedData = response.text().trim();
    
    try {
      // Clean and parse JSON
      extractedData = extractedData.replace(/```json|```/g, '').trim();
      const contextData = JSON.parse(extractedData);
      
      // Save to database
      const BusinessContext = require('../models/BusinessContext');
      const updatedContext = await BusinessContext.findOneAndUpdate(
        { userId },
        { $set: contextData },
        { upsert: true, new: true }
      );
      
      res.json({ 
        success: true, 
        contextData: updatedContext,
        message: 'Business context updated successfully!'
      });
    } catch (parseError) {
      res.json({ 
        success: false, 
        message: 'Could not extract business information from your message. Please be more specific.'
      });
    }
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to process business context' });
  }
});

// Test Gemini API connection
router.get('/test', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const result = await textModel.generateContent('Say hello in one sentence');
    const response = await result.response;
    
    res.json({ 
      success: true, 
      model: 'gemini-2.5-flash',
      response: response.text()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;