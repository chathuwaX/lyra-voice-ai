import React, { Suspense, Component, ErrorInfo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { AvatarState } from '../../types';
import { HumanModel } from './HumanModel';
import { Sparkles } from 'lucide-react';

interface HumanCanvasProps {
  avatarState: AvatarState;
  isSpeaking: boolean;
  audioLevel?: number;
  themeGlow?: string;
  fallbackImageUrl?: string;
}

interface ErrorBoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class CanvasErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('3D Digital Human Render Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const LoadingPlaceholder: React.FC = () => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-sky-300">
    <div className="relative">
      <div className="w-14 h-14 rounded-full border-2 border-sky-400/30 border-t-sky-400 animate-spin" />
      <Sparkles className="w-6 h-6 text-sky-300 absolute inset-0 m-auto animate-pulse" />
    </div>
    <span className="mt-3 text-xs font-medium tracking-wider text-sky-200/80 uppercase">
      Materializing Human AI...
    </span>
  </div>
);

export const HumanCanvas: React.FC<HumanCanvasProps> = ({
  avatarState,
  isSpeaking,
  audioLevel = 0,
  themeGlow = '#38bdf8',
  fallbackImageUrl = '/avatar.png',
}) => {
  const fallbackUI = (
    <div className="relative w-full h-full">
      <img
        src={fallbackImageUrl}
        alt="Digital Human Portrait"
        className="w-full h-full object-cover"
      />
    </div>
  );

  return (
    <CanvasErrorBoundary fallback={fallbackUI}>
      <Suspense fallback={<LoadingPlaceholder />}>
        <Canvas
          camera={{ position: [0, 0, 0.65], fov: 36 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.15,
          }}
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
        >
          {/* Subtle studio lighting for human face portraiture */}
          <ambientLight intensity={0.75} />

          {/* Key Light: warm directional light angled at the face */}
          <directionalLight
            position={[1.2, 1.2, 1.8]}
            intensity={1.5}
            color="#fff7ed"
          />

          {/* Fill Light: soft cool tone complementing theme */}
          <directionalLight
            position={[-1.2, 0.6, 1.4]}
            intensity={0.85}
            color={themeGlow}
          />

          {/* Rim / Silhouette Light: hair separation and depth */}
          <directionalLight
            position={[0, 1.5, -1.8]}
            intensity={2.0}
            color="#7dd3fc"
          />

          {/* Subtle chin/neck fill light */}
          <pointLight
            position={[0, -0.6, 0.6]}
            intensity={0.4}
            color="#bae6fd"
          />

          {/* Orbit Controls with strict clamping so character face stays centered */}
          <OrbitControls
            target={[0, 0, 0]}
            enablePan={false}
            minDistance={0.48}
            maxDistance={0.95}
            minPolarAngle={Math.PI / 2.4}
            maxPolarAngle={Math.PI / 1.7}
            minAzimuthAngle={-Math.PI / 5}
            maxAzimuthAngle={Math.PI / 5}
            enableDamping={true}
            dampingFactor={0.08}
          />

          {/* 3D Rigged Human Model with ARKit Blendshapes & Visemes */}
          <HumanModel
            avatarState={avatarState}
            isSpeaking={isSpeaking}
            audioLevel={audioLevel}
          />
        </Canvas>
      </Suspense>
    </CanvasErrorBoundary>
  );
};
