import { useEffect, useRef } from 'react';

// Draws an image as a grid of hexadecimal glyphs, the material registry values are made of.
// Pixels are read once per layout; each step only redraws from prepared data (see unslop effects.md).
const CHARS = '.:17ca40e8bdf';
const CELL = 8;
const FPS = 8;

export default function HexScene({ src, alt, focusX = 0.62 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const image = new Image();
    image.src = src;

    let cells = [];
    let colorLayer = null;
    let atlas = null;
    let raf = 0;
    let last = 0;
    let step = 0;
    let visible = true;
    let cssW = 0;
    let cssH = 0;
    let dpr = 1;

    const layout = () => {
      if (!image.complete || !image.naturalWidth) return;
      const rect = canvas.getBoundingClientRect();
      cssW = Math.max(1, Math.round(rect.width));
      cssH = Math.max(1, Math.round(rect.height));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);

      const cols = Math.ceil(cssW / CELL);
      const rows = Math.ceil(cssH / CELL);

      // object-fit: cover, anchored on the subject
      const scale = Math.max(cssW / image.naturalWidth, cssH / image.naturalHeight);
      const drawW = image.naturalWidth * scale;
      const drawH = image.naturalHeight * scale;
      const offX = (cssW - drawW) * focusX;
      const offY = (cssH - drawH) * 0.5;

      const sample = document.createElement('canvas');
      sample.width = cols;
      sample.height = rows;
      const s = sample.getContext('2d', { willReadFrequently: true });
      s.drawImage(image, offX / CELL, offY / CELL, drawW / CELL, drawH / CELL);
      const px = s.getImageData(0, 0, cols, rows).data;

      // Color layer: one pixel per cell, scaled up without smoothing, used to tint the glyphs
      colorLayer = sample;

      atlas = document.createElement('canvas');
      atlas.width = CELL * CHARS.length * dpr;
      atlas.height = CELL * dpr;
      const pen = atlas.getContext('2d');
      pen.scale(dpr, dpr);
      pen.font = `500 ${CELL + 1}px "JetBrains Mono", monospace`;
      pen.textAlign = 'center';
      pen.textBaseline = 'middle';
      pen.fillStyle = '#fff';
      [...CHARS].forEach((ch, i) => pen.fillText(ch, i * CELL + CELL / 2, CELL / 2 + 0.5));

      cells = [];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = (y * cols + x) * 4;
          const raw = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
          // the image is a night scene, lift the mids so the shell and the desk read
          const light = Math.min(1, Math.pow(raw, 0.6) * 1.7);
          if (light < 0.16) continue;
          cells.push({
            x, y,
            base: Math.min(CHARS.length - 1, Math.floor(light * CHARS.length)),
            alpha: 0.35 + light * 0.65,
            seed: Math.random() * 1000,
          });
        }
      }
      draw();
    };

    const draw = () => {
      if (!colorLayer) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const c = CELL * dpr;
      for (const cell of cells) {
        const flick = Math.sin(cell.seed + step * 0.9) > 0.96 ? 1 : 0;
        const pick = Math.min(CHARS.length - 1, cell.base + flick);
        ctx.globalAlpha = cell.alpha;
        ctx.drawImage(atlas, pick * c, 0, c, c, cell.x * c, cell.y * c, c, c);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-in';
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(colorLayer, 0, 0, colorLayer.width * c, colorLayer.height * c);
      ctx.globalCompositeOperation = 'source-over';
    };

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (!visible || now - last < 1000 / FPS) return;
      last = now;
      step++;
      draw();
    };

    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    io.observe(canvas);
    let resizeTimer = 0;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(layout, 120);
    });
    ro.observe(canvas);

    const start = () => {
      layout();
      if (!reduced) raf = requestAnimationFrame(loop);
    };
    // wait for the mono font so the glyph atlas uses it
    const ready = document.fonts ? document.fonts.load('500 10px "JetBrains Mono"') : Promise.resolve();
    image.onload = () => ready.then(start, start);
    if (image.complete && image.naturalWidth) ready.then(start, start);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      io.disconnect();
      ro.disconnect();
    };
  }, [src, focusX]);

  return (
    <div className="hex-wrap" role="img" aria-label={alt}>
      <img
        src={src}
        alt=""
        className="hex-photo"
        style={{ objectPosition: `${focusX * 100}% 50%` }}
        fetchpriority="high"
      />
      <canvas ref={canvasRef} className="hex-scene" />
    </div>
  );
}
