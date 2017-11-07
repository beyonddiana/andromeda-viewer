'use strict'

const fetch = require('node-fetch')

function proxy (request, reply) {
  const fetchOptions = {
    method: request.headers['x-andromeda-fetch-method'] || 'GET',
    headers: {
      'content-type': request.headers['x-andromeda-fetch-type'],
      'user-agent': request.headers['user-agent'],
      origin: request.headers.origin,
      'accept-encoding': request.headers['accept-encoding'],
      'accept-language': request.headers['accept-language']
    },
    body: request.payload
  }

  fetch(request.headers['x-andromeda-fetch-url'], fetchOptions).then(fetchResult => {
    fetchResult.buffer().then(buffy => {
      const response = reply(buffy)
      ;[
        'content-type',
        'x-ll-request-id'
      ].forEach(key => { response.headers[key] = fetchResult.headers.get(key) })
    })
  })
}

exports.init = function httpProxy (server) {
  server.route({
    method: 'POST',
    path: '/proxy',
    handler: proxy
  })
}
