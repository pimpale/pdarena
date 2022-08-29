const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api/auth/',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8079/public/',
    })
  );
  app.use(
    '/api/pdarena/',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8080/public/',
    })
  );
  // WARNING: extrmely weird and buggy ...
  // breaks a lot
  app.use(
    createProxyMiddleware({
      pathFilter: '/api/pdarena/ws/',
      pathRewrite: {'^/api/pdarena/ws/': ''},
      ws: true,
      target: 'ws://127.0.0.1:8080/public/ws/',
    })
  );
};
