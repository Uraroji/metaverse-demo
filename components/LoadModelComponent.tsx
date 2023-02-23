import React, { useCallback } from 'react'
import { setFile } from '@/libs/TransitionProtocol'
import { VRM } from '@pixiv/three-vrm'
import { userVRMLoadAsync } from '@/libs/VRMControlSystem'

/**
 * モデルを読み込むための引数
 */
type LoadModelProps = {
  onFileLoad: (vrm: VRM) => void
}

/**
 * モデルを読み込むコンポーネント
 * @param props コンポーネントの引数
 * @returns 読み込むためのUI
 */
export const LoadModelComponent = (props: LoadModelProps) => {

  /**
   * VRMを読み込む
   */
  const loadVrm = useCallback((event:  React.ChangeEvent<HTMLInputElement>): void => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[event.target.files.length - 1]
      setFile(file)
      .then(async () => { return await userVRMLoadAsync(file) })
      .then((vrm) => {
        if (props.onFileLoad) 
          props.onFileLoad(vrm)
      })
    }
  }, [])

  return (<>
    <h1>VRM読み込み</h1>
    <input type="file" accept=".vrm" onChange={(event) => {
      loadVrm(event)
    }}/>
  </>)
}