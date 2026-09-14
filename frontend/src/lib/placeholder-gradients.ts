// Gradientes "dark biblical" (chiaroscuro: âmbar, carmesim, carvão) usados
// como preenchimento do ImageStreamHero antes de existirem thumbnails reais.
const PALETTES: [string, string, string][] = [
  ["#1a1207", "#b8791f", "#050403"],
  ["#1a0707", "#9c2b2b", "#050403"],
  ["#120a1a", "#5a3b9c", "#050403"],
  ["#1a1507", "#d4a13d", "#0a0603"],
  ["#0a1207", "#3b6b4a", "#050403"],
  ["#1a0d07", "#c46a2d", "#050403"],
];

function gradientSvg([from, via, to]: [string, string, string], seed: number) {
  const angle = (seed * 47) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560">
    <defs>
      <linearGradient id="g" gradientTransform="rotate(${angle} 0.5 0.5)">
        <stop offset="0%" stop-color="${from}"/>
        <stop offset="55%" stop-color="${via}"/>
        <stop offset="100%" stop-color="${to}"/>
      </linearGradient>
    </defs>
    <rect width="400" height="560" fill="url(#g)"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function placeholderStreamImages(count = 9) {
  return Array.from({ length: count }, (_, i) => ({
    src: gradientSvg(PALETTES[i % PALETTES.length], i),
    alt: "",
  }));
}
