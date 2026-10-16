const { redis, toObj, wrap, requireAdmin } = require('../lib/db');

module.exports = wrap(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  if (req.method === 'GET') {
    const all = toObj(await redis(['HGETALL', 'classes']));
    const list = Object.values(all).map((s) => JSON.parse(s));
    list.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    const counts = await Promise.all(list.map((c) => redis(['HLEN', 'resp:' + c.id])));
    list.forEach((c, i) => {
      c.count = Number(counts[i]) || 0;
    });
    return res.status(200).json({ classes: list });
  }
  if (req.method === 'DELETE') {
    const id = String((req.query && req.query.id) || '');
    if (!/^[a-z0-9]{6,12}$/.test(id)) return res.status(400).json({ error: 'bad_request' });
    await redis(['DEL', 'resp:' + id]);
    await redis(['HDEL', 'classes', id]);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'method' });
});
