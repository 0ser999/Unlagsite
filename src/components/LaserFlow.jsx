import { useEffect, useRef } from 'react';

// A beam of light that falls onto the top edge of the element it sits behind and spreads
// along it as drifting fog. Plain WebGL, no dependency. `x` is the beam position (0 to 1),
// `hit` the distance in CSS pixels from the canvas top to the surface it lands on.
const VERT = `attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uX;
uniform float uHit;
uniform float uDpr;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  vec2 p = gl_FragCoord.xy / uDpr;
  vec2 res = uRes / uDpr;
  float hitY = res.y - uHit;            // impact height, from the bottom
  float dx = p.x - uX * res.x;
  float above = p.y - hitY;             // > 0 on the beam side
  float t = uTime;

  vec3 blue = vec3(0.357, 0.549, 1.0);
  vec3 deep = vec3(0.247, 0.427, 1.0);
  vec3 col = vec3(0.0);

  if (above > 0.0) {
    // Beam: thin white core inside a blue halo, fading towards the top.
    float k = clamp(above / uHit, 0.0, 1.0);
    float fade = pow(1.0 - k, 1.6);
    float core = exp(-dx * dx / 1.6);
    float halo = exp(-abs(dx) / (7.0 + 10.0 * (1.0 - k)));
    float flow = 0.65 + 0.35 * sin(above * 0.045 + t * 6.0);
    float flicker = 0.9 + 0.1 * noise(vec2(t * 8.0, 0.0));
    col += (vec3(1.0) * core * 0.9 + blue * halo * 0.55 * flow) * fade * flicker;
  }

  // Impact: a bright pool where the beam lands, then fog drifting along the edge.
  float d = abs(above);
  float pool = exp(-abs(dx) / 26.0) * exp(-d / 8.0);
  float spread = exp(-abs(dx) / 260.0) * exp(-max(above, 0.0) / 46.0) * step(0.0, above + 1.5);
  float fog = fbm(vec2(dx * 0.012 - t * 0.35 * sign(dx), above * 0.03 + t * 0.15));
  col += vec3(1.0) * pool * 0.9;
  col += blue * spread * (0.35 + 0.9 * fog);
  // Thin line of light running along the edge.
  col += deep * exp(-abs(above) / 1.2) * exp(-abs(dx) / 420.0) * 0.9;

  // Premultiplied output: alpha is the brightest channel, so the dark page shows through.
  // Fade out towards the canvas sides so the fog has no hard edge.
  col *= smoothstep(0.0, 160.0, p.x) * smoothstep(0.0, 160.0, res.x - p.x);
  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));
}`;

export default function LaserFlow({ x = 0.5, hit = 240, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext('webgl', { alpha: true, antialias: false });
    if (!gl) return undefined;

    const shader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = shader(gl.VERTEX_SHADER, VERT);
    const fs = shader(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return undefined;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return undefined;
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = Object.fromEntries(['uRes', 'uTime', 'uX', 'uHit', 'uDpr'].map((n) => [n, gl.getUniformLocation(prog, n)]));
    const reduced = false; // Animated even with Windows animations off, like the scroll.
    let dpr = 1;
    let raf = 0;
    let visible = true;
    const start = performance.now();

    const draw = () => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(u.uRes, canvas.width, canvas.height);
      gl.uniform1f(u.uTime, reduced ? 2 : (performance.now() - start) / 1000);
      gl.uniform1f(u.uX, x);
      gl.uniform1f(u.uHit, hit);
      gl.uniform1f(u.uDpr, dpr);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = () => {
      draw();
      raf = visible && !reduced ? requestAnimationFrame(loop) : 0;
    };
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      draw();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    // Stop rendering while the beam is off screen.
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf && !reduced) raf = requestAnimationFrame(loop);
    });
    io.observe(canvas);
    resize();
    if (!reduced) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [x, hit]);

  return <canvas ref={ref} className={`laser-flow ${className}`} aria-hidden="true" />;
}
