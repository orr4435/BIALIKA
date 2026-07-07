/* Color skins. Hues are drawn from a CVD-validated palette; each skin keeps
   text/grid chrome identical and swaps accent, categorical order and the
   sequential ramp. Diverging (change) colors stay blue↔red in every skin. */

export const SKINS = {
  ocean: {
    label: 'אוקיינוס',
    light: { accent: '#2a78d6', accentSoft: 'rgba(42,120,214,.10)', series2: '#1baf7a', hero: 'linear-gradient(135deg,#1c5cab,#2a78d6 55%,#1baf7a)' },
    dark:  { accent: '#3987e5', accentSoft: 'rgba(57,135,229,.16)', series2: '#199e70', hero: 'linear-gradient(135deg,#0d366b,#1c5cab 55%,#0b5c40)' },
    seq: {
      light: ['#dbe9fb', '#86b6ef', '#2a78d6', '#0d366b'],
      dark:  ['#233246', '#2a5794', '#5598e7', '#b7d3f6'],
    },
    cat: {
      light: ['#2a78d6', '#1baf7a', '#eda100', '#4a3aa7', '#e34948', '#e87ba4', '#eb6834', '#008300'],
      dark:  ['#3987e5', '#199e70', '#c98500', '#9085e9', '#e66767', '#d55181', '#d95926', '#008300'],
    },
  },
  midbar: {
    label: 'ים תיכוני',
    light: { accent: '#0f9d8c', accentSoft: 'rgba(15,157,140,.12)', series2: '#eb6834', hero: 'linear-gradient(135deg,#0b6e62,#0f9d8c 55%,#eda100)' },
    dark:  { accent: '#2fbcab', accentSoft: 'rgba(47,188,171,.16)', series2: '#d95926', hero: 'linear-gradient(135deg,#083f38,#0b6e62 55%,#8a5b00)' },
    seq: {
      light: ['#d7f1ed', '#7ed0c5', '#0f9d8c', '#07463f'],
      dark:  ['#1e3835', '#136f63', '#2fbcab', '#a8e6dd'],
    },
    cat: {
      light: ['#0f9d8c', '#eb6834', '#2a78d6', '#eda100', '#4a3aa7', '#e87ba4', '#e34948', '#008300'],
      dark:  ['#2fbcab', '#d95926', '#3987e5', '#c98500', '#9085e9', '#d55181', '#e66767', '#008300'],
    },
  },
  sunset: {
    label: 'שקיעה',
    light: { accent: '#e05d2b', accentSoft: 'rgba(224,93,43,.12)', series2: '#4a3aa7', hero: 'linear-gradient(135deg,#8a2f5c,#e05d2b 60%,#eda100)' },
    dark:  { accent: '#ef7f4f', accentSoft: 'rgba(239,127,79,.16)', series2: '#9085e9', hero: 'linear-gradient(135deg,#4d1a34,#8a3413 60%,#8a5b00)' },
    seq: {
      light: ['#fbe4d6', '#f3a678', '#e05d2b', '#6e2a0f'],
      dark:  ['#40281d', '#98411c', '#ef7f4f', '#f8c6a8'],
    },
    cat: {
      light: ['#e05d2b', '#4a3aa7', '#0f9d8c', '#eda100', '#2a78d6', '#e87ba4', '#e34948', '#008300'],
      dark:  ['#ef7f4f', '#9085e9', '#2fbcab', '#c98500', '#3987e5', '#d55181', '#e66767', '#008300'],
    },
  },
  royal: {
    label: 'סגול מלכותי',
    light: { accent: '#5b47c2', accentSoft: 'rgba(91,71,194,.12)', series2: '#d5568e', hero: 'linear-gradient(135deg,#33268a,#5b47c2 55%,#d5568e)' },
    dark:  { accent: '#9085e9', accentSoft: 'rgba(144,133,233,.16)', series2: '#d55181', hero: 'linear-gradient(135deg,#241a63,#33268a 55%,#7c2a4e)' },
    seq: {
      light: ['#e6e1fa', '#a99cec', '#5b47c2', '#241a63'],
      dark:  ['#2b2745', '#453694', '#8477e0', '#cfc8f7'],
    },
    cat: {
      light: ['#5b47c2', '#d5568e', '#0f9d8c', '#eda100', '#2a78d6', '#eb6834', '#e34948', '#008300'],
      dark:  ['#9085e9', '#d55181', '#2fbcab', '#c98500', '#3987e5', '#d95926', '#e66767', '#008300'],
    },
  },
};

let current = localStorage.getItem('kb-skin') || 'ocean';
if (!SKINS[current]) current = 'ocean';

export function getSkinId() { return current; }
export function getSkin() { return SKINS[current]; }

export function applySkin(id) {
  if (!SKINS[id]) id = 'ocean';
  current = id;
  localStorage.setItem('kb-skin', id);
  const s = SKINS[id];
  const root = document.documentElement;
  root.setAttribute('data-skin', id);
  ['light', 'dark'].forEach(mode => {
    // custom props per mode are handled in CSS via [data-skin]; here we set the
    // few JS-consumed ones on the root for the active computed mode.
  });
  root.style.setProperty('--skin-accent-light', s.light.accent);
  root.style.setProperty('--skin-accent-soft-light', s.light.accentSoft);
  root.style.setProperty('--skin-series2-light', s.light.series2);
  root.style.setProperty('--skin-hero-light', s.light.hero);
  root.style.setProperty('--skin-accent-dark', s.dark.accent);
  root.style.setProperty('--skin-accent-soft-dark', s.dark.accentSoft);
  root.style.setProperty('--skin-series2-dark', s.dark.series2);
  root.style.setProperty('--skin-hero-dark', s.dark.hero);
}

export function applyMode(mode) { // 'auto' | 'light' | 'dark'
  const root = document.documentElement;
  if (mode === 'auto') root.removeAttribute('data-mode');
  else root.setAttribute('data-mode', mode);
  localStorage.setItem('kb-mode', mode);
}
export function getMode() { return localStorage.getItem('kb-mode') || 'auto'; }
