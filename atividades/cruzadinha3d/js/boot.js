// ============================================================
//  js/boot.js — Carregador do jogo. Fica fora do HTML para que
//  um bloqueio de segurança (CSP) ou falta de internet apareça
//  como mensagem amigável em vez de uma tela travada.
// ============================================================
const versao = document.currentScript?.src.match(/v=([^&]+)/)?.[1] || new URL(import.meta.url).searchParams.get('v') || '';

function erro(msg) {
  const tela = document.getElementById('carregamento');
  const t = document.getElementById('carregamentoTexto');
  if (tela) tela.classList.add('erro');
  if (t) t.textContent = msg;
}

// Aviso de segurança: se em 25 s nada aconteceu, provavelmente algo foi bloqueado.
const vigia = setTimeout(() => {
  const barra = document.getElementById('carregamentoBarra');
  if (barra && parseFloat(barra.style.width) < 30) {
    erro('O carregamento está demorando mais que o normal. Verifique a conexão com a internet ou recarregue a página.');
  }
}, 25000);

import('./main.js' + (versao ? '?v=' + versao : ''))
  .then(() => clearTimeout(vigia))
  .catch((err) => {
    clearTimeout(vigia);
    console.error(err);
    const detalhe = String(err?.message || '');
    if (/three|importmap|resolve|specifier|fetch dynamically|network/i.test(detalhe)) {
      erro('O motor 3D não pôde ser carregado do CDN (cdn.jsdelivr.net). Se a internet está ok, o servidor pode estar bloqueando scripts externos: confira o arquivo .htaccess desta pasta.');
    } else {
      erro('Não foi possível iniciar o jogo. ' + detalhe);
    }
  });
