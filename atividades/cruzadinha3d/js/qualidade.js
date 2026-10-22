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
  let dedicada = false;
  try {
    const cv = document.createElement('canvas');
    const gl = cv.getContext('webgl2');
    if (!gl) return 'baixa';
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const nome = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)).toLowerCase() : '';
    if (/swiftshader|llvmpipe|software/.test(nome)) return 'baixa';
    dedicada = /nvidia|radeon|rtx|geforce|apple m\d|apple gpu|arc\b/.test(nome);
    if (dedicada) pontos += 2;
    if (/mali-4|mali-t|adreno [1-4]|powervr|intel hd graphics [2-4]/.test(nome)) pontos -= 1;
  } catch { /* ignora */ }

  // Se a placa de vídeo já reiniciou nos últimos dias, começa mais leve
  const perdas = (prefs.ler('gpuPerdas', []) || []).filter((t) => Date.now() - t < 7 * 86400e3);
  if (perdas.length >= 2) return 'baixa';
  if (perdas.length === 1) pontos -= 2;

  // "Alta" (bloom, sombras 2048, 8 mil tufos) só com GPU dedicada ou Apple;
  // placas integradas sem nome conhecido ficam no máximo em "média".
  if (pontos >= 4 && dedicada) return 'alta';
  if (pontos >= 2) return 'media';
  return 'baixa';
}

export function parametrosQualidade(nivel) {
  return QUALIDADE[nivel] || QUALIDADE.media;
}

export function salvarQualidade(nivel) {
  if (QUALIDADE[nivel]) prefs.gravar('qualidade', nivel);
}
