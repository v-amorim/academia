// 1.5px stroke because the icon sits next to weight-400 text, and currentColor because an SVG is
// only recolored by state, never swapped for another file.
const ICON_CAMERA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2a1.5 1.5 0 0 0 1.2-.6l.9-1.2a1.5 1.5 0 0 1 1.2-.6h4a1.5 1.5 0 0 1 1.2.6l.9 1.2a1.5 1.5 0 0 0 1.2.6h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5Z"/><circle cx="12" cy="13" r="3.5"/></svg>`;
const ICON_GALLERY = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1.5"/><circle cx="8.5" cy="10" r="1.5"/><path d="m21 15-4.5-4.5L8 19"/></svg>`;
const ICON_TRASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7M6 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h7.4a1.5 1.5 0 0 0 1.5-1.4L18 7M10 11v6M14 11v6"/></svg>`;
const ICON_ZOOM = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 4h5v5M9 20H4v-5M20 4l-6 6M4 20l6-6"/></svg>`;

// Stroke 2 because the icon is 13px: at 1.5 the line vanishes next to the weight-700 number. Same
// vocabulary as the camera icon, currentColor and no file per state.
const stroke = (inner) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

const ICON_UP = stroke(`<path d="M3 17 9.5 10.5 14 15 21 8"/><path d="M15 8h6v6"/>`);
const ICON_DOWN = stroke(`<path d="M3 7 9.5 13.5 14 9 21 16"/><path d="M15 16h6v-6"/>`);
const ICON_FLAT = stroke(`<path d="M5 9h14"/><path d="M5 15h14"/>`);

// The edit-mode toolbar, in the thin stroke of the photo icons: up, down, edit, change workout and
// remove. Removing is archiving, so it is a box and not a trash can.
const thin = (inner) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const ICON_MOVE_UP = thin(`<path d="m6 14 6-6 6 6"/>`);
const ICON_MOVE_DOWN = thin(`<path d="m6 10 6 6 6-6"/>`);
const ICON_EDIT = thin(`<path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z"/><path d="m13.5 6.5 4 4"/>`);
const ICON_MOVE = thin(`<path d="M13 5h5.5A1.5 1.5 0 0 1 20 6.5v11a1.5 1.5 0 0 1-1.5 1.5H13"/><path d="M3 12h11"/><path d="m10 8 4 4-4 4"/>`);
const ICON_ARCHIVE = thin(`<path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5V8H3Z"/><path d="M4 8v10.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V8"/><path d="M12 11v6"/><path d="m9 14 3 3 3-3"/>`);

// The attachments, drawn with Vinicius on 2026-09-13 from photos of his gym. Pulley ones hang from
// the same hook, eye and rod, with only a one-line silhouette below. Nylon and rope are dashed;
// an anatomical grip is a filled drop. Free ones have no hook. The exercise's `accessory` field
// holds the key; empty means none.
const PULLEY_HOOK = `<circle cx="24" cy="4.5" r="2.5"/><path d="M24 7v4"/>`;
const DASHED = `stroke-dasharray="2 1.5"`;
const filledDot = (x, y) => `<circle cx="${x}" cy="${y}" r="2.5" fill="currentColor" stroke="none"/>`;
const filledDrop = (x, y, side) => `<ellipse cx="${x}" cy="${y}" rx="1.9" ry="3" transform="rotate(${side * 28} ${x} ${y})" fill="currentColor" stroke="none"/>`;
const magGrip = (half, height, flat, rise) => {
  const x = 24 - half;
  const y = 11 + height;
  return `<path d="M24 11L${x} ${y}h-${flat}v-${rise}M24 11L${48 - x} ${y}h${flat}v-${rise}"/>`
    + filledDrop(x - flat, y - rise - 2, -1) + filledDrop(48 - x + flat, y - rise - 2, 1);
};
const BAR_PLATES = `<rect x="9" y="8" width="5" height="16" rx="1.5"/><rect x="34" y="8" width="5" height="16" rx="1.5"/><path d="M15.5 13v6M32.5 13v6"/>`;
const ACCESSORIES = {
  "short-straight-bar": { name: "Barra reta curta", pulley: true, drawing: `<path d="M14 11h20"/>` },
  "long-straight-bar": { name: "Barra reta longa", pulley: true, drawing: `<path d="M3 11h42"/>` },
  "long-curved-bar": { name: "Barra curva longa", pulley: true, drawing: `<path d="M3 18l7-7h28l7 7"/>` },
  "ez-bar": { name: "Barra W", pulley: true, drawing: `<path d="M3 11l8 6 8-6h10l8 6 8-6"/>` },
  "v-bar": { name: "Barra V", pulley: true, drawing: `<path d="M24 11l-9 12M24 11l9 12"/><path d="M15 23h-6M33 23h6" stroke-width="3"/>` },
  "rope": { name: "Corda", pulley: true, drawing: `<path d="M24 11c-9 3-12 8-12 13M24 11c9 3 12 8 12 13" ${DASHED}/>${filledDot(12, 26.5)}${filledDot(36, 26.5)}` },
  "iron-stirrup": { name: "Estribo de ferro", pulley: true, drawing: `<path d="M13 26v-4a11 11 0 0 1 22 0v4"/><path d="M11 26h26" stroke-width="3"/>` },
  "nylon-stirrup": { name: "Estribo de nylon", pulley: true, drawing: `<path d="M24 11l-10 15M24 11l10 15" ${DASHED}/><path d="M12 26h24" stroke-width="3"/>` },
  "roman-handle": { name: "Puxador romano", pulley: true, drawing: `<path d="M17 11h14"/><rect x="3" y="7.5" width="14" height="7" rx="1"/><rect x="31" y="7.5" width="14" height="7" rx="1"/><path d="M8 7.5v7M12 7.5v7M36 7.5v7M40 7.5v7" stroke-width="1"/>` },
  "triangle": { name: "Triângulo", pulley: true, drawing: `<path d="M24 11l-11 12M24 11l11 12"/>${filledDot(13, 23)}${filledDot(35, 23)}` },
  "mag-close-neutral": { name: "Mag grip fechada neutra", pulley: true, drawing: magGrip(5, 6, 3, 5) },
  "mag-close-pronated": { name: "Mag grip fechada pronada", pulley: true, drawing: magGrip(7, 5, 4, 4) },
  "mag-medium": { name: "Mag grip média", pulley: true, drawing: magGrip(10, 7, 5, 4) },
  "mag-wide": { name: "Mag grip larga", pulley: true, drawing: magGrip(13, 8, 6, 4) },
  "mag-extra-wide": { name: "Mag grip extra larga", pulley: true, drawing: magGrip(16, 9, 6, 4) },
  "ankle-strap": { name: "Tornozeleira", pulley: true, drawing: `<path d="M24 11l-9 11M24 11l9 11" ${DASHED}/><path d="M15 22q9 8 18 0" stroke-width="3"/>` },
  "dumbbell": { name: "Halter", pulley: false, drawing: `<path d="M17 16h14"/><rect x="9" y="10" width="7" height="12" rx="1.5"/><rect x="32" y="10" width="7" height="12" rx="1.5"/><path d="M6 13v6M42 13v6"/>` },
  "free-bar": { name: "Barra livre", pulley: false, drawing: `<path d="M3 16h6M14 16h20M39 16h6"/>${BAR_PLATES}` },
  "free-ez-bar": { name: "Barra W livre", pulley: false, drawing: `<path d="M3 16h6M39 16h6"/><path d="M14 16h3l3.5-4 3.5 4 3.5-4 3.5 4h3"/>${BAR_PLATES}` },
  "kettlebell": { name: "Kettlebell", pulley: false, drawing: `<path d="M18 13a6 6 0 0 1 12 0"/><circle cx="24" cy="20" r="8"/>` },
  "plate": { name: "Anilha", pulley: false, drawing: `<circle cx="24" cy="16" r="11"/><circle cx="24" cy="16" r="3"/>` }
};
const accessorySvg = (key) => {
  const accessory = ACCESSORIES[key];
  if (!accessory) return "";
  return `<svg viewBox="0 0 48 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${accessory.pulley ? PULLEY_HOOK : ""}${accessory.drawing}</svg>`;
};
const accessoryName = (key) => ACCESSORIES[key]?.name ?? "";
