const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGemini() {
  try {
    console.log('Testing Gemini API...');
    console.log('API Key exists:', !!process.env.GEMINI_API_KEY);
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent('Write a short tweet about AI');
    const response = result.response;
    const text = response.text();
    
    console.log('Success! Generated text:', text);
  } catch (error) {
    console.error('Gemini API Error:', error.message);
    console.error('Full error:', error);
  }
}

testGemini();