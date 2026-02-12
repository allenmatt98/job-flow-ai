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

    const result = { text: text.trim() };

    // Optional structured extraction via LLM
    if (req.query.extractStructured === 'true' && text.trim()) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4-turbo-preview",
          temperature: 0.1,
          max_tokens: 2000,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You are a resume parser. Extract structured data from the resume text into this exact JSON schema:
{
  "userProfile": {
    "firstName": "", "lastName": "", "email": "", "phone": "",
    "linkedin": "", "portfolio": "", "about": ""
  },
  "education": [
    { "school": "", "degree": "", "start": "", "end": "" }
  ],
  "experience": [
    { "company": "", "title": "", "start": "", "end": "", "description": "" }
  ],
  "skills": [],
  "certifications": []
}
Rules:
- Dates should be YYYY-MM format (e.g., "2020-06") or just YYYY if month unknown
- Only include fields you can confidently extract
- Leave empty string "" for fields not found
- skills and certifications are arrays of strings
- about should be a brief professional summary if found`
            },
            { role: "user", content: text.substring(0, 6000) }
          ]
        });

        const structured = JSON.parse(completion.choices[0].message.content);
        result.structured = structured;
      } catch (llmError) {
        console.error('Structured extraction failed (non-fatal):', llmError);
        // Return text-only result — structured extraction is optional
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Resume parse error:', error);
    res.status(500).json({ error: 'Failed to parse resume' });
  }
});

// Step 3.1: LLM-powered dropdown disambiguation
app.post('/api/match-dropdown', async (req, res) => {
  const { question, options, userValue, context } = req.body;

  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_api_key_here') {
      return res.status(500).json({ error: 'OpenAI API Key not configured on backend.' });
    }

    if (!options || !Array.isArray(options) || options.length === 0) {
      return res.status(400).json({ error: 'options array is required' });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      temperature: 0.1,
      max_tokens: 150,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a form-filling assistant. Given a dropdown question, a list of available options, and the user's intended value, pick the BEST matching option from the list.

Rules:
- You MUST pick from the provided options list EXACTLY as written, or return "NONE"
- Consider semantic equivalence (e.g., "Citizen" means "Yes" for work authorization)
- Consider abbreviations and alternate phrasings
- Return JSON: { "match": "<exact option text>" or "NONE", "confidence": "high"|"medium"|"low", "reasoning": "<brief explanation>" }`
        },
        {
          role: "user",
          content: `Question: "${question || 'Select an option'}"
Available options: ${JSON.stringify(options)}
User's value: "${userValue}"${context ? `\nAdditional context: ${context}` : ''}`
        }
      ]
    });

    const result = JSON.parse(completion.choices[0].message.content);

    // Validate the match exists in options
    if (result.match && result.match !== 'NONE') {
      const validMatch = options.find(o => o === result.match);
      if (!validMatch) {
        // LLM returned something not in options — try case-insensitive
        const fuzzyMatch = options.find(o => o.toLowerCase() === result.match.toLowerCase());
        result.match = fuzzyMatch || null;
      }
    } else {
      result.match = null;
    }

    res.json(result);
  } catch (error) {
    console.error('Dropdown match error:', error);
    res.status(500).json({ error: 'Failed to match dropdown', match: null });
  }
});

// Step 3.2: Generate answers for open-ended application questions
app.post('/api/answer-question', async (req, res) => {
  const { question, fieldType, userProfile, jobDescription, maxLength } = req.body;

  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_api_key_here') {
      return res.status(500).json({ error: 'OpenAI API Key not configured on backend.' });
    }

    const isTextarea = fieldType === 'textarea';
    const lengthGuide = isTextarea ? '2-4 sentences' : '1-2 sentences';
    const tokenLimit = isTextarea ? 500 : 100;

    const systemPrompt = `You are a professional job applicant answering application questions.
User Profile: ${JSON.stringify(userProfile || {})}
${jobDescription ? `Job Description (excerpt): ${jobDescription.substring(0, 2000)}` : ''}

Rules:
- Answer in ${lengthGuide}, concise and professional
- Write in first person as the applicant
- Be specific where possible using the profile data
- If you don't have enough info, give a reasonable generic professional answer
${maxLength ? `- Keep response under ${maxLength} characters` : ''}
- Do NOT include any preamble like "Here's my answer:" — just the answer text`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      temperature: 0.7,
      max_tokens: tokenLimit,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Answer this application question: "${question}"` }
      ]
    });

    res.json({
      answer: completion.choices[0].message.content.trim(),
      confidence: 'medium'
    });
  } catch (error) {
    console.error('Answer generation error:', error);
    res.status(500).json({ error: 'Failed to generate answer', answer: null });
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
