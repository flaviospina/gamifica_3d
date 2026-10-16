# Referências visuais padrão (modelos adotados para as artes)

As quatro imagens em `templates/styles/referencias/` foram definidas pelo
coordenador do projeto como **modelos padrão** para toda arte gerada pelo sistema
(apostilas, capas e cartazes). Os prompts-modelo de cada estilo (Fase 1) e os
templates HTML do modo editável (Fase 6) devem reproduzir esta linguagem visual.
Elas são referência de **composição, densidade e paleta** — nunca de conteúdo:
o tema das imagens originais (estudo bíblico) não se aplica ao nosso produto.

## O que as referências têm em comum (regras gerais de arte)

1. **Página A4 vertical única**, vista de frente, preenchida de borda a borda, sem mockup nem páginas lado a lado.
2. **Hierarquia forte**: faixa superior com título enorme (2 a 3 palavras), subtítulo curto e uma "etiqueta" de contexto acima (ex.: "Estudo bíblico — para jovens" → no nosso caso "4º ano · Ciências").
3. **Blocos numerados** (01, 02, 03…) com título curto, ícone e texto de 1 a 3 linhas ou lista de 3 a 5 itens. De 6 a 9 blocos por página interna.
4. **Ícones e mascote** apoiando cada bloco; um personagem central de aparência amigável, sem marcas ou personagens conhecidos.
5. **Rodapé** com uma frase-síntese e o indicador "Página X de Y".
6. **Textos curtos**, em português do Brasil, com acentuação correta. O limite de caracteres por bloco é parte da validação (seção 5 do prompt-mestre).
7. **Paleta coerente por estilo** (ver abaixo), fundo claro ou escuro conforme o público.

## As quatro referências

### referencia-01.webp — conjunto "Amor de Deus / Evangelismo"
Três páginas: capa escura cinematográfica (jovem de costas, horizonte, título em
azul/branco com efeito luminoso, três pilares com ícones no lado esquerdo, citação
destacada no canto, rodapé com 4 pequenos ícones-resumo); página interna clara com
7 blocos numerados em cartões arredondados (azul, laranja, roxo, verde) e um
personagem recortado; capa alternativa com personagem 3D estilo animação e 6 blocos.
→ Base dos estilos **`jovem_cinematografico`** (Anos Finais / Ensino Médio) e
**`infografico_limpo`** (páginas internas de qualquer etapa).

### referencia-02.webp — conjunto "Obediência / Fé cristã / Apocalipse"
Página infantil em cartoon (criança sorridente, cores saturadas, 6 blocos com
ícones grandes, placas de madeira "conhecer/aprender/praticar"); página de
"colagem escolar" com adesivos, setas, balões e muitos mini-blocos coloridos;
capa épica realista (livro aberto, luz dourada, título serifado).
→ Base dos estilos **`cartoon_infantil`** (Educação Infantil / Anos Iniciais),
**`colagem_adesivos`** (Anos Iniciais / Finais) e **`epico_realista`** (capas, EM).

### referencia-03.webp — galeria de capas
Mostra as capas lado a lado para comparação de proporção, margens e peso do
título. Útil como referência de **capa**: título ocupando ~25% da altura,
mascote/personagem ocupando o terço inferior ou lateral, selo/etiqueta no topo.

### referencia-04.webp — "Ensinando a Bíblia / Como estudar a Bíblia / O que é o inferno"
Páginas de altíssima densidade: título em letras recortadas multicoloridas,
dezenas de mini-cartões com listas, mapas, setas e adesivos; versão com
personagem fotográfico adulto; versão escura "dossiê" para público jovem.
→ Base do estilo **`doodle_escolar`** (padrão do prompt-mestre) e referência de
densidade máxima: este é o teto de texto por página, não a meta.

## Mapa inicial de estilos (confirmado na Fase 1, cadastrado no banco na Fase 2)

| Chave do estilo | Público sugerido | Referência | Fundo | Mascote |
|---|---|---|---|---|
| `cartoon_infantil` | EI, EF 1º–3º | 02 (esq.) | claro, pastel saturado | criança cartoon |
| `doodle_escolar` | EF 2º–6º | 04 (esq.), 02 (centro) | claro, rabiscos | estudante em traço simples |
| `colagem_adesivos` | EF 4º–9º | 02 (centro) | claro, adesivos | — (ícones) |
| `infografico_limpo` | EF 6º–EM | 01 (centro), 04 (centro) | claro, cartões | personagem recortado |
| `jovem_cinematografico` | EF 8º–EM | 01 (esq.), 04 (dir.) | escuro, luz azul | jovem 3D de costas |
| `epico_realista` | capas, EM, eventos | 02 (dir.), 03 | foto-realista | — (objeto simbólico) |

Qualquer estilo novo deve ser documentado aqui com a referência que o inspira.
