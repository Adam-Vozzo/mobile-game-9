/*
 * render.js — Procedural creature art. Builds an inline SVG from a genome so a
 * lineage is visually recognisable and evolution is *visible*: higher tiers gain
 * silhouette (crests, wings, auras) and mutation traits add glow / extras.
 */
(function () {
  const EVO = (window.EVO = window.EVO || {});

  function dom(genome, key) { return genome[key][0]; } // dominant allele

  // Gradient ids must be unique per RENDERED SVG, not per creature: the same
  // creature drawn in two views would otherwise emit duplicate ids, and
  // url(#...) resolves to the first one in the document — which may sit in a
  // hidden (display:none) view whose gradients don't render, leaving bodies
  // invisible. A global counter guarantees uniqueness.
  let svgSeq = 0;

  // Returns an SVG string. `size` is the viewport px (square).
  EVO.creatureSVG = function (c, size) {
    size = size || 120;
    const g = c.genome;
    const hue = dom(g, 'hue');
    const pattern = EVO.PATTERNS[dom(g, 'pattern')] || 'solid';
    const bodySize = EVO.express(g, 'bodySize'); // 10..100
    const limb = EVO.LIMBS[dom(g, 'limb')] || 'legs';
    const eyes = Math.round((g.eyes[0] + g.eyes[1]) / 2);
    const horn = dom(g, 'horn');
    const sp = EVO.SPECIES[c.species] || EVO.SPECIES.grubling;
    const tier = sp.tier || 0;
    const traits = c.traits || [];

    // Palette derived from hue with light/dark shading.
    const bodyLight = `hsl(${hue}, 68%, 66%)`;
    const bodyMid = `hsl(${hue}, 62%, 54%)`;
    const bodyDark = `hsl(${hue}, 58%, 38%)`;
    const belly = `hsl(${hue}, 55%, 78%)`;
    const accent = `hsl(${(hue + 42) % 360}, 72%, 60%)`;
    const accentDark = `hsl(${(hue + 42) % 360}, 65%, 44%)`;
    const biomeColor = sp.biome ? EVO.BIOMES[sp.biome].color : accent;

    const cx = size / 2;
    const cy = size / 2 + size * 0.03;
    const scale = size / 120;
    const bw = (26 + bodySize * 0.26) * scale;
    const bh = (23 + bodySize * 0.2) * scale;

    const uid = 'r' + (++svgSeq);

    // ---- defs: gradients + soft shadow ----
    const defs = `<defs>
      <radialGradient id="body${uid}" cx="38%" cy="32%" r="80%">
        <stop offset="0%" stop-color="${bodyLight}"/>
        <stop offset="60%" stop-color="${bodyMid}"/>
        <stop offset="100%" stop-color="${bodyDark}"/>
      </radialGradient>
      <radialGradient id="belly${uid}" cx="50%" cy="40%" r="70%">
        <stop offset="0%" stop-color="${belly}"/>
        <stop offset="100%" stop-color="${bodyMid}"/>
      </radialGradient>
      <radialGradient id="aura${uid}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${biomeColor}" stop-opacity="0.0"/>
        <stop offset="70%" stop-color="${biomeColor}" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="${biomeColor}" stop-opacity="0"/>
      </radialGradient>
    </defs>`;

    // ---- aura for evolved / bioluminescent ----
    let aura = '';
    if (tier >= 2 || traits.includes('bioluminescent')) {
      aura = `<circle cx="${cx}" cy="${cy}" r="${bw * 1.5}" fill="url(#aura${uid})"/>`;
    }

    // ---- ground shadow ----
    const shadow = `<ellipse cx="${cx}" cy="${cy + bh * 1.05}" rx="${bw * 0.85}" ry="${bh * 0.18}" fill="#000" opacity="0.22"/>`;

    // ---- wings (tier 2) ----
    let wings = '';
    if (tier >= 2) {
      wings = `
        <path d="M${cx - bw * 0.5} ${cy - bh * 0.2}
                 q ${-bw * 1.0} ${-bh * 0.9} ${-bw * 1.15} ${bh * 0.3}
                 q ${bw * 0.5} ${bh * 0.1} ${bw * 1.05} ${-bh * 0.2} z"
              fill="${accent}" opacity="0.9"/>
        <path d="M${cx + bw * 0.5} ${cy - bh * 0.2}
                 q ${bw * 1.0} ${-bh * 0.9} ${bw * 1.15} ${bh * 0.3}
                 q ${-bw * 0.5} ${bh * 0.1} ${-bw * 1.05} ${-bh * 0.2} z"
              fill="${accent}" opacity="0.9"/>`;
    }

    // ---- tail (tier >= 1) ----
    let tail = '';
    if (tier >= 1) {
      tail = `<path d="M${cx + bw * 0.85} ${cy + bh * 0.1}
                   q ${bw * 0.7} ${-bh * 0.1} ${bw * 0.62} ${-bh * 0.85}
                   q ${bw * 0.28} ${bh * 0.3} ${-bw * 0.28} ${bh * 0.72} z"
                 fill="url(#body${uid})"/>`;
    }

    // ---- limbs ----
    const footY = cy + bh * 0.92;
    let limbs = '';
    if (limb === 'fins') {
      limbs = `
        <path d="M${cx - bw * 0.72} ${cy} q ${-bw * 0.55} ${bh * 0.15} ${-bw * 0.22} ${bh * 0.75} q ${bw * 0.32} ${-bh * 0.08} ${bw * 0.44} ${-bh * 0.32} z" fill="${accent}"/>
        <path d="M${cx + bw * 0.72} ${cy} q ${bw * 0.55} ${bh * 0.15} ${bw * 0.22} ${bh * 0.75} q ${-bw * 0.32} ${-bh * 0.08} ${-bw * 0.44} ${-bh * 0.32} z" fill="${accent}"/>`;
    } else if (limb === 'talons') {
      limbs = `
        <line x1="${cx - bw * 0.32}" y1="${cy + bh * 0.5}" x2="${cx - bw * 0.32}" y2="${footY}" stroke="${bodyDark}" stroke-width="${bw * 0.13}" stroke-linecap="round"/>
        <line x1="${cx + bw * 0.32}" y1="${cy + bh * 0.5}" x2="${cx + bw * 0.32}" y2="${footY}" stroke="${bodyDark}" stroke-width="${bw * 0.13}" stroke-linecap="round"/>
        <path d="M${cx - bw * 0.5} ${footY} l ${bw * 0.18} ${-bh * 0.06} l ${bw * 0.18} ${bh * 0.06}" stroke="${accentDark}" stroke-width="2" fill="none"/>
        <path d="M${cx + bw * 0.14} ${footY} l ${bw * 0.18} ${-bh * 0.06} l ${bw * 0.18} ${bh * 0.06}" stroke="${accentDark}" stroke-width="2" fill="none"/>`;
    } else if (limb === 'paws') {
      limbs = `
        <ellipse cx="${cx - bw * 0.34}" cy="${footY}" rx="${bw * 0.2}" ry="${bh * 0.15}" fill="${bodyDark}"/>
        <ellipse cx="${cx + bw * 0.34}" cy="${footY}" rx="${bw * 0.2}" ry="${bh * 0.15}" fill="${bodyDark}"/>`;
    } else {
      limbs = `
        <rect x="${cx - bw * 0.44}" y="${cy + bh * 0.45}" width="${bw * 0.16}" height="${bh * 0.5}" rx="4" fill="${bodyDark}"/>
        <rect x="${cx + bw * 0.28}" y="${cy + bh * 0.45}" width="${bw * 0.16}" height="${bh * 0.5}" rx="4" fill="${bodyDark}"/>`;
    }

    // ---- crest / horns ----
    let crest = '';
    if (horn || tier >= 1) {
      crest = `<path d="M${cx - bw * 0.16} ${cy - bh * 0.78} l ${bw * 0.16} ${-bh * 0.42} l ${bw * 0.16} ${bh * 0.42} z" fill="${accent}"/>`;
    }
    if (tier >= 2) {
      crest += `
        <path d="M${cx - bw * 0.48} ${cy - bh * 0.62} l ${bw * 0.12} ${-bh * 0.32} l ${bw * 0.11} ${bh * 0.32} z" fill="${accent}"/>
        <path d="M${cx + bw * 0.34} ${cy - bh * 0.62} l ${bw * 0.12} ${-bh * 0.32} l ${bw * 0.11} ${bh * 0.32} z" fill="${accent}"/>`;
    }
    if (traits.includes('twin_tailed')) {
      crest += `<path d="M${cx - bw} ${cy + bh * 0.2} q ${-bw * 0.6} ${-bh * 0.2} ${-bw * 0.5} ${-bh * 0.8} q ${bw * 0.3} ${bh * 0.3} ${bw * 0.5} ${bh * 0.6} z" fill="url(#body${uid})"/>`;
    }

    // ---- body ----
    const body = `
      <ellipse cx="${cx}" cy="${cy}" rx="${bw}" ry="${bh}" fill="url(#body${uid})"/>
      <ellipse cx="${cx}" cy="${cy + bh * 0.36}" rx="${bw * 0.66}" ry="${bh * 0.42}" fill="url(#belly${uid})" opacity="0.85"/>`;

    // ---- pattern overlay ----
    let overlay = '';
    if (pattern === 'spots') {
      overlay = `
        <circle cx="${cx - bw * 0.4}" cy="${cy - bh * 0.15}" r="${bw * 0.15}" fill="${bodyDark}" opacity="0.42"/>
        <circle cx="${cx + bw * 0.32}" cy="${cy + bh * 0.05}" r="${bw * 0.12}" fill="${bodyDark}" opacity="0.42"/>
        <circle cx="${cx + bw * 0.05}" cy="${cy - bh * 0.38}" r="${bw * 0.09}" fill="${bodyDark}" opacity="0.42"/>`;
    } else if (pattern === 'stripes') {
      for (let i = -1; i <= 1; i++) {
        overlay += `<path d="M${cx + i * bw * 0.5} ${cy - bh * 0.62} q ${bw * 0.18} ${bh} 0 ${bh * 1.2}" stroke="${bodyDark}" stroke-width="${bw * 0.13}" fill="none" opacity="0.38"/>`;
      }
    } else if (pattern === 'patches') {
      overlay = `<path d="M${cx - bw * 0.62} ${cy} q ${bw * 0.42} ${-bh * 0.82} ${bw * 0.92} ${-bh * 0.1} q ${bw * 0.2} ${bh * 0.6} ${-bw * 0.32} ${bh * 0.72} z" fill="${bodyDark}" opacity="0.34"/>`;
    }

    // ---- eyes ----
    let eyeEls = '';
    const eyeY = cy - bh * 0.34;
    const spread = bw * 0.52;
    const glow = traits.includes('bioluminescent') ? accent : '#1a1a1a';
    for (let i = 0; i < eyes; i++) {
      const t = eyes === 1 ? 0 : (i / (eyes - 1)) * 2 - 1;
      const ex = cx + t * spread;
      eyeEls += `<circle cx="${ex}" cy="${eyeY}" r="${bw * 0.15}" fill="#fff"/>
                 <circle cx="${ex}" cy="${eyeY + bw * 0.02}" r="${bw * 0.08}" fill="${glow}"/>
                 <circle cx="${ex - bw * 0.04}" cy="${eyeY - bw * 0.04}" r="${bw * 0.03}" fill="#fff"/>`;
    }
    // little smile
    const mouth = `<path d="M${cx - bw * 0.14} ${cy + bh * 0.12} q ${bw * 0.14} ${bh * 0.14} ${bw * 0.28} 0" stroke="${bodyDark}" stroke-width="2" fill="none" stroke-linecap="round"/>`;

    // idle bob: slight per-creature phase from hue so a stable full of them isn't synced
    const delay = (hue % 20) / 10;
    const style = `style="animation-delay:${delay}s"`;

    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" class="creature-svg" ${style}>
      ${defs}${aura}${shadow}
      <g class="cr-bob" ${style}>
        ${wings}${tail}${limbs}${crest}${body}${overlay}${eyeEls}${mouth}
      </g>
    </svg>`;
  };
})();
