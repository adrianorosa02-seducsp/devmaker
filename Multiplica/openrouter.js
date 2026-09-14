require('dotenv').config();
const OpenAI = require('openai');

/**
 * OpenRouter Client Configuration
 * Uses official OpenAI SDK configured for OpenRouter API endpoint.
 */
const openrouterApiKey = process.env.OPENROUTER_API_KEY || 'placeholder_key';

const openrouter = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: openrouterApiKey,
    defaultHeaders: {
        'HTTP-Referer': process.env.YOUR_SITE_URL || 'http://localhost:3000',
        'X-Title': process.env.YOUR_SITE_NAME || 'Multiplica Project',
    },
});

/**
 * Send a chat completion request to OpenRouter
 * 
 * @param {Array<{role: string, content: string}>} messages List of message objects
 * @param {string} [model='google/gemini-2.0-flash-001'] Model ID on OpenRouter
 * @returns {Promise<string>} Response content from model
 */
async function generateCompletion(messages, model = 'google/gemini-2.0-flash-001') {
    try {
        const response = await openrouter.chat.completions.create({
            model: model,
            messages: messages,
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error('Error calling OpenRouter API:', error);
        throw error;
    }
}

/**
 * Stream a chat completion response from OpenRouter
 * 
 * @param {Array<{role: string, content: string}>} messages List of message objects
 * @param {function(string): void} onChunk Callback for each stream token
 * @param {string} [model='google/gemini-2.0-flash-001'] Model ID on OpenRouter
 */
async function streamCompletion(messages, onChunk, model = 'google/gemini-2.0-flash-001') {
    try {
        const stream = await openrouter.chat.completions.create({
            model: model,
            messages: messages,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                onChunk(content);
            }
        }
    } catch (error) {
        console.error('Error streaming from OpenRouter API:', error);
        throw error;
    }
}

module.exports = {
    openrouter,
    generateCompletion,
    streamCompletion,
};

// Simple standalone check if executed directly: node openrouter.js
if (require.main === module) {
    if (!process.env.OPENROUTER_API_KEY) {
        console.log('⚠️  OPENROUTER_API_KEY is not set in environment or .env file.');
        console.log('Please set OPENROUTER_API_KEY in .env file to test the OpenRouter connection.');
    } else {
        console.log('🚀 Testing OpenRouter connection with model google/gemini-2.0-flash-001...');
        generateCompletion([{ role: 'user', content: 'Say hello!' }])
            .then(reply => console.log('Response:', reply))
            .catch(err => console.error('Failed:', err.message));
    }
}
