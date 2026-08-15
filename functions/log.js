export async function onRequest(context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (context.request.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, message: 'Method not allowed' }),
      { status: 405, headers }
    );
  }

  let data;
  try {
    data = await context.request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, message: 'Invalid JSON' }),
      { status: 400, headers }
    );
  }

  const timestamp = data.timestamp ?? new Date().toLocaleString();
  const cfData = context.request.cf || {};
  const ip = context.request.headers.get('CF-Connecting-IP') || 'Unknown';
  const country = cfData.country || 'Unknown';
  const city = cfData.city || 'Unknown';

  const embed = {
    embeds: [
      {
        title: '📥 MeloSarisa Download Log',
        description: '**Action: Download Started**',
        color: 4437377,
        fields: [
          { name: '📌 Button Clicked', value: data.buttonName ?? 'Unknown', inline: false },
          { name: '🕐 Timestamp', value: timestamp, inline: false },
          { name: '📄 Page', value: data.pageUrl ?? 'Unknown', inline: false },
          { name: '🌐 User Agent', value: '```' + (data.userAgent ?? 'Unknown') + '```', inline: false },
          { name: '💻 Platform', value: data.platform ?? 'Unknown', inline: true },
          { name: '🌍 Location', value: `${city}, ${country}`, inline: true },
          { name: '🔗 IP', value: ip, inline: true },
        ],
        footer: { text: 'MeloSarisa Logger • ' + timestamp },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const webhookUrl = 'https://discord.com/api/webhooks/1538123735188504647/1wcXM65sQNDRsZEUCQVvGOJfRZzTjgmw0hQren6wNbeX_0GPaeMC38vxu8nX0ylrQayH';

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed),
    });

    if (res.ok) {
      return new Response(
        JSON.stringify({ success: true, message: 'Log sent successfully' }),
        { status: 200, headers }
      );
    } else {
      return new Response(
        JSON.stringify({ success: true, message: 'Logged' }),
        { status: 200, headers }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ success: true, message: 'Logged' }),
      { status: 200, headers }
    );
  }
}
