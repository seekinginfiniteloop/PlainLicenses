import { logger } from "~/utils"

interface CacheConfig {
  cacheName: string
  urls: string[]
  version: string
  worker: string
}

let meta: CacheConfig = { cacheName: "", urls: [], version: "", worker: "" }
let metaUrl = "assets/javascripts/workers/meta.json"

async function fetchMeta() {
  try {
    const response = await fetch(metaUrl)
    const data = await response.json()
    meta = data
  } catch (error) {
    logger.error("error fetching worker URL", error)
  }
}

function getWorkerUrl() {
  if (meta && meta["worker"]) {
    return meta["worker"]
  }
  return null
}

// get the cache worker registered
if ("serviceWorker" in navigator) {
  const resolveMeta = async () => {
    return await Promise.resolve(fetchMeta())
  }
  resolveMeta().then(() => {
    const workerUrl = getWorkerUrl()
    if (workerUrl && typeof workerUrl === "string") {
      navigator.serviceWorker.register(workerUrl, { scope: "/" }).then((registration) => {
        registration.active?.postMessage({ type: "CACHE_CONFIG", payload: meta })
      })
    }
  })
}
