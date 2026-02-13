import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { Buffer } from "node:buffer";
import pdfParse from "npm:pdf-parse@1.1.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('resume');

    if (!file || !(file instanceof File)) {
      throw new Error('No resume file uploaded');
    }

    let text = '';
    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer); // pdf-parse expects a buffer
      const data = await pdfParse(buffer);
      text = data.text;
    } else {
      text = await file.text();
    }

    const result = { text: text.trim() };

    // Note: Removed structured extraction for now as it was optional and can be added later if needed
    // The previous implementation had it but it was complex to port 1:1 without more dependencies.
    // Basic text extraction is the core requirement.

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
