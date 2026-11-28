// ============================================================
//  js/ui.js — Interface em DOM: tela inicial, placar, dado, cartões,
//  perguntas, resultado e menu. Tudo devolve Promises para a partida.
// ============================================================
import { CONFIG, CORES_JOGADORES } from './config.js';
import { $, esperar, prefs, ehToque } from './util.js';

const LETRAS = ['A', 'B', 'C', 'D'];
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Giro do cubo para cada face ficar de frente
const GIROS = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };

export class UI {
  constructor({ controles, audio }) {
    this.controles = controles; this.audio = audio;
    this._abertos = 0; this._voltasDado = 0;
    this.rapido = new URLSearchParams(location.search).has('rapido'); // testes: encurta as esperas
    this._menu();
  }

  _t(ms) { return this.rapido ? Math.min(ms, 60) : ms; }
  _abrir(el) { el.hidden = false; this._abertos++; this.controles.bloqueado = true; this.controles.soltar(); }
  _fechar(el) { if (el.hidden) return; el.hidden = true; this._abertos = Math.max(0, this._abertos - 1); this.controles.bloqueado = this._abertos > 0; }

  // ── Tela inicial ────────────────────────────────────────────
  telaInicio(dados) {
    const tela = $('telaInicio'), vagas = $('vagas');
    $('inicioSub').textContent = `${dados.titulo || 'Partida'} · ${dados.disciplina || ''} ${dados.ano ? '· ' + dados.ano : ''} · ${dados.perguntas.length} perguntas`;
    const salvo = prefs.ler('vagas', null);
    const padrao = [['humano', 'Você'], ['ia', 'Robô Azul'], ['ia', 'Robô Vermelho'], ['vazio', ''], ['vazio', ''], ['vazio', '']];
    vagas.innerHTML = '';
    CORES_JOGADORES.forEach((cor, i) => {
      const [tipo, nome] = salvo?.[i] || padrao[i];
      const div = document.createElement('div'); div.className = 'vaga';
      div.innerHTML = `<span class="cor" style="background:${cor.hex}"></span>
        <input type="text" maxlength="12" aria-label="Nome do jogador ${i + 1}" placeholder="Nome" value="${esc(nome)}">
        <select aria-label="Tipo do jogador ${i + 1}"><option value="humano">Jogador</option><option value="ia">Computador</option><option value="vazio">Vazio</option></select>`;
      const sel = div.querySelector('select'), inp = div.querySelector('input');
      sel.value = tipo;
      const refletir = () => { div.classList.toggle('vazia', sel.value === 'vazio'); inp.disabled = sel.value === 'vazio'; if (sel.value === 'ia' && !inp.value.trim()) inp.value = 'Robô ' + cor.nome; if (sel.value === 'humano' && /^Robô /.test(inp.value)) inp.value = ''; };
      sel.addEventListener('change', refletir); refletir();
      vagas.appendChild(div);
    });
    $('selVoltas').value = String(prefs.ler('voltas', dados.voltas || 1));
    $('selNivel').value = prefs.ler('nivel', 'medio');
    if (dados.voltasFixas) { $('selVoltas').value = String(dados.voltas); $('selVoltas').disabled = true; }
    this._abrir(tela);
    $('carregamento')?.remove();
    return new Promise((resolve) => {
      $('btnComecar').onclick = () => {
        const nivel = $('selNivel').value, lista = [], bruto = [];
        [...vagas.children].forEach((div, i) => {
          const tipo = div.querySelector('select').value, nome = div.querySelector('input').value.trim();
          bruto.push([tipo, nome]);
          if (tipo === 'vazio') return;
          lista.push({ nome: nome || (tipo === 'ia' ? 'Robô ' + CORES_JOGADORES[i].nome : 'Jogador ' + (lista.length + 1)), cor: i, ia: tipo === 'ia', nivel });
        });
        const erro = $('inicioErro');
        if (!lista.length) { erro.textContent = 'Escolha pelo menos um jogador.'; erro.hidden = false; return; }
        if (!lista.some((j) => !j.ia)) { erro.textContent = 'Pelo menos um jogador precisa ser uma pessoa.'; erro.hidden = false; return; }
        prefs.gravar('vagas', bruto); prefs.gravar('voltas', Number($('selVoltas').value)); prefs.gravar('nivel', nivel);
        this.audio.clique();
        this._fechar(tela);
        resolve({ jogadores: lista, voltas: Number($('selVoltas').value), nivel });
      };
    });
  }

  // ── HUD ─────────────────────────────────────────────────────
  mostrarHud(dados, regras, sem3d) {
    for (const id of ['hudInfo', 'hudBotoes', 'placar']) $(id).hidden = false;
    $('minimapaCaixa').hidden = !!sem3d;
    $('hudTitulo').textContent = dados.titulo || 'Cidade do Saber';
    $('hudSub').textContent = `${dados.disciplina || ''} ${dados.ano ? '· ' + dados.ano : ''}`;
    document.body.classList.toggle('toque', prefs.ler('toque', ehToque()));
    this.placar(regras);
  }

  placar(regras) {
    const ol = $('placar'), ultimos = regras.ultimos();
    ol.innerHTML = regras.jogadores.map((j) => {
      const cor = CORES_JOGADORES[j.cor % CORES_JOGADORES.length].hex;
      const onde = j.terminou ? `chegou em ${j.ordem}º` : `casa ${regras.casaDe(j.pos)}${regras.voltas > 1 ? ' · volta ' + regras.voltaDe(j.pos) : ''}${ultimos.includes(j.id) ? ' · 🍃+1' : ''}`;
      return `<li class="${j.id === regras.vez && !regras.encerrada ? 'vez' : ''} ${j.terminou ? 'chegou' : ''}"><span class="cor" style="background:${cor}">${esc((j.nome[0] || '?').toUpperCase())}</span><span class="nome">${esc(j.nome)}${j.ia ? ' 🤖' : ''}<small>${onde}</small></span><span class="num">${j.pontos} pts<small>⭐ ${j.estrelas} · 🏅 ${j.selos.size} · 🏠 ${j.obras.length}</small></span></li>`;
    }).join('');
    $('hudRodada').textContent = `Rodada ${regras.rodada}${regras.voltas > 1 ? ' · ' + regras.voltas + ' voltas' : ''}`;
  }

  vez(j, texto) {
    const el = $('faixaVez');
    if (!j) { el.hidden = true; return; }
    el.innerHTML = `<span class="bola" style="background:${CORES_JOGADORES[j.cor % CORES_JOGADORES.length].hex}"></span><span>${esc(texto)}</span>`;
    el.hidden = false;
  }

  guia(html) { const el = $('guiaAndar'); if (!html) { el.hidden = true; return; } el.innerHTML = html; el.hidden = false; }
  toque(mostrar) { $('controlesToque').hidden = !mostrar; }

  aviso(texto, ms = 2400) {
    const el = $('aviso');
    el.textContent = texto; el.hidden = false; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    clearTimeout(this._tAviso); this._tAviso = setTimeout(() => { el.hidden = true; }, ms);
  }

  // ── Dado ────────────────────────────────────────────────────
  /** Espera o jogador pedir o dado (clique, Espaço ou Enter). O computador joga sozinho. */
  async esperarDado(j) {
    const area = $('areaDado'), btn = $('btnDado');
    area.hidden = false; btn.hidden = j.ia; btn.disabled = false;
    if (j.ia) { await esperar(this._t(CONFIG.ia.atrasoMs)); return; }
    btn.focus({ preventScroll: true });
    await new Promise((resolve) => {
      const ir = () => { btn.onclick = null; this.controles.aoAcao = null; resolve(); };
      btn.onclick = ir; this.controles.aoAcao = ir;
    });
    btn.disabled = true;
  }

  async animarDado({ dado, bonus }) {
    const el = $('dado'), [rx, ry] = GIROS[dado];
    this._voltasDado += 2;
    this.audio.dado();
    el.style.transform = `rotateX(${rx + 360 * this._voltasDado}deg) rotateY(${ry + 360 * this._voltasDado}deg)`;
    await esperar(this._t(1050));
    this.audio.dadoFim(dado);
    if (bonus) this.aviso(`🍃 Vento a favor: ${dado} + ${bonus} = ${dado + bonus} casas`, 2200);
    await esperar(this._t(450));
    $('areaDado').hidden = true;
  }

  // ── Cartão genérico ─────────────────────────────────────────
  /**
   * @param {{icone?:string, etiqueta?:string, titulo:string, texto?:string, extra?:string, botoes?:Array<{rotulo:string, valor?:any, tipo?:string}>, auto?:number, falar?:string}} o
   * @returns {Promise<any>} valor do botão escolhido (ou o do primeiro, no modo automático)
   */
  cartao({ icone = '', etiqueta = '', titulo, texto = '', extra = '', botoes = [{ rotulo: 'Continuar', valor: true }], auto = 0, falar = '' }) {
    const tela = $('cartao');
    $('cartaoIcone').textContent = icone;
    $('cartaoEtiqueta').textContent = etiqueta; $('cartaoEtiqueta').hidden = !etiqueta;
    $('cartaoTitulo').textContent = titulo;
    $('cartaoTexto').textContent = texto;
    $('cartaoExtra').innerHTML = extra;
    const caixa = $('cartaoBotoes'); caixa.innerHTML = '';
    this._abrir(tela);
    return new Promise((resolve) => {
      let feito = false, timer = 0;
      const fim = (v) => { if (feito) return; feito = true; clearTimeout(timer); speechSynthesis?.cancel?.(); this._fechar(tela); resolve(v); };
      if (falar) { const b = document.createElement('button'); b.className = 'botao secundario'; b.type = 'button'; b.textContent = '🔊 Ouvir'; b.onclick = () => this.falar(falar); caixa.appendChild(b); }
      botoes.forEach((bt, i) => {
        const b = document.createElement('button'); b.type = 'button';
        b.className = 'botao ' + (bt.tipo || (i === botoes.length - 1 ? 'dourado' : 'secundario'));
        b.textContent = bt.rotulo; b.onclick = () => { this.audio.clique(); fim(bt.valor ?? true); };
        caixa.appendChild(b);
        if (i === botoes.length - 1 && !auto) setTimeout(() => b.focus({ preventScroll: true }), 30);
      });
      if (auto) timer = setTimeout(() => fim(botoes[botoes.length - 1].valor ?? true), this._t(auto));
    });
  }

  // ── Pergunta ────────────────────────────────────────────────
  /**
   * Mostra a pergunta e devolve a alternativa escolhida (−1 = tempo esgotado).
   * `altIA` definido = o computador responde sozinho depois de um instante.
   */
  pergunta(q, { titulo, tempo = CONFIG.tempoPergunta, altIA = null }) {
    const tela = $('pergunta'), caixa = $('perguntaOpcoes'), barra = $('perguntaTempo');
    $('perguntaTipo').textContent = titulo;
    $('perguntaTexto').textContent = q.p;
    $('perguntaRetorno').hidden = true; $('btnPerguntaOk').hidden = true;
    $('btnOuvir').onclick = () => this.falar(`${q.p}. ${q.a.map((a, i) => `${LETRAS[i]}: ${a}`).join('. ')}`);
    caixa.innerHTML = '';
    this._abrir(tela);
    return new Promise((resolve) => {
      let feito = false, raf = 0; const t0 = performance.now();
      const fim = (alt) => { if (feito) return; feito = true; cancelAnimationFrame(raf); window.removeEventListener('keydown', tecla); [...caixa.children].forEach((b) => { b.disabled = true; }); this._alt = alt; resolve(alt); };
      const tecla = (ev) => { if (altIA !== null) return; const k = ev.key.toUpperCase(); let i = LETRAS.indexOf(k); if (i < 0 && /^[1-4]$/.test(k)) i = Number(k) - 1; if (i >= 0 && i < q.a.length) { ev.preventDefault(); fim(i); } };
      q.a.forEach((alt, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'opcao-btn';
        b.innerHTML = `<b>${LETRAS[i]}</b><span>${esc(alt)}</span>`;
        if (altIA === null) b.onclick = () => { this.audio.clique(); fim(i); }; else b.disabled = true;
        caixa.appendChild(b);
      });
      window.addEventListener('keydown', tecla);
      if (altIA !== null) { barra.style.transform = 'scaleX(1)'; setTimeout(() => fim(altIA), this._t(1500)); return; }
      const dur = (this.rapido ? 600 : tempo) * 1000;
      const passo = () => { const k = 1 - (performance.now() - t0) / dur; barra.style.transform = `scaleX(${Math.max(0, k)})`; if (k <= 0) fim(-1); else raf = requestAnimationFrame(passo); };
      passo();
    });
  }

  /** Mostra a resposta certa, a explicação e o que o jogador ganhou. */
  retornoPergunta(q, alt, mensagem, { auto = 0 } = {}) {
    const caixa = $('perguntaOpcoes'), ret = $('perguntaRetorno'), ok = $('btnPerguntaOk'), tela = $('pergunta');
    [...caixa.children].forEach((b, i) => { b.disabled = true; if (i === q.c) b.classList.add('certa'); if (i === alt) b.classList.add('escolhida'); });
    ret.innerHTML = mensagem; ret.hidden = false;
    return new Promise((resolve) => {
      let feito = false, timer = 0;
      const fim = () => { if (feito) return; feito = true; clearTimeout(timer); speechSynthesis?.cancel?.(); this._fechar(tela); resolve(); };
      if (auto) { ok.hidden = true; timer = setTimeout(fim, this._t(auto)); }
      else { ok.hidden = false; ok.onclick = () => { this.audio.clique(); fim(); }; setTimeout(() => ok.focus({ preventScroll: true }), 30); }
    });
  }
  fecharPergunta() { this._fechar($('pergunta')); }

  falar(texto) {
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(texto); u.lang = 'pt-BR'; u.rate = 0.95; speechSynthesis.speak(u); } catch { /* sem voz */ }
  }

  // ── Resultado ───────────────────────────────────────────────
  resultado(lista, modo) {
    const tela = $('resultado');
    const medalha = ['🥇', '🥈', '🥉'];
    $('resTabela').querySelector('tbody').innerHTML = lista.map((r) => `<tr>
      <td>${r.ordem ? (medalha[r.ordem - 1] || r.ordem + 'º') : '—'}</td>
      <td><span class="cor" style="background:${CORES_JOGADORES[r.cor % CORES_JOGADORES.length].hex}"></span>${esc(r.nome)}${r.ia ? ' 🤖' : ''}</td>
      <td><b>${r.pontos}</b></td><td>${r.estrelas}</td><td>${r.selos}</td><td>${r.obras}</td><td>${r.acertos}/${r.acertos + r.erros}</td>
      <td>${r.ia ? '—' : `<b>${r.xp.total}</b> <small>(${r.xp.participacao}+${r.xp.acertos})</small>`}</td></tr>`).join('');
    $('resDemo').hidden = modo !== 'demo';
    this._abrir(tela);
    return new Promise((resolve) => {
      $('btnDeNovo').onclick = () => { this._fechar(tela); resolve('denovo'); };
      $('btnVerCidade').onclick = () => { this._fechar(tela); resolve('ver'); };
    });
  }

  // ── Menu e ajuda ────────────────────────────────────────────
  _menu() {
    const menu = $('menu'), ajuda = $('ajuda');
    const abrirMenu = () => { if (!$('telaInicio').hidden) return; if (menu.hidden) this._abrir(menu); else this._fechar(menu); };
    $('btnMenu').onclick = abrirMenu; this.controles.aoMenu = abrirMenu;
    $('btnFecharMenu').onclick = () => this._fechar(menu);
    const abrirAjuda = () => this._abrir(ajuda);
    $('btnComoJogar1').onclick = abrirAjuda; $('btnComoJogar2').onclick = abrirAjuda;
    $('btnFecharAjuda').onclick = () => this._fechar(ajuda);
    $('btnReiniciar').onclick = () => { if (confirm('Começar uma nova partida? A partida atual será encerrada.')) location.reload(); };
    const som = () => { $('btnSom').textContent = this.audio.ligado ? '🔊' : '🔇'; $('chkSom').checked = this.audio.ligado; };
    som();
    $('btnSom').onclick = () => { this.audio.ligar(!this.audio.ligado); som(); this.audio.clique(); };
    $('chkSom').onchange = (e) => { this.audio.ligar(e.target.checked); som(); };
    $('chkPiloto').checked = prefs.ler('piloto', false);
    $('chkPiloto').onchange = (e) => { prefs.gravar('piloto', e.target.checked); this.aoPiloto?.(e.target.checked); };
    const grande = prefs.ler('textoGrande', false); document.body.classList.toggle('texto-grande', grande); $('chkTexto').checked = grande;
    $('chkTexto').onchange = (e) => { document.body.classList.toggle('texto-grande', e.target.checked); prefs.gravar('textoGrande', e.target.checked); };
    $('chkToque').checked = prefs.ler('toque', ehToque());
    $('chkToque').onchange = (e) => { document.body.classList.toggle('toque', e.target.checked); prefs.gravar('toque', e.target.checked); };
    $('selQualidade').value = prefs.ler('qualidade', 'media');
    $('selQualidade').onchange = (e) => { prefs.gravar('qualidade', e.target.value); if (confirm('A qualidade muda ao recarregar a página. Recarregar agora? A partida atual será encerrada.')) location.reload(); };
  }
}
