// netlify/functions/football.js
exports.handler = async (event) => {
  const API_TOKEN = process.env.FOOTBALL_API_TOKEN || 'e510c1e3f20148c2a77afcc9ddbe7bf6';
  const API_BASE = 'https://api.football-data.org/v4';

  const { path, ...rest } = event.queryStringParameters || {};

  if (!path) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Missing path parameter' }),
    };
  }

  const qs = new URLSearchParams(rest).toString();
  const url = `${API_BASE}/${path}${qs ? '?' + qs : ''}`;

  try {
    const res = await fetch(url, {
      headers: { 'X-Auth-Token': API_TOKEN },
    });

    const text = await res.text();

    return {
      statusCode: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
      body: text,
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Proxy fetch failed: ' + err.message }),
    };
  }
};
