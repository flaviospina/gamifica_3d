// public/assets/js/app.js — componentes Alpine.js da aplicação
document.addEventListener('alpine:init', () => {
  // Painel "Estado do sistema" da página inicial: consulta GET /health.
  Alpine.data('estadoSistema', () => ({
    carregando: true,
    ok: false,
    mensagem: '',
    php: '',
    banco: '',
    storage: '',
    async carregar() {
      const base = document.querySelector('link[rel="stylesheet"][href$="/assets/css/app.css"]');
      const baseUrl = base ? base.getAttribute('href').replace(/\/assets\/css\/app\.css$/, '') : '';
      try {
        const resposta = await fetch(baseUrl + '/health', { headers: { Accept: 'application/json' } });
        const dados = await resposta.json();
        this.ok = dados.status === 'ok';
        this.mensagem = dados.mensagem || (this.ok ? 'Tudo certo.' : 'Há problemas no sistema.');
        this.php = dados.php && dados.php.ok ? 'ok (' + dados.php.versao + ')' : 'com problemas';
        this.banco = dados.banco && dados.banco.ok ? 'ok (' + dados.banco.versao + ')' : 'indisponível';
        this.storage = dados.storage && dados.storage.ok ? 'ok' : 'sem permissão de escrita';
      } catch (erro) {
        this.ok = false;
        this.mensagem = 'Não foi possível consultar o estado do sistema.';
      } finally {
        this.carregando = false;
      }
    },
  }));
});
