import { Text } from '@react-three/drei';
import { useWorld } from '../../store/world.ts';
import { contentUrl } from '../../content/load.ts';

// In-scene button for XR, where DOM overlays do not exist.
export function XrButton({ label, position, onClick, width = 0.32 }: {
  label: string;
  position: [number, number, number];
  onClick: () => void;
  width?: number;
}) {
  const font = useXrFont();
  return (
    <group position={position}>
      <mesh onClick={(e) => (e.stopPropagation(), onClick())}>
        <planeGeometry args={[width, 0.08]} />
        <meshBasicMaterial color="#202020" />
      </mesh>
      <Text font={font} fontSize={0.035} position={[0, 0, 0.002]} color="#ffffff" anchorX="center" anchorY="middle">
        {label}
      </Text>
    </group>
  );
}

// district.json can name a font file; otherwise troika's default is used
// (fetched from a CDN, so supply a font for production).
export function useXrFont(): string | undefined {
  const font = useWorld((s) => s.district?.fonts?.xr);
  return font ? contentUrl(font) : undefined;
}
