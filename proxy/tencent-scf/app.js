// 腾讯云 SCF「Web 函数」Express 版代理。
// 用法：粘贴到 Cloud Studio 的 app.js，保持监听端口 9000，部署即可。

const express = require('express');
const https = require('https');

const app = express();
const port = 9000;

app.use(express.json({ limit: '1mb' }));

app.use(function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'DEEPSEEK_API_KEY is not configured' });
    return;
  }

  const bodyString = JSON.stringify(req.body || {});
  const upstream = https.request({
    hostname: 'api.deepseek.com',
    path: '/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bodyString),
      'Authorization': 'Bearer ' + apiKey
    },
    timeout: 30000
  }, function (upRes) {
    let data = '';
    upRes.on('data', function (chunk) { data += chunk; });
    upRes.on('end', function () {
      res.status(upRes.statusCode || 200).type('application/json').send(data);
    });
  });

  upstream.on('timeout', function () { upstream.destroy(new Error('upstream timeout')); });
  upstream.on('error', function (err) {
    res.status(502).json({ error: 'upstream error: ' + err.message });
  });
  upstream.write(bodyString);
  upstream.end();
});

app.listen(port, function () {
  console.log('mystery-restart proxy listening on ' + port);
});
