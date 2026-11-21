import { useRef } from 'react';
import * as THREE from 'three';
import { LipSyncWeights } from './types';

export function useLipSync(isSpeaking: boolean, audioLevel: number = 0) {
  const currentWeightsRef = useRef<LipSyncWeights>({
    jawOpen: 0,
    mouthFunnel: 0,
    mouthPucker: 0,
    mouthStretchLeft: 0,
    mouthStretchRight: 0,
    mouthClose: 0,
    mouthLowerDownLeft: 0,
    mouthLowerDownRight: 0,
    mouthUpperUpLeft: 0,
    mouthUpperUpRight: 0,
  });

  const speechTimerRef = useRef<number>(0);
  const currentPhonemeRef = useRef<number>(0);
  const phonemeDurationRef = useRef<number>(0.12);

  const updateLipSync = (delta: number): LipSyncWeights => {
    const weights = currentWeightsRef.current;

    if (!isSpeaking) {
      // Smooth decay back to natural resting position
      const decaySpeed = Math.min(1, delta * 14);
      weights.jawOpen = THREE.MathUtils.lerp(weights.jawOpen, 0, decaySpeed);
      weights.mouthFunnel = THREE.MathUtils.lerp(weights.mouthFunnel, 0, decaySpeed);
      weights.mouthPucker = THREE.MathUtils.lerp(weights.mouthPucker, 0, decaySpeed);
      weights.mouthStretchLeft = THREE.MathUtils.lerp(weights.mouthStretchLeft, 0, decaySpeed);
      weights.mouthStretchRight = THREE.MathUtils.lerp(weights.mouthStretchRight, 0, decaySpeed);
      weights.mouthClose = THREE.MathUtils.lerp(weights.mouthClose, 0, decaySpeed);
      weights.mouthLowerDownLeft = THREE.MathUtils.lerp(weights.mouthLowerDownLeft, 0, decaySpeed);
      weights.mouthLowerDownRight = THREE.MathUtils.lerp(weights.mouthLowerDownRight, 0, decaySpeed);
      weights.mouthUpperUpLeft = THREE.MathUtils.lerp(weights.mouthUpperUpLeft, 0, decaySpeed);
      weights.mouthUpperUpRight = THREE.MathUtils.lerp(weights.mouthUpperUpRight, 0, decaySpeed);
      return weights;
    }

    speechTimerRef.current += delta;

    // Cycle through realistic phoneme mouth configurations
    if (speechTimerRef.current > phonemeDurationRef.current) {
      speechTimerRef.current = 0;
      phonemeDurationRef.current = 0.08 + Math.random() * 0.12;
      currentPhonemeRef.current = (currentPhonemeRef.current + 1 + Math.floor(Math.random() * 2)) % 6;
    }

    // Audio level boost (0 to 1)
    const intensity = Math.max(0.4, Math.min(1.0, 0.45 + audioLevel * 0.55));
    const t = speechTimerRef.current / phonemeDurationRef.current;
    const wave = Math.sin(t * Math.PI);

    let targetJaw = 0;
    let targetFunnel = 0;
    let targetPucker = 0;
    let targetStretch = 0;
    let targetUpperUp = 0;
    let targetLowerDown = 0;
    let targetClose = 0;

    switch (currentPhonemeRef.current) {
      case 0: // 'aa' / 'ah' - open vowels (father, car)
        targetJaw = 0.42 * intensity * wave;
        targetLowerDown = 0.25 * intensity * wave;
        targetUpperUp = 0.18 * intensity * wave;
        break;

      case 1: // 'E' / 'eh' - spread front vowels (bed, see)
        targetJaw = 0.24 * intensity * wave;
        targetStretch = 0.32 * intensity * wave;
        targetUpperUp = 0.15 * intensity * wave;
        break;

      case 2: // 'O' / 'oh' / 'oo' - rounded rounded back vowels (go, too)
        targetJaw = 0.28 * intensity * wave;
        targetFunnel = 0.45 * intensity * wave;
        targetPucker = 0.35 * intensity * wave;
        break;

      case 3: // 'PP' / 'BM' - bilabial stops (put, boy, me)
        targetClose = 0.48 * intensity * wave;
        targetJaw = 0.08 * intensity;
        break;

      case 4: // 'FF' / 'V' - labiodentals (fun, voice)
        targetJaw = 0.16 * intensity * wave;
        targetLowerDown = 0.28 * intensity * wave;
        break;

      case 5: // 'SS' / 'TH' / 'CH' - sibilants & fricatives (stay, think)
        targetJaw = 0.18 * intensity * wave;
        targetStretch = 0.22 * intensity * wave;
        targetUpperUp = 0.20 * intensity * wave;
        break;
    }

    const lerpRate = Math.min(1, delta * 24);
    weights.jawOpen = THREE.MathUtils.lerp(weights.jawOpen, targetJaw, lerpRate);
    weights.mouthFunnel = THREE.MathUtils.lerp(weights.mouthFunnel, targetFunnel, lerpRate);
    weights.mouthPucker = THREE.MathUtils.lerp(weights.mouthPucker, targetPucker, lerpRate);
    weights.mouthStretchLeft = THREE.MathUtils.lerp(weights.mouthStretchLeft, targetStretch, lerpRate);
    weights.mouthStretchRight = THREE.MathUtils.lerp(weights.mouthStretchRight, targetStretch, lerpRate);
    weights.mouthClose = THREE.MathUtils.lerp(weights.mouthClose, targetClose, lerpRate);
    weights.mouthLowerDownLeft = THREE.MathUtils.lerp(weights.mouthLowerDownLeft, targetLowerDown, lerpRate);
    weights.mouthLowerDownRight = THREE.MathUtils.lerp(weights.mouthLowerDownRight, targetLowerDown, lerpRate);
    weights.mouthUpperUpLeft = THREE.MathUtils.lerp(weights.mouthUpperUpLeft, targetUpperUp, lerpRate);
    weights.mouthUpperUpRight = THREE.MathUtils.lerp(weights.mouthUpperUpRight, targetUpperUp, lerpRate);

    return weights;
  };

  return { updateLipSync };
}
