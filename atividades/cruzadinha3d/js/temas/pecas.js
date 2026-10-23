// ============================================================
//  js/temas/pecas.js — Peças de cenário em estilo "animação 3D":
//  formas arredondadas, sombreamento suave e materiais com brilho
//  controlado. Tudo instanciado para poucos draw calls.
// ============================================================
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Texturas } from '../texturas.js';

/** Agrupa transformações e gera um único InstancedMesh por tipo de peça. */
export class Instanciador {
  constructor(geometria, material, opcoes = {}) {
    this.geometria = geometria;
    this.material = material;
    this.itens = []; // { posicao, rotacaoY, escala, cor }
    this.sombra = opcoes.sombra ?? true;
    this.recebeSombra = opcoes.recebeSombra ?? true;
  }

  adicionar(posicao, { rotacaoY = 0, escala = 1, cor = null } = {}) {
    this.itens.push({ posicao, rotacaoY, escala, cor });
  }

  construir(scene, qualidade) {
    if (!this.itens.length) return null;
    const malha = new THREE.InstancedMesh(this.geometria, this.material, this.itens.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const eixoY = new THREE.Vector3(0, 1, 0);
    const esc = new THREE.Vector3();
    this.itens.forEach((it, i) => {
      q.setFromAxisAngle(eixoY, it.rotacaoY);
      const s = typeof it.escala === 'number' ? [it.escala, it.escala, it.escala] : it.escala;
      esc.set(s[0], s[1], s[2]);
      m.compose(it.posicao, q, esc);
      malha.setMatrixAt(i, m);
      if (it.cor) malha.setColorAt(i, it.cor);
    });
    malha.instanceMatrix.needsUpdate = true;
    if (malha.instanceColor) malha.instanceColor.needsUpdate = true;
    malha.castShadow = this.sombra && qualidade.sombras > 0;
    malha.receiveShadow = this.recebeSombra && qualidade.sombras > 0;
    scene.add(malha);
    return malha;
  }
}

/** Material padrão: fosco e suave, reage ao mapa de ambiente (visual de animação). */
export function materialSuave(cor, extra = {}) {
  return new THREE.MeshStandardMaterial({ color: cor, roughness: 0.78, metalness: 0, ...extra });
}
/** Compatibilidade com o nome antigo. */
export const materialChapado = materialSuave;

/** Material brilhante (água, vidro, metal leve). */
export function materialBrilho(cor, extra = {}) {
  return new THREE.MeshStandardMaterial({ color: cor, roughness: 0.25, metalness: 0.05, ...extra });
}

/** Caixa de cantos arredondados (substitui o BoxGeometry "quadrado"). */
export function caixaArredondada(l, a, p, raio = 0.08, segmentos = 3) {
  return new RoundedBoxGeometry(l, a, p, segmentos, Math.min(raio, l / 2, a / 2, p / 2));
}

/** Une várias esferas num só "fofo" (copa de árvore, arbusto, nuvem). */
function aglomerado(esferas, raioSeg = 10) {
  const partes = esferas.map(([x, y, z, r]) => {
    const g = new THREE.SphereGeometry(r, raioSeg, Math.round(raioSeg * 0.7));
    g.translate(x, y, z);
    return g;
  });
  const g = mergeGeometries(partes, false);
  partes.forEach(p => p.dispose());
  return g;
}

// ── Geometrias compartilhadas (criadas uma vez) ────────────────
const geo = {};
export function geometrias() {
  if (geo.pronto) return geo;
  geo.tronco = new THREE.CylinderGeometry(0.11, 0.2, 1.0, 9);
  geo.tronco.translate(0, 0.5, 0);
  // Copa redonda: cacho de esferas
  geo.copaRedonda = aglomerado([
    [0, 1.05, 0, 0.78], [0.45, 0.85, 0.2, 0.52], [-0.42, 0.9, -0.15, 0.5],
    [0.1, 0.8, -0.48, 0.48], [-0.1, 0.85, 0.48, 0.46], [0.05, 1.45, 0.05, 0.5],
  ]);
  // "Pinheiro" fofinho: três camadas de esferas achatadas
  geo.copaPinheiro = aglomerado([
    [0, 0.55, 0, 0.95], [0, 1.2, 0, 0.72], [0, 1.75, 0, 0.5], [0, 2.15, 0, 0.3],
  ]);
  geo.arbusto = aglomerado([[0, 0.32, 0, 0.42], [0.3, 0.26, 0.1, 0.3], [-0.28, 0.24, -0.1, 0.3], [0.05, 0.3, -0.3, 0.26]]);
  geo.pedra = pedraFacetada(3, 0.5, 1); // rocha facetada (silhueta autoral)
  geo.flor = aglomerado([[0, 0.34, 0, 0.09], [0.09, 0.34, 0, 0.07], [-0.09, 0.34, 0, 0.07], [0, 0.34, 0.09, 0.07], [0, 0.34, -0.09, 0.07]], 6);
  geo.caule = new THREE.CylinderGeometry(0.018, 0.022, 0.32, 6);
  geo.caule.translate(0, 0.16, 0);
  geo.manchaGrama = new THREE.CircleGeometry(1, 16);
  geo.manchaGrama.rotateX(-Math.PI / 2);
  geo.cogumeloPe = new THREE.CylinderGeometry(0.06, 0.08, 0.22, 8); geo.cogumeloPe.translate(0, 0.11, 0);
  geo.cogumeloChapeu = new THREE.SphereGeometry(0.16, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2); geo.cogumeloChapeu.translate(0, 0.2, 0);
  geo.pedraCaminho = new THREE.CylinderGeometry(0.42, 0.46, 0.06, 9); geo.pedraCaminho.translate(0, 0.03, 0);
  geo.montinho = new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  // Palmeira: tronco inclinado em segmentos + folhas (elipsoides achatados em leque)
  const seg = [];
  for (let i = 0; i < 5; i++) {
    const c = new THREE.CylinderGeometry(0.1 - i * 0.012, 0.13 - i * 0.012, 0.75, 8);
    c.translate(0, 0.37, 0).rotateZ(-0.09 * (i + 1)).translate(i * 0.085, i * 0.7, 0);
    seg.push(c);
  }
  geo.troncoPalmeira = mergeGeometries(seg, false); seg.forEach(s => s.dispose());
  const folhas = [];
  for (let i = 0; i < 7; i++) {
    const f = new THREE.SphereGeometry(0.62, 8, 5);
    f.scale(1, 0.09, 0.3).translate(0.62, 0, 0).rotateZ(-0.55 + (i % 2) * 0.25).rotateY(i * Math.PI * 2 / 7);
    folhas.push(f);
  }
  geo.folhasPalmeira = mergeGeometries(folhas, false); folhas.forEach(f => f.dispose());
  geo.folhasPalmeira.translate(0, 3.55, 0);
  geo.folhasPalmeira.translate(0.36, 0, 0);
  // Lampião de jardim: poste de madeira com braço e caixa de vidro
  const poste = new THREE.CylinderGeometry(0.05, 0.07, 1.6, 8); poste.translate(0, 0.8, 0);
  const braco = new THREE.BoxGeometry(0.34, 0.05, 0.05); braco.translate(0.14, 1.58, 0);
  const tampa = new THREE.ConeGeometry(0.14, 0.12, 6); tampa.translate(0.28, 1.5, 0);
  geo.lampiaoPoste = mergeGeometries([poste, braco, tampa], false);
  geo.lampiaoVidro = new THREE.CylinderGeometry(0.085, 0.07, 0.2, 6); geo.lampiaoVidro.translate(0.28, 1.34, 0);
  geo.lampiaoChama = new THREE.SphereGeometry(0.045, 8, 6); geo.lampiaoChama.translate(0.28, 1.34, 0);
  geo.nuvem = aglomerado([[0, 0, 0, 1], [0.9, -0.1, 0.1, 0.75], [-0.9, -0.15, 0, 0.7], [0.3, 0.35, -0.2, 0.65], [-0.3, 0.3, 0.25, 0.6], [1.6, -0.2, -0.1, 0.5], [-1.5, -0.25, 0.15, 0.45]], 14);
  geo.pronto = true;
  return geo;
}

/**
 * Instanciadores de vegetação com as cores do tema.
 * Retorna um objeto com métodos de alto nível (arvore, arbusto, pedra, flor).
 * Cada método devolve { raio, altura } para o colisor.
 */
export function criarVegetacao(cores) {
  const g = geometrias();
  const inst = {
    tronco:       new Instanciador(g.tronco, materialSuave('#FFFFFF', { roughness: 0.95, map: Texturas.casca(cores.tronco) })),
    copaRedonda:  new Instanciador(g.copaRedonda, materialSuave('#FFFFFF', { roughness: 0.85, map: Texturas.folhas(cores.copa) })),
    copaPinheiro: new Instanciador(g.copaPinheiro, materialSuave('#FFFFFF', { roughness: 0.85, map: Texturas.folhas(cores.copaEscura, 43) })),
    arbusto:      new Instanciador(g.arbusto, materialSuave('#FFFFFF', { roughness: 0.85, map: Texturas.folhas(cores.arbusto, 45) })),
    pedra:        new Instanciador(g.pedra, materialSuave('#FFFFFF', { roughness: 0.8, map: Texturas.pedraMusgo() })),
    flor:         new Instanciador(g.flor, materialSuave('#ffffff', { roughness: 0.5 }), { sombra: false }),
    caule:        new Instanciador(g.caule, materialSuave(cores.copaEscura), { sombra: false }),
    mancha:       new Instanciador(g.manchaGrama, materialSuave(cores.gramaEscura, { transparent: true, opacity: 0.55, depthWrite: false }), { sombra: false, recebeSombra: true }),
    cogumeloPe:   new Instanciador(g.cogumeloPe, materialSuave('#F6EFE2', { roughness: 0.8 })),
    cogumeloChapeu: new Instanciador(g.cogumeloChapeu, materialSuave('#E0533B', { roughness: 0.55 })),
    pedraCaminho: new Instanciador(g.pedraCaminho, materialSuave('#FFFFFF', { roughness: 0.9, map: Texturas.pedra('#D8CDB4', 13) }), { sombra: false }),
    montinho:     new Instanciador(g.montinho, materialSuave('#FFFFFF', { roughness: 0.95, map: Texturas.grama(cores.gramaEscura, 33) }), { sombra: true }),
  };

  return {
    inst,
    arvore(x, z, rnd, tipo = 'pinheiro') {
      const esc = rnd.entre(0.85, 1.35);
      const rot = rnd() * Math.PI * 2;
      inst.tronco.adicionar(new THREE.Vector3(x, 0, z), { rotacaoY: rot, escala: [esc, esc * 1.15, esc] });
      inst.mancha.adicionar(new THREE.Vector3(x, 0.006, z), { rotacaoY: rot, escala: 1.1 * esc });
      if (tipo === 'pinheiro') {
        inst.copaPinheiro.adicionar(new THREE.Vector3(x, 0.45 * esc, z), { rotacaoY: rot, escala: esc });
        return { raio: 0.85 * esc, altura: 3 * esc };
      }
      inst.copaRedonda.adicionar(new THREE.Vector3(x, 0.35 * esc, z), { rotacaoY: rot, escala: esc });
      return { raio: 0.95 * esc, altura: 2.6 * esc };
    },
    arbusto(x, z, rnd) {
      const esc = rnd.entre(0.7, 1.4);
      inst.arbusto.adicionar(new THREE.Vector3(x, 0, z), { rotacaoY: rnd() * 6.28, escala: [esc, esc * 0.9, esc] });
      return { raio: 0.62 * esc, altura: 0.8 * esc };
    },
    pedra(x, z, rnd) {
      const esc = rnd.entre(0.5, 1.6);
      inst.pedra.adicionar(new THREE.Vector3(x, 0, z), { rotacaoY: rnd() * 6.28, escala: [esc, esc * 0.6, esc * rnd.entre(0.8, 1.2)] });
      return { raio: 0.5 * esc, altura: 0.6 * esc };
    },
    flor(x, z, rnd, cor) {
      const p = new THREE.Vector3(x, 0, z);
      inst.caule.adicionar(p);
      inst.flor.adicionar(p, { cor: new THREE.Color(cor), escala: rnd.entre(0.8, 1.2), rotacaoY: rnd() * 6.28 });
    },
    cogumelo(x, z, rnd) {
      const esc = rnd.entre(0.7, 1.3);
      inst.cogumeloPe.adicionar(new THREE.Vector3(x, 0, z), { escala: esc });
      inst.cogumeloChapeu.adicionar(new THREE.Vector3(x, 0, z), { escala: esc, rotacaoY: rnd() * 6.28, cor: new THREE.Color(rnd() < 0.5 ? '#E0533B' : '#F2A33A') });
    },
    pedraCaminho(x, z, rnd) {
      inst.pedraCaminho.adicionar(new THREE.Vector3(x, 0, z), { rotacaoY: rnd() * 6.28, escala: [rnd.entre(0.8, 1.1), 1, rnd.entre(0.8, 1.1)] });
    },
    /** Montinho de grama (colina suave). Devolve o raio para o colisor. */
    montinho(x, z, rnd) {
      const r = rnd.entre(1.4, 2.6);
      inst.montinho.adicionar(new THREE.Vector3(x, -0.02, z), { escala: [r, r * 0.35, r], rotacaoY: rnd() * 6.28 });
      return { raio: r * 0.8, altura: r * 0.35 };
    },
    mancha(x, z, rnd) {
      inst.mancha.adicionar(new THREE.Vector3(x, 0.006, z), { rotacaoY: rnd() * 6.28, escala: rnd.entre(0.6, 1.5) });
    },
    construir(scene, qualidade) {
      const malhas = [];
      for (const i of Object.values(inst)) { const m = i.construir(scene, qualidade); if (m) malhas.push(m); }
      return malhas;
    },
  };
}

/** Nuvens fofas que flutuam devagar. */
export function criarNuvens(scene, rnd, quantidade, raio) {
  const g = geometrias();
  // Nuvens altas e distantes (nunca "na cara" da câmera), suavizadas pela névoa
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#FFF4E6', emissiveIntensity: 0.25, roughness: 1, transparent: true, opacity: 0.92 });
  const grupo = new THREE.Group();
  for (let i = 0; i < quantidade; i++) {
    const nuvem = new THREE.Mesh(g.nuvem, mat);
    const ang = rnd() * Math.PI * 2;
    const d = rnd.entre(raio * 1.3, raio * 3.2);
    nuvem.position.set(Math.cos(ang) * d, rnd.entre(17, 28), Math.sin(ang) * d);
    const s = rnd.entre(3.2, 6);
    nuvem.scale.set(s, s * 0.5, s * 0.8);
    nuvem.rotation.y = rnd() * 6.28;
    nuvem.userData.vel = rnd.entre(0.15, 0.4);
    grupo.add(nuvem);
  }
  scene.add(grupo);
  return {
    grupo,
    atualizar(dt) {
      for (const n of grupo.children) {
        n.position.x += n.userData.vel * dt;
        if (n.position.x > raio * 3.4) n.position.x = -raio * 3.4;
      }
    },
  };
}

/**
 * Funde várias malhas estáticas que usam o MESMO material em uma só
 * (menos draw calls). As transformações de cada malha são "assadas" na geometria.
 */
export function fundirMalhas(malhas, material) {
  const geos = malhas.map(m => {
    m.updateMatrix();
    const g = m.geometry.clone().applyMatrix4(m.matrix);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    return g;
  });
  const g = mergeGeometries(geos, false);
  geos.forEach(x => x.dispose());
  return new THREE.Mesh(g, material);
}

/**
 * Rocha facetada: icosaedro com vértices deslocados e normais planas
 * (silhueta autoral, em vez de "bolinha"). Determinística pelo seed.
 */
export function pedraFacetada(seed = 1, raio = 0.5, detalhe = 1) {
  let g = new THREE.IcosahedronGeometry(raio, detalhe).toNonIndexed();
  const pos = g.attributes.position;
  let h = seed * 9301 + 49297;
  const rnd = () => { h = (h * 1103515245 + 12345) % 2147483648; return h / 2147483648; };
  // Mesmo deslocamento para vértices coincidentes (sem rasgar a malha)
  const chave = new Map();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = v.toArray().map(n => n.toFixed(3)).join(',');
    if (!chave.has(k)) chave.set(k, 0.72 + rnd() * 0.56);
    v.multiplyScalar(chave.get(k));
    v.y *= 0.8;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  g.translate(0, raio * 0.55, 0);
  return g;
}

/**
 * Funde as malhas estáticas de um grupo por material (menos draw calls).
 * Malhas listadas em `manter` (ou com userData.animado) ficam como estão.
 */
export function fundirEstaticos(grupo, manter = []) {
  const porMaterial = new Map();
  const remover = [];
  grupo.updateMatrixWorld(true);
  grupo.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || manter.includes(o) || o.userData.animado) return;
    let p = o.parent, animado = false;
    while (p && p !== grupo) { if (manter.includes(p) || p.userData.animado) animado = true; p = p.parent; }
    if (animado) return;
    const lista = porMaterial.get(o.material) || [];
    let g = o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (g.index) g = g.toNonIndexed();
    // Leva para o espaço do grupo
    const rel = new THREE.Matrix4().copy(grupo.matrixWorld).invert().multiply(o.matrixWorld);
    lista.push(g.applyMatrix4(rel));
    porMaterial.set(o.material, lista);
    remover.push(o);
  });
  for (const o of remover) o.parent.remove(o);
  for (const [mat, geos] of porMaterial) {
    const todos = geos.map(g => g.index ? g.toNonIndexed() : g);
    const g = mergeGeometries(todos, false);
    todos.forEach(x => x.dispose());
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true; m.receiveShadow = true;
    grupo.add(m);
  }
  return grupo;
}

/** Caixa arredondada pronta (para construções). Pivô na base. */
export function caixa(largura, altura, profundidade, cor, raio = 0.08) {
  const m = new THREE.Mesh(caixaArredondada(largura, altura, profundidade, raio), materialSuave(cor));
  m.position.y = altura / 2;
  return m;
}
