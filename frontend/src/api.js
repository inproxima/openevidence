// Thin client for the FastAPI backend. All requests carry the Auth0 token when login is on.

async function headers(getToken, extra = {}) {
  const token = await getToken()
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra }
}

async function json(res) {
  if (!res.ok) {
    let detail = res.statusText
    try {
      detail = (await res.json()).detail || detail
    } catch {
      /* not JSON */
    }
    throw new Error(detail)
  }
  return res.status === 204 ? null : res.json()
}

export const api = {
  config: () => fetch('/api/config').then(json),
  threads: async (getToken) => fetch('/api/threads', { headers: await headers(getToken) }).then(json),
  thread: async (getToken, id) => fetch(`/api/threads/${id}`, { headers: await headers(getToken) }).then(json),
  rename: async (getToken, id, title) =>
    fetch(`/api/threads/${id}`, {
      method: 'PATCH',
      headers: await headers(getToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ title }),
    }).then(json),
  remove: async (getToken, id) =>
    fetch(`/api/threads/${id}`, { method: 'DELETE', headers: await headers(getToken) }).then(json),
}

/**
 * POST /api/ask and read its Server-Sent Events from the response body.
 * EventSource can't POST or send headers, so the stream is parsed by hand.
 * Calls onEvent(name, data) for each event; resolves when the stream ends.
 */
export async function streamAsk(getToken, body, onEvent, signal) {
  const res = await fetch('/api/ask', {
    method: 'POST',
    headers: await headers(getToken, { 'Content-Type': 'application/json', Accept: 'text/event-stream' }),
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok || !res.body) {
    await json(res)
    throw new Error('No response stream')
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += value.replace(/\r\n/g, '\n')
    let split
    while ((split = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, split)
      buffer = buffer.slice(split + 2)
      let event = 'message'
      const data = []
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
      }
      if (!data.length) continue // keep-alive comment
      try {
        onEvent(event, JSON.parse(data.join('\n')))
      } catch (err) {
        console.error('Bad event', event, err)
      }
    }
  }
}
