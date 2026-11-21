import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { AvatarState } from '../../types';
import { useHumanAnimation } from './useHumanAnimation';
import { useLipSync } from './useLipSync';

interface HumanModelProps {
  avatarState: AvatarState;
  isSpeaking: boolean;
  audioLevel?: number;
}

export const HumanModel: React.FC<HumanModelProps> = ({
  avatarState,
  isSpeaking,
  audioLevel = 0,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const gltf = useGLTF('/models/digital_human.glb');

  // Animation & Lip Sync controllers
  const { updateAnimation } = useHumanAnimation(avatarState);
  const { updateLipSync } = useLipSync(isSpeaking, audioLevel);

  // Cache SkinnedMeshes with morph targets and optimize PBR shaders
  const morphMeshes = useMemo(() => {
    const list: THREE.SkinnedMesh[] = [];

    gltf.scene.traverse((node) => {
      // Hide glasses if present so eye contact, blinking, and expressions are crystal clear
      if (node.name.toLowerCase().includes('glasses')) {
        node.visible = false;
      }

      if ((node as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = node as THREE.SkinnedMesh;
        if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
          list.push(mesh);
        }

        // PBR Shader material enhancements for human realism
        if (mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;

          // Realistic skin texture: natural pores, soft specular falloff
          if (mesh.name.toLowerCase().includes('head') || mesh.name.toLowerCase().includes('body')) {
            mat.roughness = 0.65;
            mat.metalness = 0.02;
            mat.envMapIntensity = 1.05;
          }

          // Wet corneal eye reflections
          if (mesh.name.toLowerCase().includes('eye')) {
            mat.roughness = 0.05;
            mat.metalness = 0.08;
            mat.envMapIntensity = 2.2;
          }

          // Teeth enamel translucency & shine
          if (mesh.name.toLowerCase().includes('teeth')) {
            mat.roughness = 0.22;
            mat.metalness = 0.02;
          }

          // Realistic hair rendering with alpha testing
          if (mesh.name.toLowerCase().includes('hair')) {
            mat.roughness = 0.8;
            mat.alphaTest = 0.45;
            mat.depthWrite = true;
          }

          // Clothing fabric matte texture
          if (mesh.name.toLowerCase().includes('outfit')) {
            mat.roughness = 0.88;
            mat.metalness = 0.01;
          }
        }
      }
    });

    return list;
  }, [gltf]);

  // Find head and neck bones for natural gaze/breathing kinematics
  const bones = useMemo(() => {
    let head: THREE.Bone | null = null;
    let neck: THREE.Bone | null = null;
    let spine: THREE.Bone | null = null;

    gltf.scene.traverse((node) => {
      if ((node as THREE.Bone).isBone) {
        const name = node.name.toLowerCase();
        if (name.includes('head') && !head) head = node as THREE.Bone;
        if (name.includes('neck') && !neck) neck = node as THREE.Bone;
        if ((name.includes('spine') || name.includes('chest')) && !spine) spine = node as THREE.Bone;
      }
    });

    return { head, neck, spine };
  }, [gltf]);

  // Frame animation loop (60 FPS)
  useFrame((state, delta) => {
    // 1. Update procedural biological movements & gaze
    const facialWeights = updateAnimation(delta, bones.head, bones.neck);

    // 2. Update real-time viseme lip synchronization
    const lipWeights = updateLipSync(delta);

    // 3. Combine weights and write into all SkinnedMeshes
    for (let m = 0; m < morphMeshes.length; m++) {
      const mesh = morphMeshes[m];
      const dict = mesh.morphTargetDictionary!;
      const influences = mesh.morphTargetInfluences!;

      // Apply lip sync
      if (dict.jawOpen !== undefined) influences[dict.jawOpen] = lipWeights.jawOpen;
      if (dict.mouthFunnel !== undefined) influences[dict.mouthFunnel] = lipWeights.mouthFunnel;
      if (dict.mouthPucker !== undefined) influences[dict.mouthPucker] = lipWeights.mouthPucker;
      if (dict.mouthStretchLeft !== undefined) influences[dict.mouthStretchLeft] = lipWeights.mouthStretchLeft;
      if (dict.mouthStretchRight !== undefined) influences[dict.mouthStretchRight] = lipWeights.mouthStretchRight;
      if (dict.mouthClose !== undefined) influences[dict.mouthClose] = lipWeights.mouthClose;
      if (dict.mouthUpperUpLeft !== undefined) influences[dict.mouthUpperUpLeft] = lipWeights.mouthUpperUpLeft;
      if (dict.mouthUpperUpRight !== undefined) influences[dict.mouthUpperUpRight] = lipWeights.mouthUpperUpRight;
      if (dict.mouthLowerDownLeft !== undefined) influences[dict.mouthLowerDownLeft] = lipWeights.mouthLowerDownLeft;
      if (dict.mouthLowerDownRight !== undefined) influences[dict.mouthLowerDownRight] = lipWeights.mouthLowerDownRight;

      // Apply blinking & eyes
      if (dict.eyeBlinkLeft !== undefined) influences[dict.eyeBlinkLeft] = facialWeights.eyeBlinkLeft;
      if (dict.eyeBlinkRight !== undefined) influences[dict.eyeBlinkRight] = facialWeights.eyeBlinkRight;
      if (dict.eyeSquintLeft !== undefined) influences[dict.eyeSquintLeft] = facialWeights.eyeSquintLeft;
      if (dict.eyeSquintRight !== undefined) influences[dict.eyeSquintRight] = facialWeights.eyeSquintRight;
      if (dict.eyeWideLeft !== undefined) influences[dict.eyeWideLeft] = facialWeights.eyeWideLeft;
      if (dict.eyeWideRight !== undefined) influences[dict.eyeWideRight] = facialWeights.eyeWideRight;

      // Eye gaze directions
      if (dict.eyeLookUpLeft !== undefined) influences[dict.eyeLookUpLeft] = facialWeights.eyeLookUpLeft;
      if (dict.eyeLookUpRight !== undefined) influences[dict.eyeLookUpRight] = facialWeights.eyeLookUpRight;
      if (dict.eyeLookDownLeft !== undefined) influences[dict.eyeLookDownLeft] = facialWeights.eyeLookDownLeft;
      if (dict.eyeLookDownRight !== undefined) influences[dict.eyeLookDownRight] = facialWeights.eyeLookDownRight;
      if (dict.eyeLookInLeft !== undefined) influences[dict.eyeLookInLeft] = facialWeights.eyeLookInLeft;
      if (dict.eyeLookInRight !== undefined) influences[dict.eyeLookInRight] = facialWeights.eyeLookInRight;
      if (dict.eyeLookOutLeft !== undefined) influences[dict.eyeLookOutLeft] = facialWeights.eyeLookOutLeft;
      if (dict.eyeLookOutRight !== undefined) influences[dict.eyeLookOutRight] = facialWeights.eyeLookOutRight;

      // Brows & Emotion
      if (dict.browDownLeft !== undefined) influences[dict.browDownLeft] = facialWeights.browDownLeft;
      if (dict.browDownRight !== undefined) influences[dict.browDownRight] = facialWeights.browDownRight;
      if (dict.browInnerUp !== undefined) influences[dict.browInnerUp] = facialWeights.browInnerUp;
      if (dict.browOuterUpLeft !== undefined) influences[dict.browOuterUpLeft] = facialWeights.browOuterUpLeft;
      if (dict.browOuterUpRight !== undefined) influences[dict.browOuterUpRight] = facialWeights.browOuterUpRight;
      if (dict.mouthSmileLeft !== undefined) influences[dict.mouthSmileLeft] = facialWeights.mouthSmileLeft;
      if (dict.mouthSmileRight !== undefined) influences[dict.mouthSmileRight] = facialWeights.mouthSmileRight;
      if (dict.cheekSquintLeft !== undefined) influences[dict.cheekSquintLeft] = facialWeights.cheekSquintLeft;
      if (dict.cheekSquintRight !== undefined) influences[dict.cheekSquintRight] = facialWeights.cheekSquintRight;
    }

    // 4. Subtle Antigravity zero-g float displacement
    if (groupRef.current) {
      const time = state.clock.getElapsedTime();
      groupRef.current.position.y = -1.60 + Math.sin(time * 1.2) * 0.008;
      groupRef.current.position.x = Math.sin(time * 0.8) * 0.004;
    }
  });

  return (
    <group ref={groupRef} position={[0, -1.60, 0]} scale={1.0}>
      <primitive object={gltf.scene} />
    </group>
  );
};

useGLTF.preload('/models/digital_human.glb');
