const { redis, newId, readBody, requireAdmin, wrap } = require('../lib/db');

module.exports = wrap(async (req, res) => {
  if (req.method === 'GET') {
    const id = String((req.query && req.query.id) || '');
    if (!/^[a-z0-9]{6,12}$/.test(id)) return res.status(404).json({ error: 'not_found' });
    const raw = await redis(['HGET', 'classes', id]);
    if (!raw) return res.status(404).json({ error: 'not_found' });
    const c = JSON.parse(raw);
    return res.status(200).json({ id: c.id, name: c.name, age: c.age });
  }
  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;
    const b = readBody(req);
    const name = String(b.name || '').trim().slice(0, 30);
    const age = String(b.age);
    if (!name || !['0', '1', '2', '3', 't0', 't1', 't2'].includes(age)) return res.status(400).json({ error: 'bad_request' });
    const id = newId();
    const c = { id, name, age, createdAt: new Date().toISOString() };
    await redis(['HSET', 'classes', id, JSON.stringify(c)]);
    return res.status(201).json(c);
  }
  return res.status(405).json({ error: 'method' });
});
