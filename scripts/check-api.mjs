// Quick diagnostic — checks Gemini API quota and error details
const apiKey = 'AIzaSyB8oz7DOqq6f8qsIFRMhGWyPLoqPnsF0mc';

async function checkApi() {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Respond only with valid JSON object: {"ok":true}' }] }],
        generationConfig: { response_mime_type: 'application/json', temperature: 0.1 },
      }),
    }
  );
  const status = res.status;
  const body = await res.json().catch(() => null);
  console.log('HTTP Status:', status);
  if (body?.error) {
    console.log('Gemini Error Code:', body.error.code);
    console.log('Gemini Error Status:', body.error.status);
    console.log('Gemini Error Message:', body.error.message?.substring(0, 300));
  } else {
    const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('Response OK:', text);
  }
}

checkApi().catch(e => console.error('Fetch error:', e.message));
