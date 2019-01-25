'use strict'

const url = require('url')
const xmlrpc = require('xmlrpc')
const uuid = require('uuid').v4

exports.init = loginInit

// SL uses its own tls-certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

function loginInit (server) {
  server.route({
    method: 'POST',
    path: '/login',
    handler: processLogin
  })
}

// Sends a login request as a XML-RPC post to the grid
function processLogin (request, reply) {
  getMacAddress(request)
    .then(function (mac) {
      const reqData = request.payload

      var loginURL
      if (reqData.grid && typeof reqData.grid.url === 'string') {
        loginURL = url.parse(reqData.grid.url)
      } else {
        loginURL = {
          host: 'login.agni.lindenlab.com',
          port: 443,
          path: '/cgi-bin/login.cgi'
        }
      }
      if (!loginURL || loginURL.host == null) {
        reply(400)
        return
      }
      var xmlrpcClient = loginURL.protocol == null || loginURL.protocol === 'https:'
        ? xmlrpc.createSecureClient(loginURL)
        : xmlrpc.createClient(loginURL) // osgrid uses http for login ... why??

      reqData.mac = mac // adding the needed mac-address

      ;[
        'grid',
        'viewerUserId'
      ].forEach(key => {
        reqData[key] = undefined
      })

      xmlrpcClient.methodCall('login_to_simulator', [reqData], (err, data) => {
        if (err) {
          reply(err)
        } else {
          var response = reply(undefined, data)
          response.type('application/json')
        }
      })
    })
    .catch(function (err) {
      reply(err)
    })
}

function getMacAddress (request) {
  // If it is a logged in user
  if ('viewerUserId' in request.payload) {
    return request.server.plugins.account.api.accounts.find(request.payload.viewerUserId, {
      include: 'profile'
    })

      .then(function (user) {
        // test the mac-address
        if ('mac' in user.profile && /(?:[a-fA-F\d]{2}:){5}[a-fA-F\d]{2}/i.test(user.profile.mac)) {
          return user.profile.mac
        } else {
          // Add a mac-address to the user
          return request.server.plugins.account.api.accounts.update(user, function (user) {
            user.profile.mac = generateMacAddress()
            return user
          }, {
            include: 'profile'
          })

            .then(function (user) {
              return user.profile.mac
            })
        }
      })
  } else {
    // new user
    return Promise.resolve(
      generateMacAddressFromIP(request.info.remoteAddress)
    )
  }
}

function generateMacAddress (userId) {
  // generate a UUID and transfrom it into a "MAC"-address
  const num = uuid().replace(/-/g, '').slice(0, 12)

  let mac = ''
  for (let i = 0; i < 6; ++i) {
    const index = i * 2
    const sep = i === 0 ? '' : ':'
    mac += `${sep}${num.charAt(index)}${num.charAt(index + 1)}`
  }
  return mac
}

function generateMacAddressFromIP (ip) {
  const ip4 = ip.split('.')
  if (ip4.length === 4) {
    const hexNum = ip4.map(part => parseInt(part, 10).toString(16).padStart(2, '0'))
    return '00:00:' + hexNum.join(':')
  }

  // is IPv6
  const ip6 = ip.replace(/:/g, '')
  let resultAddress = ''

  for (let i = 0; i < 12; ++i) {
    const index = ip6.length - (i + 1)
    const char = index < 0 ? '0' : ip6.charAt(index)
    resultAddress = char + resultAddress

    if (i % 2 === 1) {
      resultAddress = ':' + resultAddress
    }
  }
  return resultAddress.substring(1)
}
