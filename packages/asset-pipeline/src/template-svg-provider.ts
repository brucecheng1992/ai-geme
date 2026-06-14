import type { AssetPlanItem } from './schemas.js';

export function renderTemplateSvg(item: AssetPlanItem): string {
  const { w, h } = item.size;
  const centerX = Math.round(w / 2);
  const centerY = Math.round(h / 2);

  if (item.role === 'background') {
    return svg(w, h, `
  <rect width="${w}" height="${h}" fill="#07111f"/>
  <circle cx="${Math.round(w * 0.22)}" cy="${Math.round(h * 0.25)}" r="${Math.max(12, Math.round(w * 0.04))}" fill="#f8d66d" opacity="0.75"/>
  <path d="M0 ${Math.round(h * 0.72)} C ${Math.round(w * 0.28)} ${Math.round(h * 0.6)}, ${Math.round(w * 0.58)} ${Math.round(h * 0.88)}, ${w} ${Math.round(h * 0.68)} L ${w} ${h} L 0 ${h} Z" fill="#123323" opacity="0.92"/>
`);
  }

  if (item.role === 'projectile') {
    return svg(w, h, `
  <rect width="${w}" height="${h}" rx="${Math.round(Math.min(w, h) / 2)}" fill="#111827" opacity="0"/>
  <ellipse cx="${centerX}" cy="${centerY}" rx="${Math.round(w * 0.42)}" ry="${Math.round(h * 0.25)}" fill="#f8d66d"/>
  <path d="M${Math.round(w * 0.2)} ${centerY} L${Math.round(w * 0.04)} ${Math.round(h * 0.22)} M${Math.round(w * 0.2)} ${centerY} L${Math.round(w * 0.04)} ${Math.round(h * 0.78)}" stroke="#fff2a8" stroke-width="3" stroke-linecap="round"/>
`);
  }

  if (item.role === 'collectible') {
    return svg(w, h, `
  <rect width="${w}" height="${h}" rx="${Math.round(Math.min(w, h) * 0.2)}" fill="#111827" opacity="0"/>
  <circle cx="${centerX}" cy="${centerY}" r="${Math.round(Math.min(w, h) * 0.34)}" fill="#ffd95a"/>
  <circle cx="${centerX}" cy="${centerY}" r="${Math.round(Math.min(w, h) * 0.22)}" fill="none" stroke="#8f5a00" stroke-width="4"/>
`);
  }

  if (item.role === 'enemy' || item.role === 'hazard') {
    return svg(w, h, `
  <rect width="${w}" height="${h}" rx="${Math.round(Math.min(w, h) * 0.16)}" fill="#111827" opacity="0"/>
  <path d="M${centerX} ${Math.round(h * 0.08)} L${Math.round(w * 0.9)} ${centerY} L${centerX} ${Math.round(h * 0.92)} L${Math.round(w * 0.1)} ${centerY} Z" fill="#7cff9b"/>
  <circle cx="${Math.round(w * 0.38)}" cy="${Math.round(h * 0.45)}" r="${Math.round(Math.min(w, h) * 0.07)}" fill="#112033"/>
  <circle cx="${Math.round(w * 0.62)}" cy="${Math.round(h * 0.45)}" r="${Math.round(Math.min(w, h) * 0.07)}" fill="#112033"/>
`);
  }

  return svg(w, h, `
  <rect width="${w}" height="${h}" rx="${Math.round(Math.min(w, h) * 0.2)}" fill="#111827" opacity="0"/>
  <circle cx="${centerX}" cy="${centerY}" r="${Math.round(Math.min(w, h) * 0.36)}" fill="#ffd28a"/>
  <path d="M${Math.round(w * 0.28)} ${Math.round(h * 0.25)} L${Math.round(w * 0.38)} ${Math.round(h * 0.03)} L${Math.round(w * 0.48)} ${Math.round(h * 0.27)}" fill="#ffd28a"/>
  <path d="M${Math.round(w * 0.72)} ${Math.round(h * 0.25)} L${Math.round(w * 0.62)} ${Math.round(h * 0.03)} L${Math.round(w * 0.52)} ${Math.round(h * 0.27)}" fill="#ffd28a"/>
  <circle cx="${Math.round(w * 0.42)}" cy="${Math.round(h * 0.46)}" r="${Math.round(Math.min(w, h) * 0.055)}" fill="#112033"/>
  <circle cx="${Math.round(w * 0.58)}" cy="${Math.round(h * 0.46)}" r="${Math.round(Math.min(w, h) * 0.055)}" fill="#112033"/>
`);
}

function svg(width: number, height: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
${body}</svg>
`;
}
