import { database, PlayerModel } from "./IndexedDBModel"

/**
 * IndexedDBにFile型でVRMモデルを格納する
 * @param model 格納するVRMファイル
 */
export const setFile = async (model: File): Promise<void> => {
  const filenameSplit = model.name.split('.')
  const extension = filenameSplit[filenameSplit.length - 1]
  if (extension !== 'vrm') throw new Error(`is not vrm file`)
  try {
    await database.models.add({ item: model })
  } catch (error) {
    throw new Error(`file load error.\n${error}`)
  }
}

/**
 * IndexedDBに格納されているすべての要素を受け取る
 * @returns データベースの一覧
 */
export const getFiles = async (): Promise<PlayerModel[]> => {
  return await database.models.toArray()
}

/**
 * 遷移する
 * @param toUrl 遷移先URL
 * @param fromUrlTransition VRMを送るためにiFrameに埋め込むべき送信元URL(default: {origin}/transition)
 */
export const transition = (toUrl: URL, fromUrlTransition: URL = new URL(`${window.location.origin}/transition`)): void => {
  toUrl.searchParams.append('url', fromUrlTransition.toString())
  location.href = toUrl.toString()
}

/**
 * VRMを送るためにiframeの子オブジェクトから親オブジェクトにデータを送る(別ページのonload)
 * @param toUrlOrigin 遷移元Origin
 */
export const send = async (toUrlOrigin: string): Promise<void> => {
  if (!window || !window.parent || window.parent === window) return
  const modelList = await database.models.toArray()
  if (modelList.length <= 0) return 
  const model = modelList[modelList.length - 1]
  window.parent.postMessage(model, toUrlOrigin)
}

/**
 * VRMを受け取るためiframeを配置
 * @param fromUrl 
 * @returns 
 */
export const receive = async (fromUrl: URL): Promise<PlayerModel> => {
  return new Promise((resolve, reject) => {
    const sp = new URLSearchParams(fromUrl.searchParams)
    if (sp.has('url')) {
      const iframe = document.createElement('iframe') as HTMLIFrameElement
      iframe.src = sp.get('url')!
      iframe.width = `${0}`
      iframe.height = `${0}`
      document.body.appendChild(iframe)
      window.addEventListener('message', async (event) => {
        if (event.data['item']) {
          resolve(event.data)
          iframe.remove()
        }
      }, false)
    } else {
      reject('file load error.')
    }
  })
}

