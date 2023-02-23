import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm'

/**
 * MIXAMOとVRMのRigの対応表
 */
const mixamoVRMRigMap: any = {
  mixamorigHips: 'hips',
  mixamorigSpine: 'spine',
  mixamorigSpine1: 'chest',
  mixamorigSpine2: 'upperChest',
  mixamorigNeck: 'neck',
  mixamorigHead: 'head',
  mixamorigLeftShoulder: 'leftShoulder',
  mixamorigLeftArm: 'leftUpperArm',
  mixamorigLeftForeArm: 'leftLowerArm',
  mixamorigLeftHand: 'leftHand',
  mixamorigLeftHandThumb1: 'leftThumbMetacarpal',
  mixamorigLeftHandThumb2: 'leftThumbProximal',
  mixamorigLeftHandThumb3: 'leftThumbDistal',
  mixamorigLeftHandIndex1: 'leftIndexProximal',
  mixamorigLeftHandIndex2: 'leftIndexIntermediate',
  mixamorigLeftHandIndex3: 'leftIndexDistal',
  mixamorigLeftHandMiddle1: 'leftMiddleProximal',
  mixamorigLeftHandMiddle2: 'leftMiddleIntermediate',
  mixamorigLeftHandMiddle3: 'leftMiddleDistal',
  mixamorigLeftHandRing1: 'leftRingProximal',
  mixamorigLeftHandRing2: 'leftRingIntermediate',
  mixamorigLeftHandRing3: 'leftRingDistal',
  mixamorigLeftHandPinky1: 'leftLittleProximal',
  mixamorigLeftHandPinky2: 'leftLittleIntermediate',
  mixamorigLeftHandPinky3: 'leftLittleDistal',
  mixamorigRightShoulder: 'rightShoulder',
  mixamorigRightArm: 'rightUpperArm',
  mixamorigRightForeArm: 'rightLowerArm',
  mixamorigRightHand: 'rightHand',
  mixamorigRightHandPinky1: 'rightLittleProximal',
  mixamorigRightHandPinky2: 'rightLittleIntermediate',
  mixamorigRightHandPinky3: 'rightLittleDistal',
  mixamorigRightHandRing1: 'rightRingProximal',
  mixamorigRightHandRing2: 'rightRingIntermediate',
  mixamorigRightHandRing3: 'rightRingDistal',
  mixamorigRightHandMiddle1: 'rightMiddleProximal',
  mixamorigRightHandMiddle2: 'rightMiddleIntermediate',
  mixamorigRightHandMiddle3: 'rightMiddleDistal',
  mixamorigRightHandIndex1: 'rightIndexProximal',
  mixamorigRightHandIndex2: 'rightIndexIntermediate',
  mixamorigRightHandIndex3: 'rightIndexDistal',
  mixamorigRightHandThumb1: 'rightThumbMetacarpal',
  mixamorigRightHandThumb2: 'rightThumbProximal',
  mixamorigRightHandThumb3: 'rightThumbDistal',
  mixamorigLeftUpLeg: 'leftUpperLeg',
  mixamorigLeftLeg: 'leftLowerLeg',
  mixamorigLeftFoot: 'leftFoot',
  mixamorigLeftToeBase: 'leftToes',
  mixamorigRightUpLeg: 'rightUpperLeg',
  mixamorigRightLeg: 'rightLowerLeg',
  mixamorigRightFoot: 'rightFoot',
  mixamorigRightToeBase: 'rightToes',
}

/**
 * mixamo.comのモーションをVRMのRigに対応したAnimationClipに変換
 * 
 * 以下のコードのhumanoidAnimationを参考に作成
 * https://pixiv.github.io/three-vrm/packages/three-vrm/examples/
 * 
 * @param tracksName トラックの名前
 * @param fbx ロードしたFBXモデル
 * @param vrm VRMモデル
 * @returns VRM用AnimationClip
 */
export const convertMixamoTracks = (tracksName: string, fbx: THREE.Group, vrm: VRM): THREE.AnimationClip => {
  const clip = THREE.AnimationClip.findByName(fbx.animations, 'mixamo.com'); // extract the AnimationClip

  const tracks: any = []; // KeyframeTracks compatible with VRM will be added here
  const restRotationInverse = new THREE.Quaternion();
  const parentRestWorldRotation = new THREE.Quaternion();
  const _quatA = new THREE.Quaternion();
  const _vec3 = new THREE.Vector3();

  // Adjust with reference to hips height.
  const motionHipsHeight = fbx.getObjectByName('mixamorigHips')!.position.y;
  const vrmHipsY = vrm.humanoid?.getNormalizedBoneNode('hips')!.getWorldPosition(_vec3).y;
  const vrmRootY = vrm.scene.getWorldPosition(_vec3).y;
  const vrmHipsHeight = Math.abs(vrmHipsY - vrmRootY);
  const hipsPositionScale = vrmHipsHeight / motionHipsHeight;

  clip.tracks.forEach((track) => {

    // Convert each tracks for VRM use, and push to `tracks`
    const trackSplitted = track.name.split('.');
    const mixamoRigName = trackSplitted[0];
    const vrmBoneName = mixamoVRMRigMap[mixamoRigName];
    const vrmNodeName = vrm.humanoid?.getNormalizedBoneNode(vrmBoneName)?.name;
    const mixamoRigNode = fbx.getObjectByName(mixamoRigName);

    if (vrmNodeName != null) {

      const propertyName = trackSplitted[1];

      // Store rotations of rest-pose.
      mixamoRigNode!.getWorldQuaternion(restRotationInverse).invert();
      mixamoRigNode!.parent!.getWorldQuaternion(parentRestWorldRotation);

      if (track instanceof THREE.QuaternionKeyframeTrack) {

        // Retarget rotation of mixamoRig to NormalizedBone.
        for (let i = 0; i < track.values.length; i += 4) {

          const flatQuaternion = track.values.slice(i, i + 4);

          _quatA.fromArray(flatQuaternion);

          // 親のレスト時ワールド回転 * トラックの回転 * レスト時ワールド回転の逆
          _quatA
            .premultiply(parentRestWorldRotation)
            .multiply(restRotationInverse);

          _quatA.toArray(flatQuaternion);

          flatQuaternion.forEach((v, index) => {

            track.values[index + i] = v;

          });

        }

        tracks.push(
          new THREE.QuaternionKeyframeTrack(
            `${vrmNodeName}.${propertyName}`,
            track.times,
            track.values.map((v, i) => (vrm.meta?.metaVersion === '0' && i % 2 === 0 ? - v : v)),
          ),
        );

      } else if (track instanceof THREE.VectorKeyframeTrack) {
        const value = track.values.map((v, i) => (vrm.meta?.metaVersion === '0' && i % 3 !== 1 ? - v : v) * hipsPositionScale);
        tracks.push(new THREE.VectorKeyframeTrack(`${vrmNodeName}.${propertyName}`, track.times, value));
      }

    }

  });

  return new THREE.AnimationClip(tracksName, clip.duration, tracks);
}

/**
 * ユーザのGLTFを読み込む
 * 
 * @param userGLTFFile 読み込むGLTFファイル
 * @param manager ローディングマネージャ
 * @param fileReader ファイルレンダラ
 * @returns GLTFモデル
 */
export const userGLTFLoadAsync = async (userGLTFFile: File, 
                                        manager: THREE.LoadingManager = new THREE.LoadingManager(),
                                        fileReader: FileReader = new FileReader())
                                        : Promise<GLTF> => {
  fileReader.readAsArrayBuffer(userGLTFFile)
  const fileURL = URL.createObjectURL(userGLTFFile)
  manager.setURLModifier((url)=>url)
  const loader = new GLTFLoader(manager)
  return await loader.loadAsync(fileURL)
}

/**
 * ユーザのVRMを読み込む
 * 
 * @param userVRMFile 読み込むVRMファイル
 * @param manager ローディングマネージャ
 * @param fileReader ファイルレンダラ
 * @returns VRMモデル
 */
export const userVRMLoadAsync = async (userVRMFile: File,
                                       manager: THREE.LoadingManager = new THREE.LoadingManager(),
                                       fileReader: FileReader = new FileReader())
                                       : Promise<VRM> => {
  fileReader.readAsArrayBuffer(userVRMFile)
  const fileURL = URL.createObjectURL(userVRMFile)
  manager.setURLModifier((url)=>url)
  const loader = new GLTFLoader(manager)
  loader.register((parser) => (new VRMLoaderPlugin(parser)))
  const gltf = await loader.loadAsync(fileURL)
  return gltf.userData.vrm as VRM
}
