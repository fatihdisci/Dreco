// =============================================================================
//  4-corner perspective crop
//  - Pure JS perspective warp (no external deps)
//  - SVG-based draggable corner handles overlaid on the source image
// =============================================================================

/* ── MATH: 8x8 linear solve, projective transform ────────────────────────── */

function solve8(A, b) {
  // A: 8x8, b: length 8. Gauss-Jordan with partial pivot. Mutates copies.
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (pivot !== col) [M[col], M[pivot]] = [M[pivot], M[col]];
    const pv = M[col][col];
    if (pv === 0) throw new Error('singular matrix');
    for (let j = col; j <= n; j++) M[col][j] /= pv;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      if (f) for (let j = col; j <= n; j++) M[r][j] -= f * M[col][j];
    }
  }
  return M.map(row => row[n]);
}

// Solve homography mapping srcPts -> dstPts (4 point pairs).
// Returns [h11, h12, h13, h21, h22, h23, h31, h32]; h33 = 1.
function homography(srcPts, dstPts) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [sx, sy] = srcPts[i];
    const [tx, ty] = dstPts[i];
    A.push([sx, sy, 1, 0, 0, 0, -tx * sx, -tx * sy]); b.push(tx);
    A.push([0, 0, 0, sx, sy, 1, -ty * sx, -ty * sy]); b.push(ty);
  }
  return solve8(A, b);
}

/* ── WARP: perspective-correct a quadrilateral region into a rectangle ────── */

function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }

// corners: { tl, tr, br, bl } in source-image coords.
export async function warpQuad(srcImg, corners, maxDim = 1600) {
  const { tl, tr, br, bl } = corners;

  // Output dimensions follow the longer edge lengths
  const wTop    = dist(tl, tr);
  const wBottom = dist(bl, br);
  const hLeft   = dist(tl, bl);
  const hRight  = dist(tr, br);
  let outW = Math.round(Math.max(wTop, wBottom));
  let outH = Math.round(Math.max(hLeft, hRight));
  if (outW < 50 || outH < 50) throw new Error('Seçim çok küçük');

  // Cap output to maxDim (longest side)
  const longest = Math.max(outW, outH);
  if (longest > maxDim) {
    const s = maxDim / longest;
    outW = Math.round(outW * s);
    outH = Math.round(outH * s);
  }

  // Read source pixels
  const sw = srcImg.naturalWidth || srcImg.width;
  const sh = srcImg.naturalHeight || srcImg.height;
  const srcCv = document.createElement('canvas');
  srcCv.width = sw; srcCv.height = sh;
  srcCv.getContext('2d').drawImage(srcImg, 0, 0);
  const sd = srcCv.getContext('2d').getImageData(0, 0, sw, sh).data;

  // H: target-rect -> source-quad (so we can invert-sample)
  const targetCorners = [[0, 0], [outW, 0], [outW, outH], [0, outH]];
  const sourceCorners = [tl, tr, br, bl];
  const h = homography(targetCorners, sourceCorners);

  const out = new Uint8ClampedArray(outW * outH * 4);
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const w  = h[6] * x + h[7] * y + 1;
      const sx = (h[0] * x + h[1] * y + h[2]) / w;
      const sy = (h[3] * x + h[4] * y + h[5]) / w;

      const idx = (y * outW + x) * 4;

      if (sx < 0 || sy < 0 || sx >= sw - 1 || sy >= sh - 1) {
        out[idx] = 255; out[idx + 1] = 255; out[idx + 2] = 255; out[idx + 3] = 255;
        continue;
      }

      // Bilinear
      const px = Math.floor(sx), py = Math.floor(sy);
      const fx = sx - px,        fy = sy - py;
      const w00 = (1 - fx) * (1 - fy);
      const w01 =      fx  * (1 - fy);
      const w10 = (1 - fx) *      fy ;
      const w11 =      fx  *      fy ;
      const i00 = (py * sw + px) * 4;
      const i01 = i00 + 4;
      const i10 = i00 + sw * 4;
      const i11 = i10 + 4;
      out[idx    ] = w00 * sd[i00]     + w01 * sd[i01]     + w10 * sd[i10]     + w11 * sd[i11];
      out[idx + 1] = w00 * sd[i00 + 1] + w01 * sd[i01 + 1] + w10 * sd[i10 + 1] + w11 * sd[i11 + 1];
      out[idx + 2] = w00 * sd[i00 + 2] + w01 * sd[i01 + 2] + w10 * sd[i10 + 2] + w11 * sd[i11 + 2];
      out[idx + 3] = 255;
    }
  }

  const dstCv = document.createElement('canvas');
  dstCv.width = outW; dstCv.height = outH;
  dstCv.getContext('2d').putImageData(new ImageData(out, outW, outH), 0, 0);
  return new Promise(res => dstCv.toBlob(res, 'image/jpeg', 0.9));
}

/* ── UI: SVG-based 4-corner picker overlay ───────────────────────────────── */

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload  = () => resolve({ img, url });
    img.onerror = e  => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

// Returns Promise<Blob> resolved with the warped image, or null if cancelled.
export async function runCropper(file) {
  const { img, url: imgUrl } = await fileToImage(file);
  const sw = img.naturalWidth, sh = img.naturalHeight;

  // Initial corner positions: 8% inset from each side
  const inset = 0.08;
  const corners = {
    tl: [sw * inset,         sh * inset],
    tr: [sw * (1 - inset),   sh * inset],
    br: [sw * (1 - inset),   sh * (1 - inset)],
    bl: [sw * inset,         sh * (1 - inset)],
  };

  const overlay = document.createElement('div');
  overlay.className = 'crop-overlay';
  overlay.innerHTML = `
    <div class="crop-sheet">
      <div class="crop-header">
        <span class="crop-title">Köşeleri Sürükle</span>
        <button class="crop-cancel" type="button" aria-label="İptal">
          <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="crop-stage">
        <div class="crop-img-wrap"></div>
        <svg class="crop-svg" viewBox="0 0 ${sw} ${sh}" preserveAspectRatio="xMidYMid meet">
          <defs>
            <mask id="cropMask">
              <rect x="0" y="0" width="${sw}" height="${sh}" fill="white"/>
              <polygon class="crop-poly-mask" fill="black"/>
            </mask>
          </defs>
          <rect class="crop-dim" x="0" y="0" width="${sw}" height="${sh}" mask="url(#cropMask)"/>
          <polygon class="crop-poly"/>
          <g class="crop-handles"></g>
        </svg>
      </div>
      <div class="crop-actions">
        <button class="crop-reset" type="button">Sıfırla</button>
        <button class="crop-confirm" type="button">Onayla</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const wrap = overlay.querySelector('.crop-img-wrap');
  const cssImg = document.createElement('img');
  cssImg.src = imgUrl;
  cssImg.draggable = false;
  wrap.appendChild(cssImg);

  const svg     = overlay.querySelector('.crop-svg');
  const poly    = overlay.querySelector('.crop-poly');
  const polyMsk = overlay.querySelector('.crop-poly-mask');
  const handlesG = overlay.querySelector('.crop-handles');

  // Handle radius scales with image — bigger image, bigger handle in viewBox space
  const handleR = Math.max(sw, sh) * 0.022;
  const order = ['tl', 'tr', 'br', 'bl'];
  const handles = {};
  for (const c of order) {
    const h = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    h.setAttribute('class', 'crop-handle');
    h.setAttribute('r', handleR);
    h.dataset.corner = c;
    handlesG.appendChild(h);
    handles[c] = h;
  }

  function refresh() {
    const pts = order.map(c => corners[c].join(',')).join(' ');
    poly.setAttribute('points', pts);
    polyMsk.setAttribute('points', pts);
    for (const c of order) {
      handles[c].setAttribute('cx', corners[c][0]);
      handles[c].setAttribute('cy', corners[c][1]);
    }
  }
  refresh();

  // Convert pointer event clientX/Y to viewBox (image-natural) coords
  function eventToImageCoords(ev) {
    const rect = svg.getBoundingClientRect();
    // SVG uses preserveAspectRatio meet, so it fits while preserving ratio.
    // Compute the actually-rendered image rect inside the SVG box.
    const scale = Math.min(rect.width / sw, rect.height / sh);
    const renderedW = sw * scale;
    const renderedH = sh * scale;
    const offX = (rect.width  - renderedW) / 2;
    const offY = (rect.height - renderedH) / 2;
    const x = (ev.clientX - rect.left - offX) / scale;
    const y = (ev.clientY - rect.top  - offY) / scale;
    return [Math.max(0, Math.min(sw, x)), Math.max(0, Math.min(sh, y))];
  }

  let dragging = null;
  function onDown(ev) {
    const t = ev.target;
    if (!t.classList?.contains('crop-handle')) return;
    dragging = t.dataset.corner;
    t.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  }
  function onMove(ev) {
    if (!dragging) return;
    corners[dragging] = eventToImageCoords(ev);
    refresh();
  }
  function onUp() { dragging = null; }

  svg.addEventListener('pointerdown', onDown);
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup',   onUp);
  svg.addEventListener('pointercancel', onUp);

  return new Promise(resolve => {
    overlay.querySelector('.crop-cancel').addEventListener('click', () => {
      cleanup(); resolve(null);
    });
    overlay.querySelector('.crop-reset').addEventListener('click', () => {
      corners.tl = [sw * inset,         sh * inset];
      corners.tr = [sw * (1 - inset),   sh * inset];
      corners.br = [sw * (1 - inset),   sh * (1 - inset)];
      corners.bl = [sw * inset,         sh * (1 - inset)];
      refresh();
    });
    overlay.querySelector('.crop-confirm').addEventListener('click', async () => {
      const btn = overlay.querySelector('.crop-confirm');
      btn.disabled = true; btn.textContent = 'İşleniyor...';
      try {
        const blob = await warpQuad(img, corners, 1600);
        cleanup(); resolve(blob);
      } catch (e) {
        btn.disabled = false; btn.textContent = 'Onayla';
        alert('Kırpma hatası: ' + e.message);
      }
    });
  });

  function cleanup() {
    overlay.remove();
    URL.revokeObjectURL(imgUrl);
  }
}
