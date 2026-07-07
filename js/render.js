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
    if (EVO.DEV && EVO.DEV.pixelArt) return EVO.creatureSVGPixel(c, size);
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

    // Colour morph (sheen gene): 0 normal, 1 iridescent, 2 albino, 3 melanic.
    const sheen = g.sheen ? g.sheen[0] : 0;
    let sat = 62, light = [66, 54, 38], bellyL = 78, hue2 = hue;
    if (sheen === 1) { hue2 = (hue + 95) % 360; }              // iridescent: two-tone
    if (sheen === 2) { sat = 12; light = [88, 78, 62]; bellyL = 92; } // albino
    if (sheen === 3) { sat = 45; light = [34, 26, 16]; bellyL = 38; } // melanic

    // Palette derived from hue with light/dark shading.
    const bodyLight = `hsl(${hue}, ${sat + 6}%, ${light[0]}%)`;
    const bodyMid = `hsl(${hue2}, ${sat}%, ${light[1]}%)`;
    const bodyDark = `hsl(${hue2}, ${sat - 4}%, ${light[2]}%)`;
    const belly = `hsl(${hue}, ${Math.max(8, sat - 7)}%, ${bellyL}%)`;
    const accent = sheen === 2 ? 'hsl(345, 55%, 78%)' : `hsl(${(hue + 42) % 360}, 72%, ${sheen === 3 ? 42 : 60}%)`;
    const accentDark = `hsl(${(hue + 42) % 360}, 65%, ${sheen === 3 ? 30 : 44}%)`;
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

    // Back ridge / spines (spikes gene): a row of small accent triangles.
    const spikeLvl = g.spikes ? g.spikes[0] : 0;
    let spikes = '';
    if (spikeLvl > 0) {
      const n = spikeLvl === 1 ? 3 : 5;
      const h = spikeLvl === 1 ? bh * 0.22 : bh * 0.34;
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1)) * 1.3 - 0.65; // -0.65..0.65 across the back
        const sx = cx + t * bw * 0.8;
        // Follow the ellipse contour so spikes sit on the back.
        const sy = cy - bh * Math.sqrt(Math.max(0, 1 - (t * 0.8) * (t * 0.8))) * 0.94;
        spikes += `<path d="M${sx - bw * 0.07} ${sy} l ${bw * 0.07} ${-h} l ${bw * 0.07} ${h} z" fill="${accentDark}"/>`;
      }
    }

    // Trait art: swiftborn = motion streaks; ironhide = armour plates.
    let traitArt = '';
    if (traits.includes('swiftborn')) {
      for (let i = 0; i < 3; i++) {
        const sy = cy - bh * 0.3 + i * bh * 0.3;
        traitArt += `<line x1="${cx - bw * 1.75}" y1="${sy}" x2="${cx - bw * 1.05}" y2="${sy}" stroke="${accent}" stroke-width="${2.4 * scale}" stroke-linecap="round" opacity="${0.55 - i * 0.12}"/>`;
      }
    }
    let armour = '';
    if (traits.includes('ironhide')) {
      armour = `
        <path d="M${cx - bw * 0.55} ${cy - bh * 0.42} q ${bw * 0.55} ${-bh * 0.34} ${bw * 1.1} 0" stroke="#9aa3ad" stroke-width="${bw * 0.11}" fill="none" opacity="0.85" stroke-linecap="round"/>
        <path d="M${cx - bw * 0.68} ${cy - bh * 0.1} q ${bw * 0.68} ${-bh * 0.36} ${bw * 1.36} 0" stroke="#87919c" stroke-width="${bw * 0.11}" fill="none" opacity="0.8" stroke-linecap="round"/>`;
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
        ${traitArt}${wings}${tail}${limbs}${spikes}${crest}${body}${overlay}${armour}${eyeEls}${mouth}
      </g>
    </svg>`;
  };

  // ---- Pixel-art renderer (Dev Tweaks experiment) --------------------------
  // Same genome in, retro 16×16 sprite out. Paints a colour grid cell by cell
  // (body silhouette, belly, pattern, outline) then stamps features on top,
  // and emits one <rect> per pixel with crisp edges.
  const PX = 16;

  EVO.creatureSVGPixel = function (c, size) {
    size = size || 120;
    const g = c.genome;
    const hue = g.hue[0];
    const pattern = EVO.PATTERNS[g.pattern[0]] || 'solid';
    const bodySize = EVO.express(g, 'bodySize');
    const limb = EVO.LIMBS[g.limb[0]] || 'legs';
    const eyes = Math.max(2, Math.min(4, Math.round((g.eyes[0] + g.eyes[1]) / 2)));
    const horn = g.horn[0];
    const spikeLvl = g.spikes ? g.spikes[0] : 0;
    const sheen = g.sheen ? g.sheen[0] : 0;
    const sp = EVO.SPECIES[c.species] || EVO.SPECIES.grubling;
    const tier = sp.tier || 0;
    const traits = c.traits || [];

    // Quantized palette (mirrors the vector renderer's morph rules).
    let sat = 62, li = [64, 52, 34], bellyL = 80;
    let hue2 = sheen === 1 ? (hue + 95) % 360 : hue;
    if (sheen === 2) { sat = 12; li = [88, 76, 55]; bellyL = 93; } // albino
    if (sheen === 3) { sat = 45; li = [32, 24, 14]; bellyL = 36; } // melanic
    const C = {
      B: `hsl(${hue}, ${sat}%, ${li[0]}%)`,       // body light
      M: `hsl(${hue2}, ${sat}%, ${li[1]}%)`,      // body mid (pattern)
      D: `hsl(${hue2}, ${Math.max(8, sat - 6)}%, ${li[2]}%)`, // dark / outline
      Y: `hsl(${hue}, ${Math.max(8, sat - 10)}%, ${bellyL}%)`, // belly
      A: sheen === 2 ? 'hsl(345, 55%, 78%)' : `hsl(${(hue + 42) % 360}, 72%, ${sheen === 3 ? 42 : 58}%)`, // accent
      W: '#ffffff', K: '#14141c', I: '#9aa3ad',   // white, ink, iron
      G: sp.biome ? EVO.BIOMES[sp.biome].color : `hsl(${(hue + 42) % 360}, 72%, 65%)`, // glow/biome
    };

    // Deterministic per-genome dither so patterns don't shimmer on re-render.
    const rnd = (x, y, salt) => ((x * 73856093) ^ (y * 19349663) ^ ((hue + salt) * 83492791)) >>> 0;

    // Paint the grid.
    const grid = Array.from({ length: PX }, () => Array(PX).fill(null));
    const cx = 7.5, cy = 8.2;
    const rx = 3.9 + (bodySize / 100) * 2.4; // 3.9..6.3
    const ry = 3.2 + (bodySize / 100) * 1.9; // 3.2..5.1
    const inBody = (x, y) => {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      return dx * dx + dy * dy <= 1;
    };
    for (let y = 0; y < PX; y++) {
      for (let x = 0; x < PX; x++) {
        if (!inBody(x, y)) continue;
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        let col = C.B;
        if (dy > 0.18 && dx * dx + dy * dy * 1.7 <= 0.86) col = C.Y; // belly
        if (pattern === 'spots' && col === C.B && rnd(x, y, 1) % 9 === 0) col = C.M;
        if (pattern === 'stripes' && col === C.B && x % 3 === 1) col = C.M;
        if (pattern === 'patches' && col === C.B && x < cx && y < cy && rnd(x >> 1, y >> 1, 2) % 3 === 0) col = C.M;
        grid[y][x] = col;
      }
    }
    // Outline: empty cells 4-adjacent to the body. Collect first, then paint —
    // painting in-place while scanning would dilate the outline into a flood.
    const outline = [];
    for (let y = 0; y < PX; y++) {
      for (let x = 0; x < PX; x++) {
        if (grid[y][x]) continue;
        const near = (y > 0 && grid[y - 1][x]) || (y < PX - 1 && grid[y + 1][x]) ||
                     (x > 0 && grid[y][x - 1]) || (x < PX - 1 && grid[y][x + 1]);
        if (near) outline.push([x, y]);
      }
    }
    outline.forEach(([x, y]) => { grid[y][x] = C.D; });

    const put = (x, y, col) => {
      x = Math.round(x); y = Math.round(y);
      if (x >= 0 && x < PX && y >= 0 && y < PX) grid[y][x] = col;
    };
    const topY = Math.max(0, Math.round(cy - ry) - 1);
    const botY = Math.min(PX - 1, Math.round(cy + ry));
    const leftX = Math.round(cx - rx), rightX = Math.round(cx + rx);

    // Eyes: white cell with ink cell beneath (bioluminescent pupils glow).
    const pupil = traits.includes('bioluminescent') ? C.G : C.K;
    const eyeY = Math.round(cy - ry * 0.35);
    const exs = eyes === 2 ? [cx - 1.6, cx + 1.6] : eyes === 3 ? [cx - 2.1, cx, cx + 2.1] : [cx - 2.6, cx - 0.9, cx + 0.9, cx + 2.6];
    exs.forEach((ex) => { put(ex, eyeY, C.W); put(ex, eyeY + 1, pupil); });
    put(cx, eyeY + 2.6, C.D); // mouth

    // Crest / horns.
    if (horn || tier >= 1) { put(cx, topY, C.A); put(cx, topY - 1, C.A); }
    if (tier >= 2) { put(cx - 2, topY, C.A); put(cx + 2, topY, C.A); }

    // Back spines.
    if (spikeLvl > 0) {
      const n = spikeLvl === 1 ? 2 : 4;
      for (let i = 0; i < n; i++) {
        const sx = cx - rx * 0.6 + (i + 0.5) * (rx * 1.2 / n);
        const sy = cy - ry * Math.sqrt(Math.max(0, 1 - Math.pow((sx - cx) / rx, 2)));
        put(sx, sy - 1, C.A);
      }
    }

    // Limbs.
    if (limb === 'fins') {
      put(leftX - 1, cy, C.A); put(leftX - 1, cy + 1, C.A);
      put(rightX + 1, cy, C.A); put(rightX + 1, cy + 1, C.A);
    } else if (limb === 'talons') {
      put(cx - 2, botY + 1, C.D); put(cx + 2, botY + 1, C.D);
      put(cx - 3, botY + 1, C.A); put(cx + 3, botY + 1, C.A);
    } else if (limb === 'paws') {
      put(cx - 2, botY + 1, C.D); put(cx - 1, botY + 1, C.D);
      put(cx + 1, botY + 1, C.D); put(cx + 2, botY + 1, C.D);
    } else { // legs
      put(cx - 2, botY + 1, C.D); put(cx - 2, botY + 2, C.D);
      put(cx + 2, botY + 1, C.D); put(cx + 2, botY + 2, C.D);
    }

    // Tail (tier 1+), twin tail trait mirrors it.
    if (tier >= 1) { put(rightX + 1, cy - 1, C.B); put(rightX + 2, cy - 2, C.B); }
    if (traits.includes('twin_tailed')) { put(leftX - 1, cy - 1, C.B); put(leftX - 2, cy - 2, C.B); }

    // Wings (tier 2).
    if (tier >= 2) {
      put(leftX - 1, cy - 2, C.A); put(leftX - 2, cy - 3, C.A);
      put(rightX + 1, cy - 2, C.A); put(rightX + 2, cy - 3, C.A);
    }

    // Trait pixels: iron plates band, swift streaks.
    if (traits.includes('ironhide')) {
      const py = Math.round(cy - ry * 0.45);
      for (let x = Math.round(cx - rx * 0.5); x <= Math.round(cx + rx * 0.5); x += 2) put(x, py, C.I);
    }
    if (traits.includes('swiftborn')) {
      put(0, cy - 1, C.A); put(1, cy + 1, C.A); put(0, cy + 2.6, C.A);
    }

    // Emit rects (merge horizontal runs of the same colour to keep it light).
    let rects = '';
    for (let y = 0; y < PX; y++) {
      let x = 0;
      while (x < PX) {
        const col = grid[y][x];
        if (!col) { x++; continue; }
        let w = 1;
        while (x + w < PX && grid[y][x + w] === col) w++;
        rects += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${col}"/>`;
        x += w;
      }
    }

    const delay = (hue % 20) / 10;
    return `<svg viewBox="0 0 ${PX} ${PX}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" class="creature-svg pixel" shape-rendering="crispEdges" style="animation-delay:${delay}s">
      <g class="cr-bob" style="animation-delay:${delay}s">${rects}</g>
    </svg>`;
  };
})();
