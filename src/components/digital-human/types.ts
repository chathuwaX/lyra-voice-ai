export type ARKitBlendshape =
  | 'browDownLeft'
  | 'browDownRight'
  | 'browInnerUp'
  | 'browOuterUpLeft'
  | 'browOuterUpRight'
  | 'eyeBlinkLeft'
  | 'eyeBlinkRight'
  | 'eyeSquintLeft'
  | 'eyeSquintRight'
  | 'eyeWideLeft'
  | 'eyeWideRight'
  | 'eyeLookDownLeft'
  | 'eyeLookDownRight'
  | 'eyeLookUpLeft'
  | 'eyeLookUpRight'
  | 'eyeLookInLeft'
  | 'eyeLookInRight'
  | 'eyeLookOutLeft'
  | 'eyeLookOutRight'
  | 'jawForward'
  | 'jawLeft'
  | 'jawRight'
  | 'jawOpen'
  | 'mouthClose'
  | 'mouthFunnel'
  | 'mouthPucker'
  | 'mouthSmileLeft'
  | 'mouthSmileRight'
  | 'mouthFrownLeft'
  | 'mouthFrownRight'
  | 'mouthDimpleLeft'
  | 'mouthDimpleRight'
  | 'mouthStretchLeft'
  | 'mouthStretchRight'
  | 'mouthRollLower'
  | 'mouthRollUpper'
  | 'mouthPressLeft'
  | 'mouthPressRight'
  | 'mouthLowerDownLeft'
  | 'mouthLowerDownRight'
  | 'mouthUpperUpLeft'
  | 'mouthUpperUpRight'
  | 'mouthShrugLower'
  | 'mouthShrugUpper'
  | 'noseSneerLeft'
  | 'noseSneerRight'
  | 'cheekPuff'
  | 'cheekSquintLeft'
  | 'cheekSquintRight'
  | 'tongueOut';

export type VisemeTarget =
  | 'viseme_sil'
  | 'viseme_PP'
  | 'viseme_FF'
  | 'viseme_TH'
  | 'viseme_DD'
  | 'viseme_kk'
  | 'viseme_CH'
  | 'viseme_SS'
  | 'viseme_nn'
  | 'viseme_RR'
  | 'viseme_aa'
  | 'viseme_E'
  | 'viseme_I'
  | 'viseme_O'
  | 'viseme_U';

export type CharacterEmotion =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'happy'
  | 'confused';

export interface FacialBlendshapeWeights {
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  eyeSquintLeft: number;
  eyeSquintRight: number;
  eyeWideLeft: number;
  eyeWideRight: number;
  eyeLookUpLeft: number;
  eyeLookUpRight: number;
  eyeLookDownLeft: number;
  eyeLookDownRight: number;
  eyeLookInLeft: number;
  eyeLookInRight: number;
  eyeLookOutLeft: number;
  eyeLookOutRight: number;
  browDownLeft: number;
  browDownRight: number;
  browInnerUp: number;
  browOuterUpLeft: number;
  browOuterUpRight: number;
  mouthSmileLeft: number;
  mouthSmileRight: number;
  cheekSquintLeft: number;
  cheekSquintRight: number;
}

export interface LipSyncWeights {
  jawOpen: number;
  mouthFunnel: number;
  mouthPucker: number;
  mouthStretchLeft: number;
  mouthStretchRight: number;
  mouthClose: number;
  mouthLowerDownLeft: number;
  mouthLowerDownRight: number;
  mouthUpperUpLeft: number;
  mouthUpperUpRight: number;
}
