'use strict';

// 腾讯云 SCF「Web 函数」版代理：监听 9000 端口，把请求转发给 DeepSeek，隐藏 API Key。
// 适用：函数类型选择「Web 函数」，启动文件 index.js，监听端口 9000。

const http = require('http');
const https = require('https');

const PORT = 9000;

const server = http.createServer(function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'method not allowed' }));
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'DEEPSEEK_API_KEY is not configured' }));
    return;
  }

  let raw = '';
  req.on('data', function (chunk) { raw += chunk; });
  req.on('end', function () {
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid JSON body' }));
      return;
    }

    const bodyString = JSON.stringify(payload);
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
        res.writeHead(upRes.statusCode || 200, { 'Content-Type': 'application/json' });
        res.end(data);
      });
    });

    upstream.on('timeout', function () { upstream.destroy(new Error('upstream timeout')); });
    upstream.on('error', function (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'upstream error: ' + err.message }));
    });
    upstream.write(bodyString);
    upstream.end();
  });
});

server.listen(PORT, function () {});
