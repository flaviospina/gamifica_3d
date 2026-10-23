# Skills de apoio ao desenvolvimento (não vão para o servidor)

Esta pasta guarda instruções de referência usadas pelo Claude Code ao trabalhar na
Ilha das Palavras. Nada aqui é carregado pelo jogo nem precisa subir para o HostGator.

| Origem (MIT) | Skills copiadas | Para quê |
| --- | --- | --- |
| majidmanzarpour/threejs-game-skills | threejs-aaa-graphics-builder, threejs-debug-profiler, threejs-qa-release, threejs-game-ui-designer | passe visual com scorecard medido em captura, perfil de desempenho, QA no navegador, HUD |
| OpenAEC-Foundation/Three.js-Claude-Skill-Package | threejs-core-*, threejs-syntax-*, threejs-impl-{lighting,shadows,animation,post-processing,audio}, threejs-errors-*, threejs-agents-scene-builder | referência técnica do Three.js r160+ (luz, sombra, pós-processamento, shaders, materiais) |
| setcodes/gamedev-skills | game-designer | desenho de mecânicas e progressão, neutro de engine |

Ficaram de fora de propósito: scaffold Vite/TypeScript, React Three Fiber, Drei, WebGPU,
física, XR, IFC, geração por API paga (Tripo, Gemini, ElevenLabs), Meshy e Blender —
o jogo é módulos ES puros, sem build, com arte procedural.

Reinstalar: `npx skills add majidmanzarpour/threejs-game-skills --skill <nome> -a claude-code -y`
(ver skills-lock.json na raiz).
