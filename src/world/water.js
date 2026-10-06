import * as THREE from 'three';
// Shore mask covers more than the land so the blurred falloff is never clipped.
export const SHORE_BOUNDS = { minX: -260, maxX: 260, minZ: -260, maxZ: 220 };

const NOISE = /* glsl */ `
  float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    float a = hash(i), b = hash(i+vec2(1,0)), c = hash(i+vec2(0,1)), d = hash(i+vec2(1,1));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
  }
`;

// Shore mask: land polygon blurred into a soft distance field, sampled by the
// water shader to paint the turquoise shallows and animated surf lines.
export function shoreMaskTexture(landPoly) {
  const W = 1024;
  const sx = W / (SHORE_BOUNDS.maxX - SHORE_BOUNDS.minX);
  const H = Math.round((SHORE_BOUNDS.maxZ - SHORE_BOUNDS.minZ) * sx);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  const draw = (blur, alpha) => {
    g.filter = `blur(${blur}px)`;
    g.globalAlpha = alpha;
    g.fillStyle = '#fff';
    g.beginPath();
    landPoly.forEach(([x, z], i) => {
      const px = (x - SHORE_BOUNDS.minX) * sx;
      const pz = (z - SHORE_BOUNDS.minZ) * sx;
      if (i) g.lineTo(px, pz);
      else g.moveTo(px, pz);
    });
    g.closePath();
    g.fill();
  };
  draw(26, 0.6);
  draw(9, 0.7);
  draw(2, 1);
  g.filter = 'none';
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.flipY = false; // canvas row 0 = minZ, matching the shader's (z - minZ) lookup
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function createWaterMaterial({ shoreMask, sunDir }) {
  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uDeep: { value: new THREE.Color('#0e4f86') },
        uMid: { value: new THREE.Color('#1f7fb8') },
        uShallow: { value: new THREE.Color('#2fd0d4') },
        uSky: { value: new THREE.Color('#cfe2f7') },
        uSun: { value: sunDir.clone().normalize() },
        uSunColor: { value: new THREE.Color('#fff1d6') },
        uShore: { value: null },
        uBounds: {
          value: new THREE.Vector4(
            SHORE_BOUNDS.minX,
            SHORE_BOUNDS.minZ,
            SHORE_BOUNDS.maxX - SHORE_BOUNDS.minX,
            SHORE_BOUNDS.maxZ - SHORE_BOUNDS.minZ,
          ),
        },
      },
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec3 vWorld;
      varying vec2 vUv;
      void main(){
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position,1.0);
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform float uTime;
      uniform vec3 uDeep, uMid, uShallow, uSky, uSun, uSunColor;
      uniform sampler2D uShore;
      uniform vec4 uBounds;
      varying vec3 vWorld;
      varying vec2 vUv;
      ${NOISE}
      // Sum of directional sine waves, analytic gradient.
      vec2 waveGrad(vec2 p, float t){
        vec2 g = vec2(0.0);
        vec2 d1 = normalize(vec2(1.0,0.35)); float f1 = 0.21;
        vec2 d2 = normalize(vec2(-0.4,1.0)); float f2 = 0.33;
        vec2 d3 = normalize(vec2(0.7,-0.8)); float f3 = 0.57;
        g += d1*f1*cos(dot(p,d1)*f1 + t*1.1)*0.9;
        g += d2*f2*cos(dot(p,d2)*f2 + t*1.5)*0.6;
        g += d3*f3*cos(dot(p,d3)*f3 + t*2.1)*0.35;
        return g;
      }
      void main(){
        vec2 p = vWorld.xz;
        float t = uTime;
        // UV-scrolled noise layers for fine ripples
        vec2 uvA = p*0.08 + vec2(t*0.02, t*0.013);
        vec2 uvB = p*0.17 - vec2(t*0.017, -t*0.024);
        float nA = vnoise(uvA*4.0);
        float nB = vnoise(uvB*4.0);
        vec2 g = waveGrad(p, t) + vec2(nA-0.5, nB-0.5)*0.55;
        vec3 n = normalize(vec3(-g.x*0.35, 1.0, -g.y*0.35));

        vec2 suv = (p - uBounds.xy) / uBounds.zw;
        float inside = step(0.0,suv.x)*step(suv.x,1.0)*step(0.0,suv.y)*step(suv.y,1.0);
        float shore = texture2D(uShore, clamp(suv,0.0,1.0)).r * inside;

        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(n,V),0.0), 3.0);
        vec3 col = mix(uDeep, uMid, smoothstep(0.0,0.35,shore));
        col = mix(col, uShallow, smoothstep(0.35,0.75,shore));
        col = mix(col, uSky, fres*0.55);

        vec3 H = normalize(uSun + V);
        float spec = pow(max(dot(n,H),0.0), 180.0);
        col += uSunColor * spec * 1.6;
        float glitter = step(0.985, vnoise(p*1.6 + t*0.6)) * spec * 4.0;
        col += glitter;

        // animated surf bands near the shoreline
        float band = sin(shore*40.0 - t*2.2 + nA*3.0)*0.5+0.5;
        float foam = smoothstep(0.45,0.8,shore) * smoothstep(0.7,1.0,band) * 0.7;
        foam += smoothstep(0.82,0.95,shore);
        col = mix(col, vec3(0.97,0.98,1.0), clamp(foam,0.0,1.0)*0.85);

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
}

// Vertical cascading water: scrolling streaks + foam at the base (uv.y = 0).
export function createWaterfallMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 } }]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec2 vUv;
      void main(){
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position,1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform float uTime;
      varying vec2 vUv;
      ${NOISE}
      void main(){
        float streak = vnoise(vec2(vUv.x*24.0, vUv.y*3.0 + uTime*2.6));
        float streak2 = vnoise(vec2(vUv.x*55.0, vUv.y*6.0 + uTime*3.4));
        float s = smoothstep(0.25,0.9, streak*0.6 + streak2*0.5);
        vec3 col = mix(vec3(0.42,0.72,0.9), vec3(0.97,0.99,1.0), s);
        float foam = smoothstep(0.25,0.0,vUv.y);
        col = mix(col, vec3(1.0), foam);
        float edge = smoothstep(0.0,0.12,vUv.x)*smoothstep(1.0,0.88,vUv.x);
        float a = (0.42 + s*0.45 + foam*0.3) * edge;
        gl_FragColor = vec4(col, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
}
