/* Chord Caddy song sync.
   The GitHub token lives here as an environment variable and never reaches
   the browser. The app talks to this function; this function talks to GitHub.

   Required Netlify environment variables:
     GITHUB_TOKEN   fine-grained PAT, Contents: Read and write, that repo only
     GITHUB_REPO    owner/repo        e.g. collinkriz/chord-caddy
   Optional:
     GITHUB_PATH    default songs.json
     GITHUB_BRANCH  default main
*/
const API = 'https://api.github.com';

function env() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return null;
  return {
    token, repo,
    path: process.env.GITHUB_PATH || 'songs.json',
    branch: process.env.GITHUB_BRANCH || 'main'
  };
}

const headers = t => ({
  Authorization: `Bearer ${t}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'chord-caddy'
});

const reply = (code, body) => ({
  statusCode: code,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  const cfg = env();
  if (!cfg) return reply(501, { error: 'not_configured',
    message: 'Set GITHUB_TOKEN and GITHUB_REPO in the Netlify site environment variables.' });

  const url = `${API}/repos/${cfg.repo}/contents/${encodeURIComponent(cfg.path)}`;

  try {
    if (event.httpMethod === 'GET') {
      const r = await fetch(`${url}?ref=${encodeURIComponent(cfg.branch)}`, { headers: headers(cfg.token) });
      if (r.status === 404) return reply(200, { songs: [], deleted: {}, sha: null });
      if (!r.ok) return reply(r.status, { error: 'github_read_failed', status: r.status });
      const j = await r.json();
      let parsed = { songs: [], deleted: {} };
      try {
        const text = Buffer.from(j.content || '', 'base64').toString('utf8');
        const v = JSON.parse(text);
        if (Array.isArray(v)) parsed = { songs: v, deleted: {} };
        else parsed = { songs: v.songs || [], deleted: v.deleted || {} };
      } catch (e) { /* unreadable file: treat as empty, never clobber below */ }
      return reply(200, { ...parsed, sha: j.sha });
    }

    if (event.httpMethod === 'PUT' || event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!Array.isArray(body.songs)) return reply(400, { error: 'bad_payload' });
      const content = Buffer.from(
        JSON.stringify({ songs: body.songs, deleted: body.deleted || {} }, null, 2)
      ).toString('base64');
      const payload = {
        message: body.message || `songs: ${body.songs.length} saved`,
        content, branch: cfg.branch
      };
      if (body.sha) payload.sha = body.sha;
      const r = await fetch(url, { method: 'PUT', headers: headers(cfg.token), body: JSON.stringify(payload) });
      if (r.status === 409 || r.status === 422)
        return reply(409, { error: 'conflict', message: 'The file changed since you last pulled.' });
      if (!r.ok) return reply(r.status, { error: 'github_write_failed', status: r.status });
      const j = await r.json();
      return reply(200, { ok: true, sha: j.content && j.content.sha });
    }

    return reply(405, { error: 'method_not_allowed' });
  } catch (e) {
    return reply(500, { error: 'unexpected', message: String(e && e.message || e) });
  }
};
