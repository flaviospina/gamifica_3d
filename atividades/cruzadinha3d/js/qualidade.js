// ============================================================
//  js/qualidade.js — Detecção automática e seletor de qualidade
// ============================================================
import { QUALIDADE } from './config.js';
import { prefs, ehToque } from './util.js';

/**
 * Estima a qualidade inicial pelo hardware. O jogador pode trocar depois;
 * a escolha fica no localStorage.
 */
export function detectarQualidade() {
  const salvo = prefs.ler('qualidade', null);
  if (salvo && QUALIDADE[salvo]) return salvo;

  const param = new URLSearchParams(location.search).get('qualidade');
  if (param && QUALIDADE[param]) return param;

  let pontos = 0;
  const nucleos = navigator.hardwareConcurrency || 2;
  const memoria = navigator.deviceMemory || 4;
  pontos += nucleos >= 8 ? 2 : nucleos >= 4 ? 1 : 0;
  pontos += memoria >= 8 ? 2 : memoria >= 4 ? 1 : 0;
  if (ehToque()) pontos -= 1;

  // Nome da GPU (quando o navegador expõe)
  try {
    const cv = document.createElement('canvas');
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    if (!gl) return 'baixa';
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const nome = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)).toLowerCase() : '';
    if (/swiftshader|llvmpipe|software/.test(nome)) return 'baixa';
    if (/nvidia|radeon|rtx|geforce|apple m\d|apple gpu/.test(nome)) pontos += 2;
    if (/mali-4|mali-t|adreno [1-4]|powervr|intel hd graphics [2-4]/.test(nome)) pontos -= 1;
  } catch { /* ignora */ }

  if (pontos >= 4) return 'alta';
  if (pontos >= 2) return 'media';
  return 'baixa';
}

export function parametrosQualidade(nivel) {
  return QUALIDADE[nivel] || QUALIDADE.media;
}

export function salvarQualidade(nivel) {
  if (QUALIDADE[nivel]) prefs.gravar('qualidade', nivel);
}
