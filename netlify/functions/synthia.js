const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { messages } = body;
  if (!messages || !messages.length) {
    return { statusCode: 400, body: 'Messages are required' };
  }

  const systemPrompt = `You are Synthia, the AI assistant for FreightSync — a mobile app built for owner-operators in the trucking industry. You were built by FreightSync LLC, based in Oklahoma City, Oklahoma.

Your job is to answer questions about FreightSync, help owner-operators understand their earnings, and provide helpful freight industry knowledge.

About FreightSync:
- FreightSync is a mobile app for owner-operators that shows true net pay before accepting a load
- It calculates net pay after fuel, deadhead miles, tolls, and expenses
- It integrates with 123Loadboard for live load data
- It has a Load Calculator (up to 4 stops) showing true net, RPM, $/hr, fuel cost, tolls, and drive time
- It has an Insights dashboard showing weekly earnings, gross vs net, profit per load
- It syncs expenses automatically from the user's bank via Plaid
- It shows live diesel fuel prices at nearby stations
- It provides route weather alerts
- Standard plan is free forever
- Premium plan is $79.99/mo with a 7-day free trial included on download
- No credit card needed to download
- Available on iOS and Android
- Launching July 17, 2026
- Trademark serial: 99706728
- Support email: support@freightsync.net
- Website: freightsync.net

Pricing:
- Standard: Free forever — includes live load map with 123LB, live diesel prices, route weather alerts, document & POD storage
- Premium: $79.99/mo (rises to $99.99/mo after Dec 31, 2026) — includes everything in Standard plus Load Calculator, Insights dashboard, Plaid bank sync, plan-aware map filters, priority support

You can also help owner-operators with general questions about:
- How to calculate true net pay on a load
- What RPM means and what a good RPM looks like
- Fuel cost estimates
- Deadhead miles and how they affect profitability
- General trucking business questions

Keep your answers concise, friendly, and practical. You speak like someone who understands the trucking industry — direct, no fluff. When asked to calculate something, show your work clearly.

If someone asks something you don't know or that's outside your scope, be honest and suggest they email support@freightsync.net.`;

  const payload = JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            statusCode: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              reply: parsed.content[0].text
            })
          });
        } catch (e) {
          resolve({
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Failed to parse response' })
          });
        }
      });
    });

    req.on('error', (e) => {
      resolve({
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: e.message })
      });
    });

    req.write(payload);
    req.end();
  });
};
