const { redis, newId, readBody, wrap } = require('../lib/db');

module.exports = wrap(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const b = readBody(req);
  const classId = String(b.classId || '');
  if (!/^[a-z0-9]{6,12}$/.test(classId)) return res.status(404).json({ error: 'not_found' });
  const answers = b.answers;
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return res.status(400).json({ error: 'bad_request' });
  if (JSON.stringify(answers).length > 12000) return res.status(413).json({ error: 'too_large' });

  const clean = {};
  for (const k of Object.keys(answers)) {
    if (!/^[a-z0-9_]{1,30}$/.test(k)) continue;
    const v = answers[k];
    if (Array.isArray(v)) {
      clean[k] = v.slice(0, 30).map((x) => String(x).slice(0, 200));
    } else if (typeof v === 'string') {
      clean[k] = v.slice(0, 1000);
    }
  }
  if (!clean.child || !String(clean.child).trim()) return res.status(400).json({ error: 'bad_request' });

  const exists = await redis(['HGET', 'classes', classId]);
  if (!exists) return res.status(404).json({ error: 'not_found' });
  const n = Number(await redis(['HLEN', 'resp:' + classId])) || 0;
  if (n >= 500) return res.status(429).json({ error: 'full' });

  const id = newId();
  const rec = { id, at: new Date().toISOString(), answers: clean };
  await redis(['HSET', 'resp:' + classId, id, JSON.stringify(rec)]);
  return res.status(201).json({ ok: true });
});
