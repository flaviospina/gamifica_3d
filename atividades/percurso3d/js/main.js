// ============================================================
//  js/main.js — Inicialização da Cidade do Saber
// ============================================================
import { QUALIDADE } from './config.js';
import { $, prefs, hashTexto, ehToque } from './util.js';
import { Pista } from './pista.js';
import { Regras } from './regras.js';
import { Visao3D } from './visao3d.js';
import { Visao2D } from './visao2d.js';
import { Controles } from './controles.js';
import { Audio } from './audio.js';
import { UI } from './ui.js';
import { Partida } from './partida.js';

const progresso = (pct, texto) => { const b = $('carregamentoBarra'); if (b) b.style.width = pct + '%'; const t = $('carregamentoTexto'); if (t && texto) t.textContent = texto; };
const respirar = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

function escolherQualidade() {
  const p = new URLSearchParams(location.search).get('qualidade');
  if (p && QUALIDADE[p]) return p;
  const salva = prefs.ler('qualidade', null);
  if (salva && QUALIDADE[salva]) return salva;
  let nivel = 'media';
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    const nome = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)).toLowerCase() : '';
    if (/swiftshader|llvmpipe|software/.test(nome)) nivel = 'baixa';
    else if (/nvidia|radeon|rtx|geforce|apple m\d|apple gpu|arc\b/.test(nome) && !ehToque()) nivel = 'alta';
    else if (ehToque() && (navigator.deviceMemory || 4) <= 3) nivel = 'baixa';
  } catch { /* fica na média */ }
  return nivel;
}

async function obterDados() {
  const el = $('dadosJogo');
  const base = el ? JSON.parse(el.textContent) : { modo: 'demo' };
  if (base.perguntas?.length) return base;
  const banco = (await import('../data/perguntas_demo.js')).default;
  return { ...base, ...banco };
}

(async () => {
  try {
    progresso(30, 'Lendo as perguntas…');
    const dados = await obterDados();
    const controles = new Controles(), audio = new Audio(), ui = new UI({ controles, audio });
    progresso(55, 'Tudo pronto. Escolha os jogadores.');
    const escolha = await ui.telaInicio(dados);

    const pista = new Pista();
    const semente = Number(new URLSearchParams(location.search).get('semente')) || (Date.now() % 2147483647);
    const regras = new Regras({ jogadores: escolha.jogadores, perguntas: dados.perguntas, curiosidades: dados.curiosidades, voltas: escolha.voltas, semente, xp: dados.xp || 100 });
    // Terrenos de obra só no nível do chão: troca com uma casa de pergunta se cair no viaduto
    regras.cartas.forEach((t, k) => { if (t === 'obra' && pista.elevada(k)) { const troca = regras.cartas.findIndex((x, i) => x === 'pergunta' && !pista.elevada(i)); if (troca > 0) { regras.cartas[troca] = 'obra'; regras.cartas[k] = 'pergunta'; } } });
    regras._museus = regras.cartas.map((t, i) => (t === 'museu' ? i : -1)).filter((i) => i >= 0);

    const nivel = escolherQualidade(), q = QUALIDADE[nivel];
    const visoes = [];
    const { gl, diag } = Visao3D.sondar($('cena'), q.antialias);
    let principal = null;
    if (gl) {
      try { principal = new Visao3D($('cena'), gl, pista, q, { cartas: regras.cartas, semente: hashTexto(dados.titulo || 'cidade') }); }
      catch (err) { console.warn('[Cidade] 3D indisponível:', err); diag.motivo = err?.message || diag.motivo; }
    }
    if (principal) {
      visoes.push(principal, new Visao2D($('minimapa'), pista, { cartas: regras.cartas }));
    } else {
      document.body.classList.add('sem-3d');
      $('mapaCheio').hidden = false;
      principal = new Visao2D($('mapaCheio'), pista, { cartas: regras.cartas, rotulos: true, cheia: true });
      visoes.push(principal);
      console.warn('[Cidade] modo 2D:', diag.motivo);
    }
    ui.mostrarHud(dados, regras, principal.tipo === '2d');
    await respirar();
    for (const v of visoes) v.redimensionar?.();
    window.addEventListener('resize', () => { for (const v of visoes) v.redimensionar?.(); });

    const partida = new Partida({ regras, pista, visoes, ui, controles, audio, dados });
    if (principal.tipo === '2d') ui.aviso('Este aparelho está sem 3D: a partida segue no mapa, com as mesmas regras.', 5000);
    window.__cidade = { regras, partida, pista, visoes, ui, controles, nivel };

    let ultimo = performance.now(), pausado = false;
    document.addEventListener('visibilitychange', () => { pausado = document.hidden; ultimo = performance.now(); });
    const rapido = new URLSearchParams(location.search).has('rapido'); // testes: a lógica anda vários passos por quadro
    const quadro = (agora) => {
      const dt = Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora;
      if (!pausado) { if (rapido) for (let i = 0; i < 24; i++) partida.atualizar(0.05, false); partida.atualizar(rapido ? 0.05 : dt); }
      requestAnimationFrame(quadro);
    };
    requestAnimationFrame(quadro);

    const lista = await partida.rodar();
    while (true) {
      const acao = await ui.resultado(lista, dados.modo);
      if (acao === 'denovo') { location.reload(); return; }
      ui.aviso('Arraste para girar a vista. O resultado volta em instantes.', 3500);
      await new Promise((r) => setTimeout(r, 9000));
    }
  } catch (err) {
    console.error(err);
    const c = $('carregamento');
    if (c) { c.classList.add('erro'); $('carregamentoTexto').textContent = 'Não foi possível iniciar o jogo. ' + (err?.message || ''); }
    else alert('Não foi possível continuar o jogo. ' + (err?.message || ''));
  }
})();
