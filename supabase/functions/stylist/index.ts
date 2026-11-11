// Supabase Edge Function: stylist
// One AI endpoint for the app. The Gemini key stays here as a secret and never ships in the app.
//
//   { action: "tag",     image, mimeType?, types, formalities, seasons }  → { suggestion }
//   { action: "outfits", occasion, date?, weather?, closet }               → { outfits: [...] }
//   { action: "trip",    destination, days: [{date, weather, activities}], itinerary?, closet }
//                                                                          → { days: [...], packing: [...] }
//   { action: "order",   text?, images?: [{data, mimeType}], pdf?: {data}, types, formalities, seasons }
//                                                                          → { items: [...] }
//
// Secrets (Supabase dashboard → Edge Functions → Secrets):
//   GEMINI_API_KEY  required
//   GEMINI_MODEL    optional, default "gemini-2.5-flash"

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_CLOSET_ITEMS = 600;
const MAX_ORDER_IMAGES = 6;
const MAX_ORDER_BYTES = 12 * 1024 * 1024;
const MAX_ORDER_TEXT = 60_000;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ---- schema helpers (Gemini OpenAPI subset) ----
type S = Record<string, unknown>;
const str = (extra: S = {}): S => ({ type: 'STRING', ...extra });
const int = (extra: S = {}): S => ({ type: 'INTEGER', ...extra });
const list = (items: S, extra: S = {}): S => ({ type: 'ARRAY', items, ...extra });
const obj = (properties: Record<string, S>, required = Object.keys(properties)): S => ({
  type: 'OBJECT',
  properties,
  required,
});
const oneOf = (values: string[]): S => (values.length ? { enum: values, format: 'enum' } : {});

type ClosetItem = {
  id: string;
  name?: string | null;
  type?: string | null;
  colours?: string[];
  tags?: string[];
  occasions?: string[];
  seasons?: string[];
  formality?: string | null;
};

/** One compact line per item so hundreds of items fit comfortably in the prompt. */
function closetText(closet: ClosetItem[]) {
  return closet
    .slice(0, MAX_CLOSET_ITEMS)
    .map((i) =>
      [
        `id=${i.id}`,
        i.name && `name=${i.name}`,
        i.type && `type=${i.type}`,
        i.colours?.length && `colours=${i.colours.join('/')}`,
        i.formality && `formality=${i.formality}`,
        i.seasons?.length && `seasons=${i.seasons.join('/')}`,
        i.occasions?.length && `occasions=${i.occasions.join('/')}`,
        i.tags?.length && `tags=${i.tags.join('/')}`,
      ]
        .filter(Boolean)
        .join('; '),
    )
    .join('\n');
}

async function gemini(parts: unknown[], schema: S, temperature = 0.4) {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new HttpError(500, 'GEMINI_API_KEY is not set');
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature },
    }),
  });
  if (!res.ok) {
    console.error('Gemini error', res.status, await res.text());
    if (res.status === 429) throw new HttpError(429, 'AI is busy, try again in a minute');
    throw new HttpError(502, `AI request failed (${res.status})`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new HttpError(502, 'AI returned no result');
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(502, 'AI returned invalid JSON');
  }
}

// ---- actions ----

async function tag(body: any) {
  const { image, mimeType = 'image/jpeg', types = [], formalities = [], seasons = [] } = body;
  if (!image) throw new HttpError(400, 'image (base64) is required');
  if (image.length * 0.75 > MAX_IMAGE_BYTES) throw new HttpError(413, 'Image too large');

  const schema = obj({
    name: str({ description: 'Short item name, e.g. "Navy linen shirt"' }),
    type: str(oneOf(types)),
    colours: list(str({ description: 'Simple lowercase colour names, main colour first' })),
    formality: str(oneOf(formalities)),
    seasons: list(str(oneOf(seasons))),
    occasions: list(str({ description: 'lowercase, e.g. work, wedding, gym, party, travel' })),
    tags: list(str({ description: 'lowercase descriptive tags: fabric, pattern, fit, style, sleeve, neckline' })),
  });
  const prompt =
    'You are a fashion assistant cataloguing a personal wardrobe. Look at the clothing item in the photo ' +
    'and describe it. Use simple everyday colour names (e.g. "navy", "beige", "olive"). ' +
    'Give 3 to 8 useful tags. If more than one item is visible, describe the most prominent one.';
  const suggestion = await gemini([{ inline_data: { mime_type: mimeType, data: image } }, { text: prompt }], schema, 0.2);
  return { suggestion };
}

async function outfits(body: any) {
  const { occasion, date, weather, closet = [] } = body as {
    occasion?: string;
    date?: string;
    weather?: string;
    closet: ClosetItem[];
  };
  if (!occasion) throw new HttpError(400, 'occasion is required');
  if (!closet.length) throw new HttpError(400, 'Your closet is empty');

  const schema = obj({
    outfits: list(
      obj({
        name: str({ description: 'Short outfit name' }),
        item_ids: list(str({ description: 'ids copied exactly from the closet list' })),
        reason: str({ description: 'One sentence on why it works' }),
      }),
    ),
  });
  const prompt =
    `Suggest up to 3 different outfits for this occasion: "${occasion}".` +
    (date ? ` Date: ${date}.` : '') +
    (weather ? ` Expected weather: ${weather}.` : '') +
    ' Use ONLY items from the closet below, referenced by their exact id. Each outfit should be complete ' +
    '(e.g. top + bottom or a dress, plus shoes and outerwear/accessories when available and suitable). ' +
    'Respect formality and season.\n\nCLOSET:\n' +
    closetText(closet);

  const result = await gemini([{ text: prompt }], schema);
  const valid = new Set(closet.map((i) => i.id));
  const cleaned = (result.outfits ?? [])
    .map((o: any) => ({ ...o, item_ids: [...new Set<string>((o.item_ids ?? []).filter((id: string) => valid.has(id)))] }))
    .filter((o: any) => o.item_ids.length > 0);
  return { outfits: cleaned };
}

async function trip(body: any) {
  const { destination, itinerary, days = [], closet = [] } = body as {
    destination?: string;
    itinerary?: string;
    days: { date: string; weather?: string; activities?: string }[];
    closet: ClosetItem[];
  };
  if (!days.length) throw new HttpError(400, 'Trip needs at least one day');
  if (!closet.length) throw new HttpError(400, 'Your closet is empty');

  const schema = obj({
    days: list(
      obj(
        {
          date: str({ description: 'YYYY-MM-DD, one of the trip dates' }),
          item_ids: list(str({ description: 'ids copied exactly from the closet list' })),
          note: str({ description: 'One short line on the look, e.g. "Layers for the cold evening walk"' }),
        },
        ['date', 'item_ids', 'note'],
      ),
    ),
    packing: list(
      obj(
        {
          item_id: str({ description: 'closet id, or empty string for non-closet essentials' }),
          label: str({ description: 'What to pack' }),
          quantity: int(),
        },
        ['item_id', 'label', 'quantity'],
      ),
    ),
  });

  const dayLines = days
    .map((d) => `- ${d.date}${d.weather ? ` | weather: ${d.weather}` : ''}${d.activities ? ` | plans: ${d.activities}` : ''}`)
    .join('\n');
  const prompt =
    `Plan what to wear on a trip${destination ? ` to ${destination}` : ''}.\n` +
    (itinerary ? `Itinerary notes:\n${itinerary}\n` : '') +
    `Days:\n${dayLines}\n\n` +
    'For EVERY day, choose a complete outfit using ONLY closet items (by exact id) that suits the weather and plans. ' +
    'Re-wear versatile pieces (jeans, jackets, shoes) to pack light. ' +
    'Then give a packing list: every closet item used (item_id set, quantity 1), plus a few non-closet ' +
    'essentials such as underwear, socks, sleepwear, toiletries (item_id empty, sensible quantity for the trip length). ' +
    'Do not list the same closet item twice.\n\nCLOSET:\n' +
    closetText(closet);

  const result = await gemini([{ text: prompt }], schema);
  const valid = new Set(closet.map((i) => i.id));
  const dates = new Set(days.map((d) => d.date));
  const planned = (result.days ?? [])
    .filter((d: any) => dates.has(d.date))
    .map((d: any) => ({ ...d, item_ids: [...new Set<string>((d.item_ids ?? []).filter((id: string) => valid.has(id)))] }));

  const seen = new Set<string>();
  const packing = (result.packing ?? [])
    .map((p: any) => ({
      item_id: p.item_id && valid.has(p.item_id) ? p.item_id : null,
      label: String(p.label ?? '').trim(),
      quantity: Math.max(1, Math.min(30, Number(p.quantity) || 1)),
    }))
    .filter((p: any) => {
      if (!p.label) return false;
      const key = p.item_id ?? `label:${p.label.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  // Make sure every planned item is on the packing list.
  for (const d of planned)
    for (const id of d.item_ids)
      if (!seen.has(id)) {
        seen.add(id);
        const it = closet.find((c) => c.id === id);
        packing.push({ item_id: id, label: it?.name || it?.type || 'Item', quantity: 1 });
      }

  return { days: planned, packing };
}

async function order(body: any) {
  const { text = '', images = [], pdf, types = [], formalities = [], seasons = [] } = body as {
    text?: string;
    images?: { data: string; mimeType?: string }[];
    pdf?: { data: string };
    types: string[];
    formalities: string[];
    seasons: string[];
  };
  if (!text.trim() && !images.length && !pdf) throw new HttpError(400, 'Add a screenshot, PDF or the order text');
  if (images.length > MAX_ORDER_IMAGES) throw new HttpError(400, `Up to ${MAX_ORDER_IMAGES} screenshots at a time`);
  const bytes = images.reduce((n, i) => n + i.data.length * 0.75, 0) + (pdf ? pdf.data.length * 0.75 : 0);
  if (bytes > MAX_ORDER_BYTES) throw new HttpError(413, 'Files too large; try fewer screenshots');

  const schema = obj({
    items: list(
      obj(
        {
          name: str({ description: 'Short everyday item name, e.g. "Navy linen shirt"' }),
          brand: str({ description: 'Brand, or empty string' }),
          retailer: str({ description: 'Store the order is from, or empty string' }),
          type: str(oneOf(types)),
          colours: list(str({ description: 'Simple lowercase colour names' })),
          size: str({ description: 'Size as written, or empty string' }),
          quantity: int(),
          order_date: str({ description: 'YYYY-MM-DD if shown, else empty string' }),
          formality: str(oneOf(formalities)),
          seasons: list(str(oneOf(seasons))),
          occasions: list(str({ description: 'lowercase, e.g. work, wedding, gym' })),
          tags: list(str({ description: 'lowercase: fabric, pattern, fit, style' })),
          photo_image: int({ description: 'Index of the screenshot showing this product photo, or -1 if none' }),
          photo_box: list(int(), {
            description: 'Product photo bounding box [ymin, xmin, ymax, xmax] scaled 0-1000, or empty',
          }),
        },
        ['name', 'brand', 'retailer', 'type', 'colours', 'size', 'quantity', 'order_date', 'formality', 'seasons', 'occasions', 'tags', 'photo_image', 'photo_box'],
      ),
    ),
  });

  const prompt =
    'This is an online clothing order (confirmation email, receipt or screenshot). List every clothing, ' +
    'shoe, bag or accessory item that was bought. Skip gift cards, shipping, taxes, returns and anything ' +
    'that is not something to wear. Infer colour, type and season from the product name and photo. ' +
    (images.length
      ? `There are ${images.length} screenshot(s), numbered from 0. For each item, if its product photo is visible, ` +
        'give photo_image (the screenshot number) and photo_box around just that product photo. '
      : 'There are no screenshots, so set photo_image to -1 and photo_box to []. ') +
    (text.trim() ? `\n\nORDER TEXT:\n${text.slice(0, MAX_ORDER_TEXT)}` : '');

  const parts: unknown[] = [
    ...images.map((i) => ({ inline_data: { mime_type: i.mimeType || 'image/jpeg', data: i.data } })),
    ...(pdf ? [{ inline_data: { mime_type: 'application/pdf', data: pdf.data } }] : []),
    { text: prompt },
  ];
  const result = await gemini(parts, schema, 0.1);

  const items = (result.items ?? [])
    .filter((i: any) => String(i.name ?? '').trim())
    .map((i: any) => {
      const box = Array.isArray(i.photo_box) ? i.photo_box.map(Number) : [];
      const validBox =
        box.length === 4 && box.every((n: number) => n >= 0 && n <= 1000) && box[2] > box[0] && box[3] > box[1];
      const idx = Number(i.photo_image);
      const hasPhoto = validBox && Number.isInteger(idx) && idx >= 0 && idx < images.length;
      return {
        ...i,
        name: String(i.name).trim(),
        quantity: Math.max(1, Math.min(20, Number(i.quantity) || 1)),
        order_date: /^\d{4}-\d{2}-\d{2}$/.test(i.order_date ?? '') ? i.order_date : null,
        photo_image: hasPhoto ? idx : -1,
        photo_box: hasPhoto ? box : null,
      };
    });
  return { items };
}

const actions: Record<string, (body: any) => Promise<unknown>> = { tag, outfits, trip, order };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const handler = actions[body?.action ?? 'tag'];
  if (!handler) return json({ error: `Unknown action "${body.action}"` }, 400);

  try {
    return json(await handler(body));
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: 'Something went wrong' }, 500);
  }
});
