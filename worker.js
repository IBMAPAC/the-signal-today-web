export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return new Response('Missing url parameter', { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    try {
      const response = await fetch(targetUrl, { headers: { 'User-Agent': 'SignalWeb/1.0' } });
      const body = await response.text();
      return new Response(body, { headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/xml' } });
    } catch (error) {
      return new Response('Error: ' + error.message, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
  }
};
