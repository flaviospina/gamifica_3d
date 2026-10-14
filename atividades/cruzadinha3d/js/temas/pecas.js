// ============================================================
//  js/temas/pecas.js — Peças de cenário em low-poly (primitivas)
//  Reutilizadas por todos os temas. Tudo instanciado para poucos draw calls.
// ============================================================
import * as THREE from 'three';

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

/** Material padrão low-poly (Lambert com faces chapadas: barato e bonito). */
export function materialChapado(cor, extra = {}) {
  return new THREE.MeshLambertMaterial({ color: cor, flatShading: true, ...extra });
}

// ── Geometrias compartilhadas (criadas uma vez) ────────────────
const geo = {};
export function geometrias() {
  if (geo.pronto) return geo;
  geo.tronco   = new THREE.CylinderGeometry(0.12, 0.18, 1.0, 6);
  geo.copa     = new THREE.ConeGeometry(0.9, 1.6, 7);
  geo.copaBaixa= new THREE.ConeGeometry(1.15, 1.3, 7);
  geo.copaRedonda = new THREE.IcosahedronGeometry(0.85, 0);
  geo.arbusto  = new THREE.IcosahedronGeometry(0.45, 0);
  geo.pedra    = new THREE.DodecahedronGeometry(0.5, 0);
  geo.flor     = new THREE.SphereGeometry(0.11, 5, 4);
  geo.caule    = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4);
  geo.manchaGrama = new THREE.CircleGeometry(1, 7);
  geo.nuvem    = new THREE.SphereGeometry(1, 7, 5);
  geo.pronto = true;
  // Centraliza troncos/copas pela base (pivô no chão)
  geo.tronco.translate(0, 0.5, 0);
  geo.copa.translate(0, 0.8, 0);
  geo.copaBaixa.translate(0, 0.65, 0);
  geo.copaRedonda.translate(0, 0.85, 0);
  geo.arbusto.translate(0, 0.35, 0);
  geo.pedra.translate(0, 0.3, 0);
  geo.caule.translate(0, 0.15, 0);
  geo.flor.translate(0, 0.32, 0);
  return geo;
}

/**
 * Cria um conjunto de instanciadores para vegetação com as cores do tema.
 * Retorna um objeto com métodos de alto nível (arvore, arbusto, pedra, flor).
 */
export function criarVegetacao(cores) {
  const g = geometrias();
  const inst = {
    tronco:      new Instanciador(g.tronco, materialChapado(cores.tronco)),
    copa:        new Instanciador(g.copa, materialChapado(cores.copa)),
    copaBaixa:   new Instanciador(g.copaBaixa, materialChapado(cores.copaEscura)),
    copaRedonda: new Instanciador(g.copaRedonda, materialChapado(cores.copa)),
    arbusto:     new Instanciador(g.arbusto, materialChapado(cores.arbusto)),
    pedra:       new Instanciador(g.pedra, materialChapado(cores.pedra)),
    flor:        new Instanciador(g.flor, materialChapado('#ffffff'), { sombra: false }),
    caule:       new Instanciador(g.caule, materialChapado(cores.copaEscura), { sombra: false }),
    mancha:      new Instanciador(g.manchaGrama, materialChapado(cores.gramaEscura), { sombra: false, recebeSombra: true }),
  };
  inst.mancha.geometria.rotateX(-Math.PI / 2);

  return {
    inst,
    /** Pinheiro (2 copas) ou árvore redonda. */
    arvore(x, z, rnd, tipo = 'pinheiro') {
      const esc = rnd.entre(0.8, 1.3);
      const rot = rnd() * Math.PI * 2;
      const p = new THREE.Vector3(x, 0, z);
      inst.tronco.adicionar(p, { rotacaoY: rot, escala: [esc, esc * 1.1, esc] });
      if (tipo === 'pinheiro') {
        inst.copaBaixa.adicionar(new THREE.Vector3(x, 0.55 * esc, z), { rotacaoY: rot, escala: esc });
        inst.copa.adicionar(new THREE.Vector3(x, 1.25 * esc, z), { rotacaoY: rot + 0.4, escala: esc });
      } else {
        inst.copaRedonda.adicionar(new THREE.Vector3(x, 0.75 * esc, z), { rotacaoY: rot, escala: esc * 1.05 });
      }
      return { raio: 0.3 * esc, altura: 2.6 * esc };
    },
    arbusto(x, z, rnd) {
      const esc = rnd.entre(0.7, 1.4);
      inst.arbusto.adicionar(new THREE.Vector3(x, 0, z), { rotacaoY: rnd() * 6.28, escala: [esc, esc * 0.8, esc] });
      return { raio: 0.45 * esc, altura: 0.8 * esc };
    },
    pedra(x, z, rnd) {
      const esc = rnd.entre(0.5, 1.6);
      inst.pedra.adicionar(new THREE.Vector3(x, 0, z), { rotacaoY: rnd() * 6.28, escala: [esc, esc * 0.6, esc * rnd.entre(0.8, 1.2)] });
      return { raio: 0.5 * esc, altura: 0.6 * esc };
    },
    flor(x, z, rnd, cor) {
      const p = new THREE.Vector3(x, 0, z);
      inst.caule.adicionar(p);
      inst.flor.adicionar(p, { cor: new THREE.Color(cor), escala: rnd.entre(0.8, 1.2) });
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

/** Nuvens: grupos de esferas chapadas que flutuam devagar. */
export function criarNuvens(scene, rnd, quantidade, raio) {
  const g = geometrias();
  const mat = new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.92 });
  const grupo = new THREE.Group();
  for (let i = 0; i < quantidade; i++) {
    const nuvem = new THREE.Group();
    const partes = rnd.inteiro(3, 5);
    for (let k = 0; k < partes; k++) {
      const m = new THREE.Mesh(g.nuvem, mat);
      m.position.set(k * 0.9 - partes * 0.45, rnd.entre(-0.2, 0.2), rnd.entre(-0.4, 0.4));
      const s = rnd.entre(0.7, 1.3);
      m.scale.set(s, s * 0.55, s * 0.8);
      nuvem.add(m);
    }
    const ang = rnd() * Math.PI * 2;
    const d = rnd.entre(raio * 0.6, raio * 1.3);
    nuvem.position.set(Math.cos(ang) * d, rnd.entre(9, 14), Math.sin(ang) * d);
    nuvem.scale.setScalar(rnd.entre(1.4, 2.6));
    nuvem.userData.vel = rnd.entre(0.15, 0.4);
    grupo.add(nuvem);
  }
  scene.add(grupo);
  return {
    grupo,
    atualizar(dt) {
      for (const n of grupo.children) {
        n.position.x += n.userData.vel * dt;
        if (n.position.x > raio * 1.6) n.position.x = -raio * 1.6;
      }
    },
  };
}

/** Caixa simples com material chapado (para construções). */
export function caixa(largura, altura, profundidade, cor) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(largura, altura, profundidade), materialChapado(cor));
  m.position.y = altura / 2;
  return m;
}
