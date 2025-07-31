export default async function handler(req, res) {
  const feedUrl = 'https://www.oticareformada.com/feeds/posts/default?alt=json';

  const response = await fetch(feedUrl);
  const data = await response.json();

  const entries = data.feed.entry || [];

  const items = entries.map((entry) => {
    const loc = entry.link.find(l => l.rel === 'alternate').href;
    const lastmod = entry.updated.$t.substring(0, 10);
    return `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.status(200).send(xml);
}
