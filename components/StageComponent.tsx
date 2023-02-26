import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Canvas, useThree, ThreeElements, useLoader, useFrame } from '@react-three/fiber'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { VRM } from '@pixiv/three-vrm'
import { PlayerComponent } from '@/components/PlayerComponent'
import { convertMixamoTracks } from '@/libs/VRMControlSystem'
import { transition } from '@/libs/TransitionProtocol'
import * as THREE from 'three'
import { TextureLoader } from 'three/src/loaders/TextureLoader'

const Floor = (props: ThreeElements['mesh']) => {
    return (
    <mesh {...props} position={[0, -0.0001, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[5*2, 5*2, 0]}>
      <planeGeometry />
      <meshStandardMaterial color="green" emissive="green" emissiveIntensity={0.8} metalness={0.8} roughness={0.2} side={THREE.DoubleSide} />
    </mesh>
    )
}

const WarpHole = (props: ThreeElements['mesh']) => {
    
    const ref = useRef<THREE.Mesh>(null!)
    
    const colorMap = useLoader(TextureLoader, '/assets/texture/ワープホール1.png')

    useFrame((state, delta) => {
        ref.current.rotation.z += (Math.PI / 16) * delta
    })

    return (
        <mesh {...props} ref={ref} scale={[1*2, 1*2, 0]}>
          <planeGeometry />
          <meshStandardMaterial transparent map={colorMap} emissiveMap={colorMap} side={THREE.DoubleSide} />
        </mesh>
    )
}

const SkyBox = () => {
    const { scene } = useThree()
    const loader = new THREE.CubeTextureLoader()

    const texture = loader.load([
        '/assets/skybox/px.png', '/assets/skybox/nx.png',
        '/assets/skybox/py.png', '/assets/skybox/ny.png',
        '/assets/skybox/pz.png', '/assets/skybox/nz.png'
    ])

    scene.background = texture
    return null
}

/**
 * メインのステージ
 * 
 * @returns キャンバス
 */
export const StageComponent: React.FC<{ vrm: VRM }> = (props: { vrm: VRM }) => {

    // vrmを保持する
    const [vrm, setVrm] = useState<VRM>()

    // モーションを保持する
    const [idol, setIdol] = useState<THREE.AnimationClip>()
    const [walk, setWalk] = useState<THREE.AnimationClip>()

    // ワープ関連
    const warpPositionRef = useRef(new THREE.Vector3(0, 1, -3))
    const [isWarped, setIsWarped] = useState<boolean>(false)

    // VRMの初期化
    useEffect(() => {
        setVrm(props.vrm)
    }, [props.vrm])

    // アニメーションの初期化
    useEffect(() => {
        if (!vrm) return
        const loader = new FBXLoader()
        loader.load(`/assets/animation/Happy Idle.fbx`, 
                    (fbx) => { setIdol(convertMixamoTracks('idol', fbx, vrm)) })
        loader.load(`/assets/animation/Walking.fbx`,
                    (fbx) => { setWalk(convertMixamoTracks('walk', fbx, vrm)) })
    }, [vrm])

    // プレイヤーがエリア外に出たら遷移
    const playerFrameEvent = useCallback((player: VRM) => {
        if (
            (
                warpPositionRef.current.x + 0.8 > player.scene.position.x &&
                warpPositionRef.current.x - 0.8 < player.scene.position.x
            ) &&
            (
                warpPositionRef.current.z + 0.1 > player.scene.position.z &&
                warpPositionRef.current.z - 0.1 < player.scene.position.z
            ) &&
            !isWarped
        ) {
            setIsWarped(true)
            transition(new URL('http://localhost:3000/'))
        }
    }, [vrm, isWarped])

    return (<Canvas camera={{
        fov: 45,
        near: 0.1,
        far: 1000,
        position: [0, 3.5, 2]
    }}>
        <SkyBox />
        <ambientLight />
        <directionalLight position={[3, 3, 3]} intensity={0.4} color="ivory" />
        <Floor />
        <WarpHole position={warpPositionRef.current} />
        <PlayerComponent onFrameEvent={playerFrameEvent} playerModel={vrm} 
                         idolClip={idol} walkClip={walk} />
        <gridHelper />
    </Canvas>)
}