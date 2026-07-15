module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'OPENAI_API_KEY is not configured in Vercel.' });
  const files = Array.isArray(req.body?.files) ? req.body.files.slice(0, 5) : [];
  if (!files.length) return res.status(400).json({ error: 'No files were provided.' });
  const totalChars = files.reduce((sum, f) => sum + String(f.data || '').length, 0);
  if (totalChars > 6_000_000) return res.status(413).json({ error: 'Combined files are too large. Use smaller demo documents.' });

  const nullableNumber = { anyOf: [{ type: 'number' }, { type: 'null' }] };
  const nullableString = { anyOf: [{ type: 'string' }, { type: 'null' }] };
  const fieldNames = ['quantity','year','certPrice','benchmark','carbonPaid','alumina','smelting','casting','processing','elecUse','gridFactor','domesticMode','domesticDist','originPort','intlMode','intlDist','euPort','inlandMode','inlandDist'];
  const properties = {};
  for (const name of fieldNames) properties[name] = ['domesticMode','intlMode','inlandMode'].includes(name) ? nullableString : nullableNumber;

  const content = files.map(file => ({ type: 'input_file', filename: String(file.name || 'document'), file_data: String(file.data || ''), detail: 'high' }));
  content.push({ type: 'input_text', text: `Extract only explicitly stated information useful for the Landed Carbon aluminium calculator. Map values to these exact dashboard IDs: quantity (tonnes), year, certPrice (EUR/tCO2e), benchmark (tCO2e/t), carbonPaid (tCO2e/t equivalent), alumina, smelting, casting, processing (all tCO2e/t aluminium), elecUse (MWh/t), gridFactor (tCO2e/MWh), domesticMode (truck|rail|barge), domesticDist (km), originPort (kgCO2e/t), intlMode (sea|air|rail|truck), intlDist (km), euPort (kgCO2e/t), inlandMode (truck|rail|barge), inlandDist (km). Never invent a value. Use null when absent. Return evidence for each extracted field, missing information, warnings, and a brief summary. Do not claim legal compliance or final CBAM liability.` });

  const body = {
    model: process.env.OPENAI_MODEL || 'gpt-5.6',
    input: [{ role: 'user', content }],
    text: { format: { type: 'json_schema', name: 'landed_carbon_document_extraction', strict: true, schema: {
      type: 'object', additionalProperties: false,
      properties: {
        summary: { type: 'string' },
        fields: { type: 'object', additionalProperties: false, properties, required: fieldNames },
        evidence: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { field: { type: 'string' }, value: nullableString, source: { type: 'string' }, confidence: nullableNumber }, required: ['field','value','source','confidence'] } },
        missing_fields: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } }
      }, required: ['summary','fields','evidence','missing_fields','warnings']
    } } }
  };

  try {
    const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || 'OpenAI document analysis failed.' });
    const text = data.output_text || (data.output || []).flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
    if (!text) return res.status(502).json({ error: 'The AI returned no structured result.' });
    return res.status(200).json(JSON.parse(text));
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Document analysis failed.' });
  }
};
