'use strict';

// 腾讯云函数（SCF）+ API 网关触发：把请求转发给 DeepSeek，隐藏 API Key。
// 前端只调用这个函数的 URL，不直接接触 DeepSeek Key。

const https = require('https');

exports.main_handler = async (event, context) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  const method = event.httpMethod || (event.requestContext && event.requestContext.httpMethod) || '';
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'DEEPSEEK_API_KEY is not configured' }) };
  }

  let payload;
  try {
    payload = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch (e) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'invalid JSON body' }) };
  }

  const bodyString = JSON.stringify(payload);

  const upstream = await new Promise(function (resolve) {
    const req = https.request({
      hostname: 'api.deepseek.com',
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyString),
        'Authorization': 'Bearer ' + apiKey
      },
      timeout: 30000
    }, function (res) {
      let data = '';
      res.on('data', function (chunk) { data += chunk; });
      res.on('end', function () { resolve({ statusCode: res.statusCode, body: data }); });
    });
    req.on('timeout', function () { req.destroy(new Error('upstream timeout')); });
    req.on('error', function (err) { resolve({ statusCode: 502, body: JSON.stringify({ error: 'upstream error: ' + err.message }) }); });
    req.write(bodyString);
    req.end();
  });

  return { statusCode: upstream.statusCode, headers: cors, body: upstream.body };
};
