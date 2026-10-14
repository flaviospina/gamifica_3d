// ============================================================
//  js/temas/ciencias.js — Tema "Ilha da Ciência"
//  Ilha com vegetação e uma pequena estação de pesquisa.
//
//  Um tema é um objeto com: cores do céu/chão/água/blocos, luz,
//  e a função decorar(ctx) que espalha objetos e registra colisores.
// ============================================================
import * as THREE from 'three';
import { criarVegetacao, materialChapado, caixa } from './pecas.js';

export default {
  chave: 'ciencias',
  nome: 'Ilha da Ciência',
  disciplina: 'Ciências',

  ceu:   { topo: '#4D9BE6', horizonte: '#D7EDFF' },
  nevoa: { cor: '#D7EDFF', perto: 28, longe: 75 },
  luz: {
    sol: '#FFF3D2', intensidadeSol: 2.8,
    ceu: '#BFDCFF', chao: '#6B9E45', intensidadeAmbiente: 1.15,
    direcaoSol: [12, 20, 8],
  },
  cores: {
    grama: '#6EBF4B', gramaEscura: '#55A338', areia: '#EBD9A0', agua: '#3DA3D8', aguaFunda: '#2B7FB5',
    ladrilho: '#FBF7EF', ladrilhoLateral: '#E6DBC2', ladrilhoBorda: '#CBBF9E',
    tronco: '#8A5A2B', copa: '#4FA43A', copaEscura: '#3D8A2E', arbusto: '#5CB048', pedra: '#9A9C9F',
    totem: '#286456', totemAceso: '#E0A537', flores: ['#FFD84D', '#FF7A9E', '#FFFFFF', '#9ED3FF'],
  },

  /**
   * ctx: { scene, rnd, qualidade, colisao, areaLivre(x,z,raio), raioIlha }
   */
  decorar(ctx) {
    const { scene, rnd, qualidade, colisao, areaLivre, raioIlha } = ctx;
    const veg = criarVegetacao(this.cores);
    const densidade = qualidade.decoracao;

    // Manchas de grama mais escura (só visual)
    for (let i = 0; i < 40 * densidade; i++) {
      const a = rnd() * Math.PI * 2, d = rnd.entre(2, raioIlha - 1);
      veg.mancha(Math.cos(a) * d, Math.sin(a) * d, rnd);
    }

    // Árvores em anel pela borda + algumas no interior
    const tentar = (n, dMin, dMax, fn) => {
      let feitos = 0, tentativas = 0;
      while (feitos < n && tentativas < n * 20) {
        tentativas++;
        const a = rnd() * Math.PI * 2, d = rnd.entre(dMin, dMax);
        const x = Math.cos(a) * d, z = Math.sin(a) * d;
        if (!areaLivre(x, z, 1.2)) continue;
        fn(x, z);
        feitos++;
      }
    };
    tentar(Math.round(34 * densidade), raioIlha - 4.5, raioIlha - 1.2, (x, z) => {
      const info = veg.arvore(x, z, rnd, rnd() < 0.7 ? 'pinheiro' : 'redonda');
      colisao.solidoCentro(x, z, info.raio * 2, info.raio * 2, info.altura);
    });
    tentar(Math.round(10 * densidade), 6, raioIlha - 5, (x, z) => {
      const info = veg.arvore(x, z, rnd, 'redonda');
      colisao.solidoCentro(x, z, info.raio * 2, info.raio * 2, info.altura);
    });
    tentar(Math.round(18 * densidade), 4, raioIlha - 2, (x, z) => {
      const info = veg.arbusto(x, z, rnd);
      colisao.solidoCentro(x, z, info.raio * 1.6, info.raio * 1.6, info.altura);
    });
    tentar(Math.round(12 * densidade), 3, raioIlha - 1.5, (x, z) => {
      const info = veg.pedra(x, z, rnd);
      colisao.solidoCentro(x, z, info.raio * 1.6, info.raio * 1.6, info.altura);
    });
    tentar(Math.round(60 * densidade), 2, raioIlha - 1.5, (x, z) => {
      veg.flor(x, z, rnd, rnd.escolher(this.cores.flores));
    });

    const malhas = veg.construir(scene, qualidade);
    colisao.malhasCamera.push(...malhas);

    // Estação de pesquisa (marco do tema) — posicionada num canto livre
    const estacao = this.criarEstacao(rnd);
    let px = 0, pz = 0;
    for (let t = 0; t < 60; t++) {
      const a = rnd() * Math.PI * 2, d = rnd.entre(8, raioIlha - 6);
      px = Math.cos(a) * d; pz = Math.sin(a) * d;
      if (areaLivre(px, pz, 4)) break;
    }
    estacao.position.set(px, 0, pz);
    estacao.rotation.y = Math.atan2(-px, -pz); // porta voltada para o centro
    scene.add(estacao);
    colisao.solidoCentro(px, pz, 4.2, 3.4, 3.2);
    colisao.malhasCamera.push(estacao);

    return { atualizar(dt, t) { estacao.userData.antena.rotation.y = t * 0.6; } };
  },

  /** Cabana de pesquisa: paredes, telhado, antena parabólica e tanque de amostras. */
  criarEstacao() {
    const g = new THREE.Group();
    const corpo = caixa(3.6, 2.2, 2.8, '#F4EFE4'); g.add(corpo);
    const faixa = caixa(3.7, 0.3, 2.9, '#286456'); faixa.position.y = 2.1; g.add(faixa);
    const telhado = new THREE.Mesh(new THREE.ConeGeometry(2.9, 1.2, 4), materialChapado('#2E4A6B'));
    telhado.position.y = 2.85; telhado.rotation.y = Math.PI / 4; g.add(telhado);
    const porta = caixa(0.8, 1.5, 0.1, '#8A5A2B'); porta.position.set(0, 0.75, 1.42); g.add(porta);
    for (const sx of [-1.2, 1.2]) {
      const janela = caixa(0.7, 0.6, 0.1, '#9ED3FF'); janela.position.set(sx, 1.3, 1.42); g.add(janela);
    }
    // Antena parabólica
    const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6), materialChapado('#9A9C9F'));
    mastro.position.set(1.2, 3.6, -0.6); g.add(mastro);
    const antena = new THREE.Group();
    const prato = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.6), materialChapado('#E9E9E9', { side: THREE.DoubleSide }));
    prato.rotation.x = -Math.PI / 2.4; prato.position.y = 0.2;
    antena.add(prato);
    antena.position.set(1.2, 4.2, -0.6);
    g.add(antena);
    g.userData.antena = antena;
    // Tanque de amostras ao lado
    const tanque = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.1, 10), materialChapado('#3DA3D8', { transparent: true, opacity: 0.85 }));
    tanque.position.set(-2.4, 0.55, 0.6); g.add(tanque);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  },
};
