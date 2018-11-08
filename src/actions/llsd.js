import LLSD from '../llsd'
import caps from './capabilities.json'

async function parseLLSD (response) {
  const body = await response.text()
  return LLSD.parse(response.headers.get('content-type'), body)
}

export async function fetchLLSD (method, url, data = null, mimeType = LLSD.MIMETYPE_XML) {
  const response = await minimalFetchLLSD(method, url, data, mimeType)

  switch (response.headers.get('content-type')) {
    case 'application/llsd+binary':
    case 'application/llsd+json':
    case 'application/llsd+xml':
      return parseLLSD(response)

    default:
      throw new Error(await response.text())
  }
}

async function minimalFetchLLSD (method, url, data = null, mimeType = LLSD.MIMETYPE_XML) {
  const headers = new window.Headers()
  headers.append('content-type', 'text/plain')
  headers.append('x-andromeda-fetch-url', url)
  headers.append('x-andromeda-fetch-method', method)
  headers.append('x-andromeda-fetch-type', mimeType)

  const body = data == null ? undefined : LLSD.format(mimeType, data)

  return window.fetch('/hoodie/andromeda-viewer/proxy', {
    method: 'POST',
    headers,
    body
  })
}

export function fetchSeedCapabilities (url) {
  return async dispatch => {
    try {
      const capabilities = await fetchLLSD('POST', url, caps)
      dispatch({
        type: 'SeedCapabilitiesLoaded',
        capabilities
      })
      dispatch(activateEventQueue())
    } catch (error) {
      console.error(error)
    }
  }
}

// http://wiki.secondlife.com/wiki/EventQueueGet
async function * eventQueueGet (getState) {
  const url = getState().session.get('eventQueueGetUrl')
  let ack = 0

  while (getState().session.get('loggedIn')) {
    let response
    try {
      response = await minimalFetchLLSD('POST', url, { done: false, ack })
    } catch (err) {
      // network error?
      console.error(err)
      continue
    }

    if (response.status >= 200 && response.status < 300) {
      const body = await parseLLSD(response)
      ack = body.id
      yield body.events
    } else if (response.status === 404) { // Session did end
      return []
    } else if (response.status === 502) {
      // Request did Timeout. This is not an error! This is expected.
      // The EventQueue server is a proxy. If the server behind the proxy times out, than the
      // EventQueue server interprets this as a generic error and returns a 502.
      continue
    } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
      // Some error did happen!
      throw new Error(`${response.status} - ${response.statusText}\n\n${await response.text()}`)
    } else {
      await new Promise(resolve => { setTimeout(resolve, 200) })
      continue
    }
  }

  fetchLLSD('POST', url, { done: true, ack })
}

function activateEventQueue () {
  return async (dispatch, getState) => {
    for await (const eventQueueEvents of eventQueueGet(getState)) {
      for (const event of eventQueueEvents) {
        try {
          dispatch({
            type: 'EVENT_QUEUE_' + event.message,
            message: event.message,
            body: event.body
          })
        } catch (err) {
          console.error(err)
        }
      }
    }
  }
}
