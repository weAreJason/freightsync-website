const https = require('https');

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { email, name } = body;
  if (!email) {
    return { statusCode: 400, body: 'Email is required' };
  }

  const payload = JSON.stringify({
    email: email,
    attributes: { FIRSTNAME: name || '' },
    listIds: [3],
    updateEnabled: true
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.brevo.com',
      path: '/v3/contacts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 204) {
          resolve({ statusCode: 200, body: JSON.stringify({ success: true }) });
        } else {
          resolve({ statusCode: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ statusCode: 500, body: e.message });
    });

    req.write(payload);
    req.end();
  });
};
