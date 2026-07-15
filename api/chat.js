module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'OPENAI_API_KEY is not configured in Vercel.' });
  const message = String(req.body?.message || '').slice(0, 1500);
  if (!message) return res.status(400).json({ error: 'Message is required.' });
  const context = req.body?.context || {};
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : [];
  const system = `You are Landed AI, the concise in-product assistant for Landed Carbon, an educational CBAM decision-support prototype for aluminium exporters. Help users navigate the website, understand fields, interpret the current scenario, and use the AI document import. Never claim legal compliance, accredited verification, official filing, or a final legal liability. Distinguish AI document interpretation from deterministic calculator formulas. Available actions: none, open_upload, scroll_dashboard, scroll_platform, scroll_contact. Return a short practical reply and at most one action.`;
  const body = {
    model: process.env.OPENAI_MODEL || 'gpt-5.6',
    input: [
      { role: 'system', content: [{ type: 'input_text', text: system }] },
      ...history.map(item => ({ role: item.role === 'assistant' ? 'assistant' : 'user', content: [{ type: 'input_text', text: String(item.content || '').slice(0, 1200) }] })),
      { role: 'user', content: [{ type: 'input_text', text: `User question: ${message}\nCurrent website context: ${JSON.stringify(context).slice(0, 7000)}` }] }
    ],
    text: { format: { type: 'json_schema', name: 'landed_ai_reply', strict: true, schema: { type: 'object', additionalProperties: false, properties: { reply: { type: 'string' }, action: { type: 'string', enum: ['none','open_upload','scroll_dashboard','scroll_platform','scroll_contact'] } }, required: ['reply','action'] } } }
  };
  try {
    const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || 'OpenAI chat request failed.' });
    const text = data.output_text || (data.output || []).flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
    if (!text) return res.status(502).json({ error: 'The assistant returned no response.' });
    return res.status(200).json(JSON.parse(text));
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Assistant request failed.' });
  }
};
