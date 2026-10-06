import * as THREE from 'three';

/**
 * Jeeter blimp. Lathe-turned envelope with PBR materials, tail fins, gondola,
 * engine pods and an LED dot-matrix screen on BOTH flanks. The screens scroll a
 * marquee strip: Jeeter logo (from the brand SVG) • GAME DAY KICKOFF • logo …
 * The blimp circles an elliptical path in front of the scene so each flank
 * faces the viewer in turn.
 */
export class Blimp {
  constructor(logoImage) {
    this.object = new THREE.Group();
    this.object.renderOrder = 6;
    const body = new THREE.Group();
    this.object.add(body);

    // envelope profile (length along local +z after rotation)
    const pts = [];
    const L = 1;
    const R = 0.17;
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      // blunt nose, long tapering tail
      const r = R * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.82)), 0.78) * (1 - 0.18 * t);
      pts.push(new THREE.Vector2(Math.max(r, 0.0005), (t - 0.5) * L));
    }
    const env = new THREE.LatheGeometry(pts, 64);
    env.rotateX(Math.PI / 2); // lathe axis y → z
    env.rotateY(Math.PI); // nose toward +z
    const skin = new THREE.MeshStandardMaterial({ color: '#f1f2f6', metalness: 0.35, roughness: 0.32 });
    body.add(new THREE.Mesh(env, skin));

    // fins
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0.17, 0);
    finShape.lineTo(0.06, 0.12);
    finShape.lineTo(-0.02, 0.12);
    finShape.lineTo(0, 0);
    const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.008, bevelEnabled: false }).translate(0, 0, -0.004);
    finGeo.rotateY(-Math.PI / 2);
    const finMat = new THREE.MeshStandardMaterial({ color: '#22308f', metalness: 0.3, roughness: 0.4 });
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(finGeo, finMat);
      f.position.z = -0.42;
      f.rotation.z = (i * Math.PI) / 2 + Math.PI / 4;
      f.translateY(0.04);
      body.add(f);
    }
    // gondola + engines
    const gon = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.12, 6, 16), new THREE.MeshStandardMaterial({ color: '#1d1f2a', metalness: 0.6, roughness: 0.3 }));
    gon.rotation.x = Math.PI / 2;
    gon.position.set(0, -R - 0.02, 0.05);
    body.add(gon);
    const winMat = new THREE.MeshBasicMaterial({ color: '#ffd9a0' });
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.012, 0.1), winMat);
    win.position.set(0, -R - 0.016, 0.05);
    body.add(win);
    for (const s of [-1, 1]) {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.06, 16), new THREE.MeshStandardMaterial({ color: '#c9ccd4', metalness: 0.8, roughness: 0.25 }));
      pod.rotation.x = Math.PI / 2;
      pod.position.set(s * 0.06, -R + 0.005, -0.02);
      body.add(pod);
    }

    // LED screens on both flanks
    this.screenTex = this._marqueeTexture(logoImage);
    this.ledMat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: this.screenTex }, uTime: { value: 0 }, uScroll: { value: 0 }, uGrid: { value: new THREE.Vector2(110, 40) } },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uTex; uniform float uTime; uniform float uScroll; uniform vec2 uGrid;
        varying vec2 vUv;
        void main(){
          vec2 cell = floor(vUv * uGrid) / uGrid + 0.5 / uGrid;
          vec2 suv = vec2(cell.x * 0.2 + uScroll, cell.y);
          vec3 c = texture2D(uTex, suv).rgb;
          vec2 f = fract(vUv * uGrid) - 0.5;
          // fade the dot pattern out when cells get smaller than ~3px (no moire)
          float cellPx = 1.0 / max(fwidth(vUv.x * uGrid.x), 1e-4);
          float dotMix = clamp((cellPx - 2.0) / 3.0, 0.0, 1.0);
          float dot = mix(0.85, smoothstep(0.5, 0.28, length(f)), dotMix);
          c = mix(texture2D(uTex, vec2(vUv.x * 0.2 + uScroll, vUv.y)).rgb, c, dotMix);
          float scan = 0.92 + 0.08 * sin(vUv.y * 60.0 - uTime * 8.0);
          vec3 base = vec3(0.03, 0.02, 0.07);
          vec3 led = c * 1.9 * scan;
          // frame bezel
          float edge = step(0.015, vUv.x) * step(vUv.x, 0.985) * step(0.04, vUv.y) * step(vUv.y, 0.96);
          gl_FragColor = vec4(mix(vec3(0.05), base + led * dot, edge), 1.0);
          #include <colorspace_fragment>
        }`,
      toneMapped: false,
    });
    // curved panel following the envelope
    const panelGeo = new THREE.CylinderGeometry(R * 1.02, R * 1.02, 0.5, 48, 1, true, -0.62, 1.24);
    panelGeo.rotateX(Math.PI / 2);
    // remap uv so x runs along the length, y around the girth
    const uv = panelGeo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i));
    // the port panel is mounted rotated 180° relative to starboard: flip its uvs
    const portGeo = panelGeo.clone();
    const puv = portGeo.attributes.uv;
    for (let i = 0; i < puv.count; i++) puv.setXY(i, 1 - puv.getX(i), 1 - puv.getY(i));
    for (const side of [1, -1]) {
      const p = new THREE.Mesh(side > 0 ? portGeo : panelGeo, this.ledMat);
      p.rotation.z = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      p.position.z = 0.03;
      if (side < 0) p.scale.z = -1; // read left-to-right on the far flank too
      body.add(p);
    }
    this.body = body;
    this.path = null;
    this.u = Math.random();
  }

  _marqueeTexture(logo) {
    const c = document.createElement('canvas');
    c.width = 3072;
    c.height = 256;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#3a1d9a');
    gr.addColorStop(1, '#170d4d');
    g.fillStyle = gr;
    g.fillRect(0, 0, c.width, c.height);
    const seg = c.width / 3;
    for (let k = 0; k < 3; k++) {
      const x0 = k * seg;
      if (k !== 1 && logo) {
        const h = 200;
        const w = (logo.width / logo.height) * h;
        g.drawImage(logo, x0 + (seg - w) / 2, (256 - h) / 2 + 6, w, h);
      } else {
        g.fillStyle = '#ffffff';
        g.font = "120px 'Anton', Impact, sans-serif";
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('GAME DAY', x0 + seg / 2, 92);
        g.fillStyle = '#ffd34d';
        g.font = "84px 'Anton', Impact, sans-serif";
        g.fillText('KICKOFF', x0 + seg / 2, 196);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  }

  /** Configure the flight path in world units for the current scene. */
  setPath({ cx, cy, rx, rz, z, length }) {
    this.path = { cx, cy, rx, rz, z };
    this.object.scale.setScalar(length);
  }

  update(t, dt) {
    if (!this.path) return;
    const p = this.path;
    this.u = (this.u + dt * 0.018) % 1;
    const a = this.u * Math.PI * 2;
    const pos = new THREE.Vector3(p.cx + Math.cos(a) * p.rx, p.cy + Math.sin(a * 2) * 0.05, p.z + Math.sin(a) * p.rz);
    const ahead = new THREE.Vector3(p.cx + Math.cos(a + 0.02) * p.rx, pos.y, p.z + Math.sin(a + 0.02) * p.rz);
    this.object.position.copy(pos);
    this.object.lookAt(ahead);
    this.body.rotation.z = Math.sin(t * 0.6) * 0.03;
    this.ledMat.uniforms.uTime.value = t;
    this.ledMat.uniforms.uScroll.value = (t * 0.05) % 1;
  }
}
