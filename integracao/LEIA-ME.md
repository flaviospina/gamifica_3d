# Arquivos do Gamifica alterados para a Cruzadinha 3D

Só **dois** arquivos existentes mudam, e pouco. Aqui estão as versões completas (baseadas no código V2 do
repositório `gmificacao`). Se a sua instalação for V1 e os arquivos forem diferentes, faça as edições
manuais descritas abaixo pelo editor do Gerenciador de Arquivos do cPanel — são 3 trechos pequenos.

## 1. `aluno/missao.php` — abrir o jogo para o novo tipo

Logo depois de carregar a atividade (`$atv`) e validar o acesso, acrescente:

```php
// ── Cruzadinha 3D (Ilha das Palavras): roda na própria pasta do jogo ──
if ($atv['tipo'] === 'cruzadinha3d') {
    redirect(BASE_URL . '/atividades/cruzadinha3d/index.php?id=' . $id);
}
```
Se o seu V1 não tiver a função `redirect()`, use `header('Location: ' . BASE_URL . '/atividades/cruzadinha3d/index.php?id=' . $id); exit;`.

## 2. `professor/atividade_form.php` — novo tipo no cadastro

a) Na validação do tipo (procure por `'cacapalavras','grupo'`), acrescente `'cruzadinha3d'` à lista.

b) No `<select name="tipo">`, acrescente a opção:
```php
'cruzadinha3d' => '🏝️ Cruzadinha 3D (Ilha das Palavras)'
```

c) Entre os blocos de conteúdo por tipo (antes do bloco `elseif ($atv['tipo'] === 'grupo'):`), acrescente o bloco
que está em `professor/atividade_form.php` desta pasta entre os comentários `// ── CRUZADINHA 3D` e `// ── GRUPO`.
Ele só mostra um cartão com os botões "Cadastrar palavras e dicas", "Testar o jogo" e "Relatório por aluno".

## 3. Nada mais muda

`includes/functions.php`, `includes/auth.php`, views e triggers ficam como estão. O ícone do novo tipo nas
listas aparece como 📋 (padrão) a menos que você acrescente `'cruzadinha3d' => '🏝️'` em `icone_tipo()`,
o que é opcional.
