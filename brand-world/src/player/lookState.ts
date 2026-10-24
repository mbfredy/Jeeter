// Street-view input shared outside React (read every frame).
// yaw 0 looks toward -Z; pitch is clamped in StreetControls.
export const look = { yaw: Math.PI / 4, pitch: -0.05 };

// Analog move input from the touch joystick: x right, y forward, length <= 1.
export const stick = { x: 0, y: 0 };

export const EYE_HEIGHT = 1.6; // m
