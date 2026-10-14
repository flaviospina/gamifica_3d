// ============================================================
//  js/carregamento.js — Tela de carregamento com barra de progresso
//  (os elementos já existem no HTML; aqui só atualizamos)
// ============================================================
const barra = () => document.getElementById('carregamentoBarra');
const texto = () => document.getElementById('carregamentoTexto');
const tela  = () => document.getElementById('carregamento');

export const carregamento = {
  progresso(pct, msg) {
    const b = barra();
    if (b) { b.style.width = pct + '%'; b.setAttribute('aria-valuenow', String(pct)); }
    if (msg && texto()) texto().textContent = msg;
  },
  concluir() {
    this.progresso(100, 'Tudo pronto!');
    const t = tela();
    if (!t) return;
    t.classList.add('saindo');
    setTimeout(() => t.remove(), 450);
  },
  erro(msg) {
    const t = tela();
    if (!t) return;
    t.classList.add('erro');
    if (texto()) texto().textContent = msg;
    const b = barra();
    if (b) b.style.width = '100%';
  },
};
