// 셀별로 캐릭터의 바운딩 박스를 찾아 발 중심 기준으로 재배치한 새 스프라이트 시트를 출력.
// 입력: web/public/assets/kael/anim-*.png  (256x246 균일 셀, RGBA)
// 출력: 같은 폴더에 anim-*-norm.png
//
// 알고리즘:
//   1) 각 셀에서 alpha>임계값 픽셀들을 BFS로 묶어 connected component 검출
//   2) 최대 컴포넌트 = 캐릭터 본체 (작은 잔여물/디브리는 자동 제외)
//   3) 모든 프레임의 캐릭터 바닥(maxY)을 cellH-margin에, 가로 중심을 cellW/2 에 정렬
//   4) bbox 안의 불투명 픽셀만 새 위치로 복사 (외부의 디브리는 자동 탈락)

import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CELL_W = 256;
const CELL_H = 246;
const ALPHA_THRESH = 32;
const MIN_COMPONENT = 200;   // 이보다 작은 덩어리는 디브리로 간주
const BOTTOM_MARGIN = 4;     // 발이 닿을 위치: Y = CELL_H - BOTTOM_MARGIN

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, '..', 'web', 'public', 'assets', 'kael');

// reference: 키 보정의 기준 시트 (다른 시트들은 이 시트의 평균 bbox 높이에 맞춰 스케일됨)
const SHEETS = [
  { file: 'anim-idle.png', reference: true },
  { file: 'anim-run.png' },
  { file: 'anim-jump.png' },
  { file: 'anim-attack.png' },
];

async function loadRGBA(p) {
  const { data, info } = await sharp(p)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

// 셀 안의 connected component들을 모두 찾는다.
// 각 component: { minX, minY, maxX, maxY, count, mask } (mask = cw*ch Uint8, 셀 로컬 좌표)
function findComponentsInCell(img, cellOriginX) {
  const cw = CELL_W;
  const ch = CELL_H;
  const stride = img.width;
  const visited = new Uint8Array(cw * ch);
  const components = [];

  const alphaAt = (x, y) =>
    img.data[((y) * stride + (cellOriginX + x)) * 4 + 3];

  for (let sy = 0; sy < ch; sy++) {
    for (let sx = 0; sx < cw; sx++) {
      const si = sy * cw + sx;
      if (visited[si]) continue;
      if (alphaAt(sx, sy) < ALPHA_THRESH) { visited[si] = 1; continue; }

      const mask = new Uint8Array(cw * ch);
      const stack = [sx, sy];
      let minX = sx, minY = sy, maxX = sx, maxY = sy, count = 0;

      while (stack.length) {
        const py = stack.pop();
        const px = stack.pop();
        if (px < 0 || py < 0 || px >= cw || py >= ch) continue;
        const li = py * cw + px;
        if (visited[li]) continue;
        if (alphaAt(px, py) < ALPHA_THRESH) { visited[li] = 1; continue; }
        visited[li] = 1;
        mask[li] = 1;
        count++;
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
        stack.push(px + 1, py, px - 1, py, px, py + 1, px, py - 1);
      }

      if (count >= MIN_COMPONENT) {
        components.push({ minX, minY, maxX, maxY, count, mask });
      }
    }
  }
  // 큰 것부터
  components.sort((a, b) => b.count - a.count);
  return components;
}

// 캐릭터 본체 = 최대 컴포넌트 (앵커/스케일 계산용)
function pickAnchor(components) {
  return components.length ? components[0] : null;
}

// 출력에 복사할 영역 = 캐릭터 + 본체 근처의 valid 컴포넌트 (슬래시 이펙트 등)
// 디브리는 보통 캐릭터 머리 위 셀 상단에 있으므로 c.minY가 anchor 머리 위쪽인 것은 제외.
function pickRenderSet(components, anchor) {
  if (!anchor) return [];
  const SIDE_MARGIN = 60;       // 좌우로 이펙트가 칼끝까지 늘어남
  const TOP_TOLERANCE = 20;     // 슬래시가 머리 살짝 위까지 올라오는 건 허용
  return components.filter((c) => {
    if (c === anchor) return true;
    const horizOK = c.maxX >= anchor.minX - SIDE_MARGIN && c.minX <= anchor.maxX + SIDE_MARGIN;
    const notAboveHead = c.minY >= anchor.minY - TOP_TOLERANCE;
    const notBelowFeet = c.minY <= anchor.maxY;
    return horizOK && notAboveHead && notBelowFeet;
  });
}

function unionBBox(comps) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of comps) {
    if (c.minX < minX) minX = c.minX;
    if (c.minY < minY) minY = c.minY;
    if (c.maxX > maxX) maxX = c.maxX;
    if (c.maxY > maxY) maxY = c.maxY;
  }
  return { minX, minY, maxX, maxY };
}

// 시트를 로드하고 각 셀의 컴포넌트들을 미리 계산해둔다.
async function scanSheet(file) {
  const inPath = path.join(ASSETS, file);
  const img = await loadRGBA(inPath);
  if (img.height !== CELL_H) throw new Error(`${file}: height ${img.height} != ${CELL_H}`);
  if (img.width % CELL_W !== 0) throw new Error(`${file}: width ${img.width} not divisible by ${CELL_W}`);
  const frames = img.width / CELL_W;
  const cells = [];
  for (let f = 0; f < frames; f++) {
    const comps = findComponentsInCell(img, f * CELL_W);
    const anchor = pickAnchor(comps);
    const renderSet = pickRenderSet(comps, anchor);
    cells.push({ comps, anchor, renderSet });
  }
  return { img, frames, cells };
}

// 합성: anchor 발=발판, renderSet 전체를 같은 비율/오프셋으로 복사
async function emitCell(scan, frameIdx, scale, outBuf) {
  const { img, cells } = scan;
  const { anchor, renderSet } = cells[frameIdx];
  if (!anchor) return null;
  const cellX = frameIdx * CELL_W;

  // renderSet의 union bbox를 crop 영역으로
  const u = unionBBox(renderSet);
  const uw = u.maxX - u.minX + 1;
  const uh = u.maxY - u.minY + 1;

  // mask 합치기 (renderSet에 속한 픽셀만 가져온다)
  const unionMask = new Uint8Array(CELL_W * CELL_H);
  for (const c of renderSet) {
    for (let i = 0; i < c.mask.length; i++) if (c.mask[i]) unionMask[i] = 1;
  }

  // crop 버퍼 채우기
  const cropBuf = Buffer.alloc(uw * uh * 4, 0);
  for (let y = 0; y < uh; y++) {
    for (let x = 0; x < uw; x++) {
      const cellLocalY = u.minY + y;
      const cellLocalX = u.minX + x;
      const maskIdx = cellLocalY * CELL_W + cellLocalX;
      if (!unionMask[maskIdx]) continue;
      const srcIdx = (cellLocalY * img.width + (cellX + cellLocalX)) * 4;
      const dstIdx = (y * uw + x) * 4;
      cropBuf[dstIdx] = img.data[srcIdx];
      cropBuf[dstIdx + 1] = img.data[srcIdx + 1];
      cropBuf[dstIdx + 2] = img.data[srcIdx + 2];
      cropBuf[dstIdx + 3] = img.data[srcIdx + 3];
    }
  }

  // scale 적용
  let scaledBuf = cropBuf, scaledW = uw, scaledH = uh;
  if (scale !== 1) {
    scaledW = Math.max(1, Math.round(uw * scale));
    scaledH = Math.max(1, Math.round(uh * scale));
    scaledBuf = await sharp(cropBuf, { raw: { width: uw, height: uh, channels: 4 } })
      .resize(scaledW, scaledH, { kernel: 'nearest' })
      .raw()
      .toBuffer();
  }

  // 앵커(=캐릭터 본체)의 발 중심을 (CELL_W/2, CELL_H-BOTTOM_MARGIN)에 맞추되,
  // 앵커가 union bbox 안에서 차지하던 상대 위치를 그대로 유지.
  const anchorCenterXRel = (anchor.minX + anchor.maxX) / 2 - u.minX;
  const anchorBottomYRel = anchor.maxY - u.minY;
  const scaledAnchorCenterX = anchorCenterXRel * scale;
  const scaledAnchorBottomY = anchorBottomYRel * scale;

  const targetCenterX = CELL_W / 2;
  const targetBottomY = CELL_H - BOTTOM_MARGIN;
  const dstOriginLocalX = Math.round(targetCenterX - scaledAnchorCenterX);
  const dstOriginY = Math.round(targetBottomY - scaledAnchorBottomY);

  for (let y = 0; y < scaledH; y++) {
    for (let x = 0; x < scaledW; x++) {
      const srcIdx = (y * scaledW + x) * 4;
      const a = scaledBuf[srcIdx + 3];
      if (a < ALPHA_THRESH) continue;
      const dstLocalX = dstOriginLocalX + x;
      const dstY = dstOriginY + y;
      if (dstLocalX < 0 || dstLocalX >= CELL_W || dstY < 0 || dstY >= CELL_H) continue;
      const dstIdx = (dstY * img.width + (cellX + dstLocalX)) * 4;
      outBuf[dstIdx] = scaledBuf[srcIdx];
      outBuf[dstIdx + 1] = scaledBuf[srcIdx + 1];
      outBuf[dstIdx + 2] = scaledBuf[srcIdx + 2];
      outBuf[dstIdx + 3] = a;
    }
  }
  return {
    anchor: `${anchor.maxX - anchor.minX + 1}x${anchor.maxY - anchor.minY + 1}`,
    union: `${uw}x${uh}`,
    scaled: `${scaledW}x${scaledH}`,
    components: renderSet.length,
  };
}

function anchorHeight(cell) {
  const a = cell.anchor;
  return a ? a.maxY - a.minY + 1 : 0;
}

async function main() {
  const scans = {};
  for (const sheet of SHEETS) {
    const scan = await scanSheet(sheet.file);
    scans[sheet.file] = scan;
    console.log(`scan ${sheet.file}: ${scan.frames} frame(s)`);
    scan.cells.forEach((cell, i) => {
      if (cell.anchor) {
        const a = cell.anchor;
        console.log(`  f${i}: anchor ${a.maxX - a.minX + 1}x${a.maxY - a.minY + 1} (${a.count}px), components=${cell.renderSet.length}`);
      } else {
        console.log(`  f${i}: (none)`);
      }
    });
  }

  const refSheet = SHEETS.find((s) => s.reference);
  const refCells = scans[refSheet.file].cells.filter((c) => c.anchor);
  const targetH = refCells.reduce((a, c) => a + anchorHeight(c), 0) / refCells.length;
  console.log(`\nReference: ${refSheet.file}, target anchor height = ${targetH.toFixed(1)}px`);

  for (const sheet of SHEETS) {
    const scan = scans[sheet.file];
    const valid = scan.cells.filter((c) => c.anchor);
    const avgH = valid.reduce((a, c) => a + anchorHeight(c), 0) / valid.length;
    const scale = sheet.reference ? 1 : targetH / avgH;
    console.log(`\n${sheet.file}: avg anchor h=${avgH.toFixed(1)}px → scale ${scale.toFixed(3)}`);

    const outBuf = Buffer.alloc(scan.img.width * scan.img.height * 4, 0);
    for (let f = 0; f < scan.frames; f++) {
      const r = await emitCell(scan, f, scale, outBuf);
      if (r) console.log(`  f${f}: anchor=${r.anchor} union=${r.union} → ${r.scaled} (${r.components} components)`);
    }
    const outPath = path.join(ASSETS, sheet.file.replace('.png', '-norm.png'));
    await sharp(outBuf, { raw: { width: scan.img.width, height: scan.img.height, channels: 4 } })
      .png()
      .toFile(outPath);
    console.log(`  → ${path.relative(process.cwd(), outPath)}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
