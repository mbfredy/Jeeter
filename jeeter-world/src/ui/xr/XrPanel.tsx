import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { Vector3, type Group } from 'three';
import { useWorld } from '../../store/world.ts';
import { usePanel } from '../panels/usePanel.ts';
import { XrButton, useXrFont } from './XrButton.tsx';

const WIDTH = 0.7;
const DISTANCE = 0.9; // m in front of the head
const head = new Vector3();
const dir = new Vector3();

// Opens in front of wherever the visitor is looking, then stays put.
export function XrPanel() {
  const { model, close } = usePanel();
  const xrMode = useWorld((s) => s.xrMode);
  const font = useXrFont();
  const camera = useThree((s) => s.camera);
  const ref = useRef<Group>(null);

  useEffect(() => {
    if (!model || !ref.current) return;
    camera.getWorldPosition(head);
    camera.getWorldDirection(dir).setY(0).normalize();
    ref.current.position.copy(head).addScaledVector(dir, DISTANCE).setY(head.y - 0.1);
    ref.current.lookAt(head.x, head.y - 0.1, head.z);
  }, [model, camera]);

  if (!model || xrMode === 'none') return null;
  return (
    <group ref={ref}>
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
