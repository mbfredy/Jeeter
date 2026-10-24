import { Text } from '@react-three/drei';
import { usePanel } from '../panels/usePanel.ts';
import { XrButton, useXrFont } from './XrButton.tsx';

const WIDTH = 0.7;

export function XrPanel({ position }: { position: [number, number, number] }) {
  const { model, close } = usePanel();
  const font = useXrFont();
  if (!model) return null;
  return (
    <group position={position}>
      <mesh>
        <planeGeometry args={[WIDTH, 0.45]} />
        <meshBasicMaterial color="#111111" transparent opacity={0.92} />
      </mesh>
      <Text font={font} fontSize={0.045} position={[0, 0.16, 0.002]} maxWidth={WIDTH - 0.08} anchorX="center" anchorY="top" color="#ffffff">
        {model.title}
      </Text>
      <Text font={font} fontSize={0.028} position={[0, 0.08, 0.002]} maxWidth={WIDTH - 0.08} anchorX="center" anchorY="top" color="#dddddd">
        {model.body}
      </Text>
      <XrButton label={model.closeLabel} position={[0, -0.17, 0.004]} onClick={close} />
    </group>
  );
}
