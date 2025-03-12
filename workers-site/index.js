import { getAssetFromKV } from '@cloudflare/kv-asset-handler'

addEventListener('fetch', event => {
  event.respondWith(handleEvent(event))
})

async function handleEvent(event) {
  try {
    // Try to get the asset from KV
    return await getAssetFromKV(event)
  } catch (e) {
    // If the page is not found, return the index.html for client-side routing
    if (e.status === 404) {
      const notFoundResponse = await getAssetFromKV(event, {
        mapRequestToAsset: req => new Request(`${new URL(req.url).origin}/index.html`, req),
      })

      return new Response(notFoundResponse.body, {
        ...notFoundResponse,
        status: 200,
      })
    }

    return new Response(e.message || 'Error', { status: e.status || 500 })
  }
} 