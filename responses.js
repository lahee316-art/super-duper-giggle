const { redis, toObj, wrap, requireAdmin } = require('../lib/db');

module.exports = wrap(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const q = req.query || {};
  if (req.method === 'GET') {
    const which = String(q.class || '');
    const all = toObj(await redis(['HGETALL', 'classes']));
    let classes = Object.values(all).map((s) => JSON.parse(s));
    if (which && which !== 'all') classes = classes.filter((c) => c.id === which);
    classes.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    const lists = await Promise.all(classes.map((c) => redis(['HGETALL', 'resp:' + c.id])));
    classes.forEach((c, i) => {
      const rows = Object.values(toObj(lists[i])).map((s) => JSON.parse(s));
      rows.sort((a, b) => String(a.at).localeCompare(String(b.at)));
      c.responses = rows;
    });
    return res.status(200).json({ classes });
  }
  if (req.method === 'DELETE') {
    const cid = String(q.class || '');
    const rid = String(q.id || '');
    if (!/^[a-z0-9]{6,12}$/.test(cid) || !/^[a-z0-9]{6,12}$/.test(rid)) return res.status(400).json({ error: 'bad_request' });
    await redis(['HDEL', 'resp:' + cid, rid]);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'method' });
});
