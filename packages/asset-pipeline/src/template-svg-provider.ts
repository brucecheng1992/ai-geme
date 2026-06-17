import type { AssetPlanItem } from './schemas.js';

export function renderTemplateSvg(item: AssetPlanItem): string {
  const { w, h } = item.size;
  const concept = item.semantic?.expectedConcept;

  if (item.role === 'background') {
    return renderBackgroundSvg(w, h);
  }

  if (concept === 'cat') {
    return renderCatSvg(w, h);
  }

  if (concept === 'dog') {
    return renderDogSvg(w, h);
  }

  if (concept === 'alien') {
    return renderAlienSvg(w, h);
  }

  if (concept === 'tank') {
    return renderTankSvg(w, h);
  }

  if (concept === 'human_character') {
    return renderHumanSvg(w, h);
  }

  if (item.role === 'projectile' || concept === 'bullet' || concept === 'fishbone') {
    return concept === 'fishbone' ? renderFishboneSvg(w, h) : renderProjectileSvg(w, h);
  }

  if (item.role === 'collectible' || item.role === 'pickup') {
    return renderCollectibleSvg(w, h);
  }

  if (item.role === 'enemy' || item.role === 'hazard') {
    return renderAlienSvg(w, h);
  }

  return renderCatSvg(w, h);
}

function renderBackgroundSvg(w: number, h: number): string {
  return svg(w, h, `
  <title>template background fallback</title>
  <rect width="${w}" height="${h}" fill="#07111f"/>
  <circle cx="${Math.round(w * 0.22)}" cy="${Math.round(h * 0.25)}" r="${Math.max(12, Math.round(w * 0.04))}" fill="#f8d66d" opacity="0.75"/>
  <path d="M0 ${Math.round(h * 0.72)} C ${Math.round(w * 0.28)} ${Math.round(h * 0.6)}, ${Math.round(w * 0.58)} ${Math.round(h * 0.88)}, ${w} ${Math.round(h * 0.68)} L ${w} ${h} L 0 ${h} Z" fill="#123323" opacity="0.92"/>
`);
}

function renderProjectileSvg(w: number, h: number): string {
  const centerX = Math.round(w / 2);
  const centerY = Math.round(h / 2);
  return svg(w, h, `
  <title>template bullet fallback</title>
  <rect width="${w}" height="${h}" rx="${Math.round(Math.min(w, h) / 2)}" fill="#111827" opacity="0"/>
  <ellipse cx="${centerX}" cy="${centerY}" rx="${Math.round(w * 0.42)}" ry="${Math.round(h * 0.25)}" fill="#f8d66d"/>
  <path d="M${Math.round(w * 0.2)} ${centerY} L${Math.round(w * 0.04)} ${Math.round(h * 0.22)} M${Math.round(w * 0.2)} ${centerY} L${Math.round(w * 0.04)} ${Math.round(h * 0.78)}" stroke="#fff2a8" stroke-width="3" stroke-linecap="round"/>
`);
}

function renderFishboneSvg(w: number, h: number): string {
  const centerY = Math.round(h / 2);
  return svg(w, h, `
  <title>template fishbone fallback</title>
  <rect width="${w}" height="${h}" rx="${Math.round(Math.min(w, h) / 2)}" fill="#111827" opacity="0"/>
  <path d="M${Math.round(w * 0.14)} ${centerY} L${Math.round(w * 0.82)} ${centerY}" stroke="#f8f2da" stroke-width="5" stroke-linecap="round"/>
  <path d="M${Math.round(w * 0.78)} ${centerY} L${Math.round(w * 0.94)} ${Math.round(h * 0.3)} L${Math.round(w * 0.94)} ${Math.round(h * 0.7)} Z" fill="#f8f2da"/>
  <path d="M${Math.round(w * 0.34)} ${centerY} L${Math.round(w * 0.22)} ${Math.round(h * 0.24)} M${Math.round(w * 0.34)} ${centerY} L${Math.round(w * 0.22)} ${Math.round(h * 0.76)} M${Math.round(w * 0.54)} ${centerY} L${Math.round(w * 0.44)} ${Math.round(h * 0.24)} M${Math.round(w * 0.54)} ${centerY} L${Math.round(w * 0.44)} ${Math.round(h * 0.76)}" stroke="#f8f2da" stroke-width="4" stroke-linecap="round"/>
`);
}

function renderCollectibleSvg(w: number, h: number): string {
  const centerX = Math.round(w / 2);
  const centerY = Math.round(h / 2);
  return svg(w, h, `
  <title>template collectible fallback</title>
  <rect width="${w}" height="${h}" rx="${Math.round(Math.min(w, h) * 0.2)}" fill="#111827" opacity="0"/>
  <circle cx="${centerX}" cy="${centerY}" r="${Math.round(Math.min(w, h) * 0.34)}" fill="#ffd95a"/>
  <circle cx="${centerX}" cy="${centerY}" r="${Math.round(Math.min(w, h) * 0.22)}" fill="none" stroke="#8f5a00" stroke-width="4"/>
`);
}

function renderCatSvg(w: number, h: number): string {
  const centerX = Math.round(w / 2);
  const centerY = Math.round(h / 2);
  return svg(w, h, `
  <title>template cat fallback</title>
  <rect width="${w}" height="${h}" rx="${Math.round(Math.min(w, h) * 0.2)}" fill="#111827" opacity="0"/>
  <circle cx="${centerX}" cy="${centerY}" r="${Math.round(Math.min(w, h) * 0.36)}" fill="#ffd28a"/>
  <path d="M${Math.round(w * 0.28)} ${Math.round(h * 0.25)} L${Math.round(w * 0.38)} ${Math.round(h * 0.03)} L${Math.round(w * 0.48)} ${Math.round(h * 0.27)}" fill="#ffd28a"/>
  <path d="M${Math.round(w * 0.72)} ${Math.round(h * 0.25)} L${Math.round(w * 0.62)} ${Math.round(h * 0.03)} L${Math.round(w * 0.52)} ${Math.round(h * 0.27)}" fill="#ffd28a"/>
  <circle cx="${Math.round(w * 0.42)}" cy="${Math.round(h * 0.46)}" r="${Math.round(Math.min(w, h) * 0.055)}" fill="#112033"/>
  <circle cx="${Math.round(w * 0.58)}" cy="${Math.round(h * 0.46)}" r="${Math.round(Math.min(w, h) * 0.055)}" fill="#112033"/>
`);
}

function renderDogSvg(w: number, h: number): string {
  const centerX = Math.round(w / 2);
  const centerY = Math.round(h / 2);
  return svg(w, h, `
  <title>template dog fallback</title>
  <rect width="${w}" height="${h}" rx="${Math.round(Math.min(w, h) * 0.2)}" fill="#111827" opacity="0"/>
  <ellipse cx="${centerX}" cy="${centerY}" rx="${Math.round(w * 0.34)}" ry="${Math.round(h * 0.32)}" fill="#c58a55"/>
  <ellipse cx="${Math.round(w * 0.24)}" cy="${Math.round(h * 0.28)}" rx="${Math.round(w * 0.11)}" ry="${Math.round(h * 0.18)}" fill="#8a5a35"/>
  <ellipse cx="${Math.round(w * 0.76)}" cy="${Math.round(h * 0.28)}" rx="${Math.round(w * 0.11)}" ry="${Math.round(h * 0.18)}" fill="#8a5a35"/>
  <circle cx="${Math.round(w * 0.38)}" cy="${Math.round(h * 0.46)}" r="${Math.round(Math.min(w, h) * 0.055)}" fill="#112033"/>
  <circle cx="${Math.round(w * 0.62)}" cy="${Math.round(h * 0.46)}" r="${Math.round(Math.min(w, h) * 0.055)}" fill="#112033"/>
  <ellipse cx="${centerX}" cy="${Math.round(h * 0.58)}" rx="${Math.round(w * 0.1)}" ry="${Math.round(h * 0.07)}" fill="#f2f2f2"/>
  <circle cx="${centerX}" cy="${Math.round(h * 0.54)}" r="${Math.round(Math.min(w, h) * 0.045)}" fill="#112033"/>
`);
}

function renderAlienSvg(w: number, h: number): string {
  const centerX = Math.round(w / 2);
  return svg(w, h, `
  <title>template alien fallback</title>
  <rect width="${w}" height="${h}" rx="${Math.round(Math.min(w, h) * 0.16)}" fill="#111827" opacity="0"/>
  <path d="M${Math.round(w * 0.22)} ${Math.round(h * 0.18)} L${Math.round(w * 0.08)} ${Math.round(h * 0.02)} M${Math.round(w * 0.78)} ${Math.round(h * 0.18)} L${Math.round(w * 0.92)} ${Math.round(h * 0.02)}" stroke="#86ffb7" stroke-width="4" stroke-linecap="round"/>
  <circle cx="${Math.round(w * 0.08)}" cy="${Math.round(h * 0.02)}" r="${Math.round(Math.min(w, h) * 0.07)}" fill="#7cff9b"/>
  <circle cx="${Math.round(w * 0.92)}" cy="${Math.round(h * 0.02)}" r="${Math.round(Math.min(w, h) * 0.07)}" fill="#7cff9b"/>
  <path d="M${centerX} ${Math.round(h * 0.12)} L${Math.round(w * 0.9)} ${Math.round(h * 0.5)} L${centerX} ${Math.round(h * 0.92)} L${Math.round(w * 0.1)} ${Math.round(h * 0.5)} Z" fill="#7cff9b"/>
  <circle cx="${Math.round(w * 0.38)}" cy="${Math.round(h * 0.45)}" r="${Math.round(Math.min(w, h) * 0.07)}" fill="#112033"/>
  <circle cx="${Math.round(w * 0.62)}" cy="${Math.round(h * 0.45)}" r="${Math.round(Math.min(w, h) * 0.07)}" fill="#112033"/>
`);
}

function renderTankSvg(w: number, h: number): string {
  return svg(w, h, `
  <title>template tank fallback</title>
  <rect width="${w}" height="${h}" rx="${Math.round(Math.min(w, h) * 0.16)}" fill="#111827" opacity="0"/>
  <rect x="${Math.round(w * 0.08)}" y="${Math.round(h * 0.56)}" width="${Math.round(w * 0.84)}" height="${Math.round(h * 0.22)}" rx="${Math.round(h * 0.08)}" fill="#2c3824"/>
  <rect x="${Math.round(w * 0.18)}" y="${Math.round(h * 0.28)}" width="${Math.round(w * 0.64)}" height="${Math.round(h * 0.34)}" rx="${Math.round(h * 0.08)}" fill="#728a45"/>
  <rect x="${Math.round(w * 0.38)}" y="${Math.round(h * 0.16)}" width="${Math.round(w * 0.24)}" height="${Math.round(h * 0.2)}" rx="${Math.round(h * 0.06)}" fill="#728a45"/>
  <rect x="${Math.round(w * 0.6)}" y="${Math.round(h * 0.24)}" width="${Math.round(w * 0.34)}" height="${Math.round(h * 0.1)}" rx="${Math.round(h * 0.03)}" fill="#2c3824"/>
`);
}

function renderHumanSvg(w: number, h: number): string {
  const centerX = Math.round(w / 2);
  return svg(w, h, `
  <title>template human fallback</title>
  <rect width="${w}" height="${h}" rx="${Math.round(Math.min(w, h) * 0.18)}" fill="#111827" opacity="0"/>
  <circle cx="${centerX}" cy="${Math.round(h * 0.26)}" r="${Math.round(Math.min(w, h) * 0.18)}" fill="#f2c58b"/>
  <rect x="${Math.round(w * 0.25)}" y="${Math.round(h * 0.45)}" width="${Math.round(w * 0.5)}" height="${Math.round(h * 0.38)}" rx="${Math.round(w * 0.14)}" fill="#5aa6ff"/>
  <circle cx="${Math.round(w * 0.43)}" cy="${Math.round(h * 0.25)}" r="${Math.round(Math.min(w, h) * 0.035)}" fill="#112033"/>
  <circle cx="${Math.round(w * 0.57)}" cy="${Math.round(h * 0.25)}" r="${Math.round(Math.min(w, h) * 0.035)}" fill="#112033"/>
`);
}

function svg(width: number, height: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
${body}</svg>
`;
}
