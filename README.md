# 🐍 Cobrinha do Abacate Ultimate

Jogo HTML5 da cobrinha com tema de abacate, feito para rodar direto no navegador.

## 🎮 Modos de jogo

- **Single Player**: jogue sozinho e bata seu recorde.
- **Multiplayer**: dois jogadores no mesmo teclado.
- **Campanha**: avance por fases e derrote bosses.
- **Boss Rush**: enfrente Tomatão, Pimentão e Abacatão em sequência.
- **Modo Infinito**: sobreviva enquanto o jogo fica mais difícil.
- **Desafio Diário**: objetivo novo para ganhar moedas.

## ✨ Recursos

- Skins desbloqueáveis.
- Loja de upgrades.
- Recompensa diária.
- Ranking local.
- Joystick virtual para celular.
- Sons em arquivos WAV.
- Sprites SVG.
- PWA com `manifest.json` e `service-worker.js`.

## 🕹️ Controles

- Player 1: `W A S D`
- Player 2: `Setas`
- Celular: joystick virtual ou gesto de deslizar
- Pausar: `P`
- Tela cheia: `F`

## 🚀 Como rodar localmente

Abra o arquivo `index.html` no navegador.

Para testar como site:

```bash
python -m http.server 8000
```

Depois abra:

```text
http://localhost:8000
```

## 🌐 Como publicar

Use GitHub Pages, Netlify ou Vercel. Veja o arquivo `DEPLOY.md`.

## 👤 Criador

Criado por **Braian Sorato**.


## Melhorias Premium Realistas

- colisão do corpo refeita com subpassos para evitar atravessar a própria cobra;
- mapas com visual mais rico e texturizado;
- cobras com aparência mais realista e efeitos por skin (água, fogo, gelo, ouro e mais);
- sprites dos elementos do mapa com mais detalhe.


## Correção de power-ups e upgrades

- Corrigido problema de alguns power-ups não ativarem quando a cobra passava rápido por cima.
- Power-up de moedas 2X agora dura mais, aparece no HUD com tempo e mostra o ganho de moedas na tela.
- Upgrades agora atualizam a loja, perfil e telas imediatamente após a compra.
- Colisão e coleta agora usam subpassos para evitar falhas em velocidades altas.


## Versão 1.1.0

Melhorias adicionadas:

- Tela de novidades da versão.
- Botão para reportar bug.
- Botão para instalar o jogo como PWA.
- Volume separado para efeitos e música.
- Estatísticas da partida ao finalizar.
- Power-ups e upgrades com feedback visual melhorado.


## Versão 1.2.0

Melhorias adicionadas:

- Sistema de nickname.
- Ranking local por jogador.
- Tela de seleção de personagem com prévia grande.
- Modo Treino sem morte.
- Tutorial jogável dentro do mapa.
- Perfil atualizado com o nome do jogador.


## Versão 1.3.0

Melhorias adicionadas:

- Sistema de XP e níveis do jogador.
- Estrelas nas fases da campanha.
- Missão semanal.
- Códigos promocionais.
- Skins liberadas por conquista.
- Perfil com barra de XP.
- Seleção de fases mostrando estrelas.


## Versão 1.4.0 — Polimento Final

Melhorias adicionadas:

- Tela inicial mais cinematográfica.
- Game Over com dica automática.
- Tela de vitória mais destacada.
- Dificuldade **Insano**.
- Novos power-ups:
  - ❄️ Congelar
  - 👻 Fantasma
  - 🔹 Mini Cobra
  - ❤️ Coração / vida extra
  - 🥑 Mega Abacate
- Loja de itens especiais:
  - Escudo inicial
  - Ímã inicial
  - Moedas 2X inicial
  - Reviver extra
  - Mapa limpo
- Bosses mais inteligentes:
  - Tomatão com investida
  - Pimentão com zona de fogo
  - Abacatão invocando obstáculos
- README preparado para divulgação.

## Jogar agora

Depois de publicar no GitHub Pages, coloque o link aqui:

```text
https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/
```
