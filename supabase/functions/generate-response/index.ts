import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from '@supabase/supabase-js'
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_LIMIT = 30;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log("Auth Header:", authHeader ? "Present" : "Missing");

    // 1. Verify User
    if (!authHeader) {
      throw new Error('Unauthorized: Missing Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth Error:", authError);
      throw new Error('Unauthorized: Invalid or expired token');
    }

    const { action, ...body } = await req.json();

    if (!openai.apiKey) {
      throw new Error('OpenAI API Key not configured');
    }

    // 2. Check Rate Limit
    if (['generate-response', 'answer-question'].includes(action)) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { count, error: countError } = await supabase
        .from('usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfDay.toISOString());

      if (countError) throw countError;

      if (count !== null && count >= DAILY_LIMIT) {
        throw new Error(`Daily limit of ${DAILY_LIMIT} generations reached.`);
      }

      // Log this request
      const { error: insertError } = await supabase.from('usage_logs').insert({
        user_id: user.id,
        action_type: action
      });
      if (insertError) {
        console.warn("Usage log insert failed (non-fatal):", insertError.message);
      }
    }

    let result;
    switch (action) {
      case 'generate-response':
        result = await handleGenerateResponse(body);
        break;
      case 'answer-question':
        result = await handleAnswerQuestion(body);
        break;
      case 'match-dropdown':
        result = await handleMatchDropdown(body);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Edge Function Error:", msg);
    const isAuthError = msg.toLowerCase().includes('unauthorized');
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: isAuthError ? 401 : 500,
    });
  }
});

function sanitizeProfile(profile: Record<string, unknown> | null) {
  if (!profile) return {};
  const { resume, ...rest } = profile;
  if (resume && typeof resume === 'object' && 'name' in resume) {
    (rest as Record<string, unknown>).resumeName = (resume as Record<string, unknown>).name;
  }
  return rest;
}

async function handleGenerateResponse({ jobDescription, userProfile, type }: Record<string, unknown>) {
  const cleanProfile = sanitizeProfile(userProfile as Record<string, unknown>);
  const jd = typeof jobDescription === 'string' ? jobDescription : '';
  const systemPrompt = `You are an expert career coach helping a candidate apply for a job.
    User Profile: ${JSON.stringify(cleanProfile)}

    Job Description Snippet: ${jd.substring(0, 3000)}

    Task: Write a ${type === 'coverLetter' ? 'concise, professional cover letter' : 'answer to the application question'}.
    Keep it under 300 words. Focus on relevance.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: systemPrompt }],
  });

  return { response: completion.choices[0].message.content };
}

async function handleAnswerQuestion({ question, fieldType, userProfile, jobDescription, maxLength }: Record<string, unknown>) {
  const isTextarea = fieldType === 'textarea';
  const lengthGuide = isTextarea ? '2-4 sentences' : '1-2 sentences';
  const cleanProfile = sanitizeProfile(userProfile as Record<string, unknown>);
  const jd = typeof jobDescription === 'string' ? jobDescription : '';

  const systemPrompt = `You are a professional job applicant answering application questions.
User Profile: ${JSON.stringify(cleanProfile)}
${jd ? `Job Description (excerpt): ${jd.substring(0, 2000)}` : ''}

Rules:
- Answer in ${lengthGuide}, concise and professional
- Write in first person as the applicant
- Be specific where possible using the profile data
- If you don't have enough info, give a reasonable generic professional answer
${maxLength ? `- Keep response under ${maxLength} characters` : ''}
- Do NOT include any preamble like "Here's my answer:" — just the answer text`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Answer this application question: "${question}"` }
    ]
  });

  return {
    answer: completion.choices[0].message.content!.trim(),
    confidence: 'medium'
  };
}

async function handleMatchDropdown({ question, options, userValue, context }: Record<string, unknown>) {
  const opts = options as string[];
  if (!opts || !Array.isArray(opts) || opts.length === 0) {
    throw new Error('options array is required');
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
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
Available options: ${JSON.stringify(opts)}
User's value: "${userValue}"${context ? `\nAdditional context: ${context}` : ''}`
      }
    ]
  });

  const result = JSON.parse(completion.choices[0].message.content!);

  if (result.match && result.match !== 'NONE') {
    const validMatch = opts.find((o: string) => o === result.match);
    if (!validMatch) {
      const fuzzyMatch = opts.find((o: string) => o.toLowerCase() === result.match.toLowerCase());
      result.match = fuzzyMatch || null;
    }
  } else {
    result.match = null;
  }

  return result;
}
