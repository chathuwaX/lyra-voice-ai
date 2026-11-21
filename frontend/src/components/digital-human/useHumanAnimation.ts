import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { AvatarState } from '../../types';
import { FacialBlendshapeWeights } from './types';

export function useHumanAnimation(avatarState: AvatarState) {
  // Blinking timer & state
  const nextBlinkTimeRef = useRef<number>(2.5);
  const blinkTimerRef = useRef<number>(0);
  const isBlinkingRef = useRef<boolean>(false);
  const blinkProgressRef = useRef<number>(0);

  // Micro-saccades (natural involuntary eye jitters)
  const saccadeTimerRef = useRef<number>(0);
  const saccadeTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentSaccadeRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mouse tracking gaze
  const mouseTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentGazeRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Breathing accumulator
  const breathTimeRef = useRef<number>(0);

  // Blendshape accumulator
  const weightsRef = useRef<FacialBlendshapeWeights>({
    eyeBlinkLeft: 0,
    eyeBlinkRight: 0,
    eyeSquintLeft: 0,
    eyeSquintRight: 0,
    eyeWideLeft: 0,
    eyeWideRight: 0,
    eyeLookUpLeft: 0,
    eyeLookUpRight: 0,
    eyeLookDownLeft: 0,
    eyeLookDownRight: 0,
    eyeLookInLeft: 0,
    eyeLookInRight: 0,
    eyeLookOutLeft: 0,
    eyeLookOutRight: 0,
    browDownLeft: 0,
    browDownRight: 0,
    browInnerUp: 0,
    browOuterUpLeft: 0,
    browOuterUpRight: 0,
    mouthSmileLeft: 0,
    mouthSmileRight: 0,
    cheekSquintLeft: 0,
    cheekSquintRight: 0,
  });

  // Track window mouse movement for natural eye contact
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to [-1, 1]
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseTargetRef.current = {
        x: Math.max(-0.45, Math.min(0.45, nx * 0.4)),
        y: Math.max(-0.35, Math.min(0.35, ny * 0.3)),
      };
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const updateAnimation = (
    delta: number,
    headBone: THREE.Bone | null,
    neckBone: THREE.Bone | null
  ): FacialBlendshapeWeights => {
    const weights = weightsRef.current;
    breathTimeRef.current += delta;

    // 1. Poisson Blinking with natural duration curve (80ms close, 140ms open)
    blinkTimerRef.current += delta;
    if (!isBlinkingRef.current && blinkTimerRef.current >= nextBlinkTimeRef.current) {
      isBlinkingRef.current = true;
      blinkTimerRef.current = 0;
      blinkProgressRef.current = 0;
      // Next blink interval: 2.5 to 5.5 seconds, occasional double blink
      nextBlinkTimeRef.current = Math.random() < 0.2 ? 0.35 : 2.5 + Math.random() * 3.0;
    }

    if (isBlinkingRef.current) {
      blinkProgressRef.current += delta * 7.5; // full blink takes ~0.22s
      if (blinkProgressRef.current >= 1) {
        isBlinkingRef.current = false;
        weights.eyeBlinkLeft = 0;
        weights.eyeBlinkRight = 0;
      } else {
        // Asymmetric bell curve
        const blinkVal = Math.sin(blinkProgressRef.current * Math.PI);
        weights.eyeBlinkLeft = Math.min(1, blinkVal * 1.25);
        weights.eyeBlinkRight = Math.min(1, blinkVal * 1.25);
      }
    }

    // 2. Micro-saccades (every 300-600ms, human eyes micro-jitter by 0.02 - 0.05)
    saccadeTimerRef.current += delta;
    if (saccadeTimerRef.current > 0.45) {
      saccadeTimerRef.current = 0;
      saccadeTargetRef.current = {
        x: (Math.random() - 0.5) * 0.06,
        y: (Math.random() - 0.5) * 0.04,
      };
    }
    currentSaccadeRef.current.x = THREE.MathUtils.lerp(
      currentSaccadeRef.current.x,
      saccadeTargetRef.current.x,
      delta * 12
    );
    currentSaccadeRef.current.y = THREE.MathUtils.lerp(
      currentSaccadeRef.current.y,
      saccadeTargetRef.current.y,
      delta * 12
    );

    // 3. Smooth Gaze Damping (eyes lead, head follows)
    currentGazeRef.current.x = THREE.MathUtils.lerp(
      currentGazeRef.current.x,
      mouseTargetRef.current.x + currentSaccadeRef.current.x,
      delta * 4.5
    );
    currentGazeRef.current.y = THREE.MathUtils.lerp(
      currentGazeRef.current.y,
      mouseTargetRef.current.y + currentSaccadeRef.current.y,
      delta * 4.5
    );

    // 4. Conversational State-based Expressions
    let targetSmile = 0.12; // Natural friendly baseline resting smile
    let targetBrowInnerUp = 0.04;
    let targetBrowDown = 0;
    let targetSquint = 0.05;
    let targetEyeWide = 0;

    switch (avatarState) {
      case 'idle':
        targetSmile = 0.15;
        break;

      case 'listening':
        // Attentive wide eyes, subtle listening nod
        targetEyeWide = 0.22;
        targetBrowInnerUp = 0.14;
        targetSmile = 0.18;
        break;

      case 'thinking':
        // Cognitive gaze aversion (looking slightly up and away)
        targetBrowInnerUp = 0.28;
        targetBrowDown = 0.12;
        targetSquint = 0.16;
        currentGazeRef.current.y += Math.sin(breathTimeRef.current * 0.8) * 0.05;
        currentGazeRef.current.x += 0.08;
        break;

      case 'speaking':
        // Dynamic empathetic micro-expressions
        targetSmile = 0.20 + Math.sin(breathTimeRef.current * 3.5) * 0.08;
        targetBrowInnerUp = 0.12 + Math.cos(breathTimeRef.current * 2.5) * 0.06;
        break;
    }

    const stateSpeed = delta * 5.0;
    weights.mouthSmileLeft = THREE.MathUtils.lerp(weights.mouthSmileLeft, targetSmile, stateSpeed);
    weights.mouthSmileRight = THREE.MathUtils.lerp(weights.mouthSmileRight, targetSmile, stateSpeed);
    weights.browInnerUp = THREE.MathUtils.lerp(weights.browInnerUp, targetBrowInnerUp, stateSpeed);
    weights.browDownLeft = THREE.MathUtils.lerp(weights.browDownLeft, targetBrowDown, stateSpeed);
    weights.browDownRight = THREE.MathUtils.lerp(weights.browDownRight, targetBrowDown, stateSpeed);
    weights.eyeSquintLeft = THREE.MathUtils.lerp(weights.eyeSquintLeft, targetSquint, stateSpeed);
    weights.eyeSquintRight = THREE.MathUtils.lerp(weights.eyeSquintRight, targetSquint, stateSpeed);
    weights.eyeWideLeft = THREE.MathUtils.lerp(weights.eyeWideLeft, targetEyeWide, stateSpeed);
    weights.eyeWideRight = THREE.MathUtils.lerp(weights.eyeWideRight, targetEyeWide, stateSpeed);

    // Apply eye gaze morphs
    const gx = currentGazeRef.current.x;
    const gy = currentGazeRef.current.y;

    weights.eyeLookUpLeft = Math.max(0, gy);
    weights.eyeLookUpRight = Math.max(0, gy);
    weights.eyeLookDownLeft = Math.max(0, -gy);
    weights.eyeLookDownRight = Math.max(0, -gy);

    weights.eyeLookOutLeft = Math.max(0, -gx);
    weights.eyeLookInLeft = Math.max(0, gx);
    weights.eyeLookInRight = Math.max(0, -gx);
    weights.eyeLookOutRight = Math.max(0, gx);

    // 5. Kinematic Bone Rigging (Head, Neck, and Thoracic Breathing)
    const breathOffset = Math.sin(breathTimeRef.current * 1.5) * 0.012;

    if (headBone) {
      // Natural head rotation driven by gaze, breathing, and subtle conversational tilts
      const headPitch = -gy * 0.25 + breathOffset * 0.4;
      const headYaw = -gx * 0.35;
      const headRoll = -gx * 0.12;

      headBone.rotation.x = THREE.MathUtils.lerp(headBone.rotation.x, headPitch, delta * 3.5);
      headBone.rotation.y = THREE.MathUtils.lerp(headBone.rotation.y, headYaw, delta * 3.5);
      headBone.rotation.z = THREE.MathUtils.lerp(headBone.rotation.z, headRoll, delta * 3.5);
    }

    if (neckBone) {
      const neckPitch = -gy * 0.12 + breathOffset * 0.2;
      const neckYaw = -gx * 0.18;
      neckBone.rotation.x = THREE.MathUtils.lerp(neckBone.rotation.x, neckPitch, delta * 3.0);
      neckBone.rotation.y = THREE.MathUtils.lerp(neckBone.rotation.y, neckYaw, delta * 3.0);
    }

    return weights;
  };

  return { updateAnimation };
}
