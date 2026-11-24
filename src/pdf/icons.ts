// Draw the same Lucide icons the screen uses onto a PDF page with vector operators.
import { PDFPage, RGB } from 'pdf-lib';
import { ICON_NODES, IconName } from '../iconNodes';

type Node = [string, Record<string, string | number>];

const NUM = /[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/y;
const ARGS: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

const fmt = (n: number) => String(Math.round(n * 10000) / 10000);

/**
 * Rewrite an SVG path with absolute commands and plain spacing. The page library cannot read packed arc flags such
 * as "a2 2 0 013 5" or relative shorthand, and Lucide uses both. Arcs stay arcs. H and V become L.
 */
export function normalizeSvgPath(d: string): string {
  let i = 0;
  const n = d.length;
  const out: string[] = [];
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  const skip = () => {
    while (i < n && /[\s,]/.test(d[i])) i++;
  };
  const num = (): number => {
    skip();
    NUM.lastIndex = i;
    const m = NUM.exec(d);
    if (!m) throw new Error(`Bad path data near ${i}`);
    i = NUM.lastIndex;
    return parseFloat(m[0]);
  };
  const flag = (): number => {
    skip();
    const ch = d[i];
    if (ch !== '0' && ch !== '1') throw new Error(`Bad arc flag near ${i}`);
    i++;
    return ch === '1' ? 1 : 0;
  };
  let cmd = '';
  while (true) {
    skip();
    if (i >= n) break;
    const ch = d[i];
    if (/[A-Za-z]/.test(ch)) {
      cmd = ch;
      i++;
    } else if (!cmd) {
      throw new Error('Path data must start with a command');
    }
    const up = cmd.toUpperCase();
    const rel = cmd !== up;
    if (!(up in ARGS)) throw new Error(`Unknown path command ${cmd}`);
    if (up === 'Z') {
      out.push('Z');
      cx = sx;
      cy = sy;
      cmd = '';
      continue;
    }
    const ox = rel ? cx : 0;
    const oy = rel ? cy : 0;
    switch (up) {
      case 'M': {
        const x = num() + ox;
        const y = num() + oy;
        out.push(`M${fmt(x)} ${fmt(y)}`);
        cx = sx = x;
        cy = sy = y;
        // More pairs after a move are drawn lines.
        cmd = rel ? 'l' : 'L';
        break;
      }
      case 'L':
      case 'T': {
        const x = num() + ox;
        const y = num() + oy;
        out.push(`${up}${fmt(x)} ${fmt(y)}`);
        cx = x;
        cy = y;
        break;
      }
      case 'H': {
        const x = num() + ox;
        out.push(`L${fmt(x)} ${fmt(cy)}`);
        cx = x;
        break;
      }
      case 'V': {
        const y = num() + oy;
        out.push(`L${fmt(cx)} ${fmt(y)}`);
        cy = y;
        break;
      }
      case 'C': {
        const v = [num() + ox, num() + oy, num() + ox, num() + oy, num() + ox, num() + oy];
        out.push(`C${v.map(fmt).join(' ')}`);
        cx = v[4];
        cy = v[5];
        break;
      }
      case 'S':
      case 'Q': {
        const v = [num() + ox, num() + oy, num() + ox, num() + oy];
        out.push(`${up}${v.map(fmt).join(' ')}`);
        cx = v[2];
        cy = v[3];
        break;
      }
      case 'A': {
        const rx = num();
        const ry = num();
        const rot = num();
        const large = flag();
        const sweep = flag();
        const x = num() + ox;
        const y = num() + oy;
        out.push(`A${fmt(rx)} ${fmt(ry)} ${fmt(rot)} ${large} ${sweep} ${fmt(x)} ${fmt(y)}`);
        cx = x;
        cy = y;
        break;
      }
    }
  }
  return out.join(' ');
}

/** Draw one icon with its top left corner at (x, yTop). Stroke only, like the screen version. */
export function drawIcon(page: PDFPage, name: IconName, x: number, yTop: number, size: number, color: RGB): void {
  const s = size / 24;
  const bw = 1.75 * s;
  const nodes = ICON_NODES[name] as unknown as Node[];
  const pt = (px: number, py: number) => ({ x: x + px * s, y: yTop - py * s });
  for (const [tag, a] of nodes) {
    const n = (k: string) => Number(a[k] ?? 0);
    const path = (d: string) => page.drawSvgPath(normalizeSvgPath(d), { x, y: yTop, scale: s, borderWidth: bw, borderColor: color, borderLineCap: 1 });
    if (tag === 'path') {
      path(String(a.d));
    } else if (tag === 'circle') {
      const c = pt(n('cx'), n('cy'));
      page.drawCircle({ x: c.x, y: c.y, size: n('r') * s, borderWidth: bw, borderColor: color });
    } else if (tag === 'ellipse') {
      const c = pt(n('cx'), n('cy'));
      page.drawEllipse({ x: c.x, y: c.y, xScale: n('rx') * s, yScale: n('ry') * s, borderWidth: bw, borderColor: color });
    } else if (tag === 'line') {
      page.drawLine({ start: pt(n('x1'), n('y1')), end: pt(n('x2'), n('y2')), thickness: bw, color, lineCap: 1 });
    } else if (tag === 'rect') {
      const p = pt(n('x'), n('y') + n('height'));
      page.drawRectangle({ x: p.x, y: p.y, width: n('width') * s, height: n('height') * s, borderWidth: bw, borderColor: color });
    } else if (tag === 'polyline' || tag === 'polygon') {
      const nums = String(a.points).trim().split(/[\s,]+/).map(Number);
      let d = '';
      for (let i = 0; i + 1 < nums.length; i += 2) d += `${i === 0 ? 'M' : 'L'}${nums[i]} ${nums[i + 1]} `;
      if (tag === 'polygon') d += 'Z';
      path(d);
    }
  }
}
