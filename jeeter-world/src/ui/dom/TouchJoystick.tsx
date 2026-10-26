import { useRef, useState, type PointerEvent } from 'react';
import { stick } from '../../player/lookState.ts';

const RADIUS = 48; // px of travel

// Left-thumb joystick for street view on touch screens. Writes to `stick`,
// which Player reads every frame.
export function TouchJoystick() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const update = (e: PointerEvent) => {
    const r = base.current!.getBoundingClientRect();
    let x = e.clientX - (r.left + r.width / 2);
    let y = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(x, y);
    if (len > RADIUS) (x *= RADIUS / len), (y *= RADIUS / len);
    setKnob({ x, y });
    stick.x = x / RADIUS;
    stick.y = -y / RADIUS;
  };
  const release = () => {
    setKnob({ x: 0, y: 0 });
    stick.x = stick.y = 0;
  };

  return (
    <div
      ref={base}
      className="joystick"
      role="presentation"
      onPointerDown={(e) => (e.currentTarget.setPointerCapture(e.pointerId), update(e))}
      onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && update(e)}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div className="knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
