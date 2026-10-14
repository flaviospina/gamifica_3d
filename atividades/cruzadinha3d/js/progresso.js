// ============================================================
//  js/progresso.js — Salvar/carregar progresso parcial.
//  Modo demonstração: localStorage (nada vai para o banco).
//  Fase 5 acrescenta o adaptador de servidor (api.php).
// ============================================================
export class ArmazenamentoLocal {
  constructor(chave) { this.chave = 'cruz3d_progresso_' + chave; }
  carregar() {
    try { const v = localStorage.getItem(this.chave); return v ? JSON.parse(v) : null; } catch { return null; }
  }
  salvar(dados) {
    try { localStorage.setItem(this.chave, JSON.stringify(dados)); } catch { /* modo privado */ }
  }
  limpar() { try { localStorage.removeItem(this.chave); } catch { /* ignora */ } }
  /** Resultado final: no modo demo não vai a lugar nenhum. */
  async enviarResultado() { return { ok: true, demo: true }; }
}
