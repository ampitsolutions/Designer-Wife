// Supabase Edge Function: tag-item
// Takes a clothing photo (base64 JPEG) and returns suggested name, type, colours, tags, etc.
// Uses the Gemini API. The key stays here as a secret and never ships in the app.
//
// Secrets (Supabase dashboard → Edge Functions → Secrets):
//   GEMINI_API_KEY  required
//   GEMINI_MODEL    optional, default "gemini-2.5-flash"

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return json({ error: 'GEMINI_API_KEY is not set' }, 500);
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';

  let body: {
    image?: string;
    mimeType?: string;
    types?: string[];
    formalities?: string[];
    seasons?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { image, mimeType = 'image/jpeg', types = [], formalities = [], seasons = [] } = body;
  if (!image) return json({ error: 'image (base64) is required' }, 400);
  if (image.length * 0.75 > MAX_IMAGE_BYTES) return json({ error: 'Image too large' }, 413);

  const str = (extra: Record<string, unknown> = {}) => ({ type: 'STRING', ...extra });
  const list = (items: Record<string, unknown>) => ({ type: 'ARRAY', items });
  const withEnum = (values: string[]) => (values.length ? { enum: values } : {});

  const schema = {
    type: 'OBJECT',
    properties: {
      name: str({ description: 'Short item name, e.g. "Navy linen shirt"' }),
      type: str({ ...withEnum(types), format: types.length ? 'enum' : undefined }),
      colours: list(str({ description: 'Simple lowercase colour names, main colour first' })),
      formality: str({ ...withEnum(formalities), format: formalities.length ? 'enum' : undefined }),
      seasons: list(str(withEnum(seasons))),
      occasions: list(str({ description: 'lowercase, e.g. work, wedding, gym, party, travel' })),
      tags: list(
        str({ description: 'lowercase descriptive tags: fabric, pattern, fit, style, sleeve, neckline' }),
      ),
    },
    required: ['name', 'type', 'colours', 'formality', 'seasons', 'occasions', 'tags'],
  };

  const prompt =
    'You are a fashion assistant cataloguing a personal wardrobe. Look at the clothing item in the photo ' +
    'and describe it. Use simple everyday colour names (e.g. "navy", "beige", "olive"). ' +
    'Give 3 to 8 useful tags. If more than one item is visible, describe the most prominent one.';

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: mimeType, data: image } }, { text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.2,
        },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    console.error('Gemini error', res.status, detail);
    return json({ error: `AI request failed (${res.status})` }, 502);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return json({ error: 'AI returned no result' }, 502);

  try {
    return json({ suggestion: JSON.parse(text) });
  } catch {
    return json({ error: 'AI returned invalid JSON' }, 502);
  }
});
