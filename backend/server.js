require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/parse-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    let text = '';
    if (req.file.mimetype === 'application/pdf') {
      const data = await pdfParse(req.file.buffer);
      text = data.text;
    } else {
      text = req.file.buffer.toString('utf-8');
    }
    res.json({ text: text.trim() });
  } catch (error) {
    console.error('Resume parse error:', error);
    res.status(500).json({ error: 'Failed to parse resume' });
  }
});

app.post('/api/generate-response', async (req, res) => {
  const { jobDescription, userProfile, type } = req.body; // type: 'coverLetter' | 'answer'

  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_api_key_here') {
      return res.status(500).json({ error: 'OpenAI API Key not configured on backend.' });
    }

    const systemPrompt = `You are an expert career coach helping a candidate apply for a job.
    User Profile: ${JSON.stringify(userProfile)}
    
    Job Description Snippet: ${jobDescription.substring(0, 3000)}...
    
    Task: Write a ${type === 'coverLetter' ? 'concise, professional cover letter' : 'answer to the application question'}.
    Keep it under 300 words. Focus on relevance.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview", // or gpt-3.5-turbo
      messages: [{ role: "system", content: systemPrompt }],
    });

    res.json({ response: completion.choices[0].message.content });
  } catch (error) {
    console.error('AI Generation error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});
