const WEB_SID_BASE_PATH = './libs/websid/'
const WEB_SID_SCRIPTS = [
  `${WEB_SID_BASE_PATH}scriptprocessor_player.min.js`,
  `${WEB_SID_BASE_PATH}backend_tinyrsid.js`,
]

let runtimePromise = null

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.injected = 'true'
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true'
        resolve()
      },
      { once: true },
    )
    script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true })
    document.head.appendChild(script)
  })
}

async function waitForBackendReady() {
  const state = window.spp_backend_state_SID
  if (!state || state.notReady === false) {
    return
  }

  await new Promise((resolve) => {
    const previousCallback = state.adapterCallback
    state.adapterCallback = () => {
      previousCallback?.()
      resolve()
    }
  })
}

export function loadWebSIDRuntime() {
  if (runtimePromise) {
    return runtimePromise
  }

  runtimePromise = (async () => {
    for (const script of WEB_SID_SCRIPTS) {
      await loadScript(script)
    }

    await waitForBackendReady()

    if (!window.ScriptNodePlayer || !window.SIDBackendAdapter) {
      throw new Error('WebSID runtime failed to initialise')
    }
  })()

  return runtimePromise
}

