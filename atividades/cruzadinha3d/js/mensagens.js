// ============================================================
//  js/mensagens.js — Textos de incentivo (sempre positivos, variados)
// ============================================================
const escolher = (lista) => lista[Math.floor(Math.random() * lista.length)];

export const MENSAGENS = {
  acerto: [
    'Isso! Palavra no lugar! 🎉', 'Mandou bem! ✨', 'Acertou em cheio! 🌟', 'Uau, que explorador! 🏝️',
    'Mais uma para a coleção! 📚', 'Brilhou! ⭐', 'Perfeito, continue assim! 🚀',
  ],
  acertoEstrela: [
    'Sem nenhuma dica! Estrela de autonomia! ⭐', 'Sozinho(a) do começo ao fim! Estrela para você! ⭐',
    'Pensou e acertou! Estrela de autonomia! ⭐',
  ],
  quase: [
    'Quase! Olha de novo a dica. 🔍', 'Boa tentativa! Que tal outra palavra? 💭', 'Hum, ainda não. As letras douradas já estão certas! ✨',
    'Vamos de novo? Você está perto. 🧭', 'Nada se perde por tentar. Mais uma? 💪', 'Pista: a dica tem um detalhe importante. 🤔',
  ],
  incompleto: [
    'Faltam algumas letrinhas. 😊', 'Complete todas as casinhas antes de responder.', 'Tem casinha vazia ainda, olha lá! 👀',
  ],
  dica: [
    'Uma letrinha de presente! 💡', 'Aqui vai uma ajuda. 💡', 'Olha essa letra chegando! 💡',
  ],
  automatica: [
    'As letras dos cruzamentos completaram essa palavra sozinhas! 🧩',
  ],
  zonaAberta: [
    'Novo caminho aberto! Totens desceram para você. 🗝️', 'A ilha se abriu um pouco mais! 🌉', 'Mais totens liberados. Explore! 🧭',
  ],
  totemFechado: (faltam) => faltam === 1
    ? 'Resolva mais 1 palavra para este totem descer. 🔒'
    : `Resolva mais ${faltam} palavras para este totem descer. 🔒`,
  agua: [
    'Opa, um mergulho! De volta ao caminho seguro.', 'Água fresquinha! Vamos continuar a explorar.', 'Escorregou? Sem problema, nada se perde por aqui.',
  ],
  final: (nome) => `Parabéns, ${nome}! Você completou a ilha! 🏆`,
};

export function mensagem(tipo, ...args) {
  const m = MENSAGENS[tipo];
  return typeof m === 'function' ? m(...args) : escolher(m);
}
