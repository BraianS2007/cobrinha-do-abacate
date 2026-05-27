const Game = (() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  const SPRITES = {};
  ["avocado","tree","rock","cactus","crystal","building","lava","pond","post"].forEach(name=>{
    const img = new Image();
    img.src = `assets/${name}.svg`;
    SPRITES[name] = img;
  });

  function spriteReady(name){
    return SPRITES[name] && SPRITES[name].complete && SPRITES[name].naturalWidth > 0;
  }

  function drawSprite(name,x,y,w,h,rot=0){
    if(!spriteReady(name)) return false;
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(rot);
    ctx.drawImage(SPRITES[name],-w/2,-h/2,w,h);
    ctx.restore();
    return true;
  }

  const state = {
    mode:"single", levelSelectMode:false, selectedLevelIndex:0, bossRushIndex:0, sessionSeconds:0,
    running:false, paused:false, closing:false, finished:false,
    lastTime:0, animTime:0,
    campaignIndex:0, campaignTotal:0,
    map:"floresta", obstaclesReal:true, graphics:"medio",
    snakes:[], food:null, powerUp:null, boss:null, bossProjectiles:[], bossHazards:[],
    powerTimer:0, decor:[], particles:[], waves:[], floatingTexts:[], confetti:[],
    match:{golden:0,totalPoints:0,coinsEarned:0,died:false,powerUps:0,maxLength:120,deathReason:'-',startTime:0},
    effects:{magnet:0,slow:0,doubleCoins:0,freeze:0,ghost:0,mini:0},
    cameraShake:0
  };

  const keys = {};

  document.addEventListener("keydown", e => {
    const k = e.key.toLowerCase();
    if(k === "p" && state.running){ togglePause(); return; }
    if(k === "f"){ toggleFullscreen(); return; }
    keys[k] = true;
  });
  document.addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; });

  document.querySelectorAll(".mobile-controls button[data-dir]").forEach(btn=>{
    btn.addEventListener("click", ()=>{ const p1=state.snakes[0]; if(!p1||!state.running||state.paused) return; setDirection(p1, btn.dataset.dir); });
  });

  let touchStartX=0, touchStartY=0;
  const joystick = document.getElementById("joystick");
  const joystickKnob = document.getElementById("joystickKnob");
  let joystickActive = false;
  let joystickCenter = {x:0,y:0};
  canvas.addEventListener("touchstart", e=>{ e.preventDefault(); const t=e.touches[0]; touchStartX=t.clientX; touchStartY=t.clientY; }, {passive:false});
  canvas.addEventListener("touchend", e=>{ e.preventDefault(); if(!state.running||state.paused) return; const t=e.changedTouches[0]; const dx=t.clientX-touchStartX, dy=t.clientY-touchStartY; if(Math.abs(dx)<25 && Math.abs(dy)<25) return; const p1=state.snakes[0]; if(!p1) return; if(Math.abs(dx)>Math.abs(dy)) setDirection(p1, dx>0?"right":"left"); else setDirection(p1, dy>0?"down":"up"); }, {passive:false});

  if(joystick){
    joystick.addEventListener("pointerdown", e=>{
      e.preventDefault();
      if(!state.running || state.paused) return;
      joystickActive = true;
      const rect = joystick.getBoundingClientRect();
      joystickCenter = {x:rect.left + rect.width/2, y:rect.top + rect.height/2};
      joystick.setPointerCapture(e.pointerId);
      updateJoystick(e.clientX,e.clientY);
    });

    joystick.addEventListener("pointermove", e=>{
      if(!joystickActive) return;
      e.preventDefault();
      updateJoystick(e.clientX,e.clientY);
    });

    function endJoystick(e){
      joystickActive = false;
      if(joystickKnob) joystickKnob.style.transform = "translate(0px,0px)";
    }

    joystick.addEventListener("pointerup", endJoystick);
    joystick.addEventListener("pointercancel", endJoystick);
  }

  function updateJoystick(clientX,clientY){
    const p1 = state.snakes[0];
    if(!p1) return;
    const dx = clientX - joystickCenter.x;
    const dy = clientY - joystickCenter.y;
    const distJoy = Math.hypot(dx,dy);
    const max = 38;
    const clamped = Math.min(max, distJoy);
    const angle = Math.atan2(dy,dx);
    const kx = Math.cos(angle) * clamped;
    const ky = Math.sin(angle) * clamped;
    if(joystickKnob) joystickKnob.style.transform = `translate(${kx}px,${ky}px)`;
    if(distJoy < 14) return;
    if(Math.abs(dx) > Math.abs(dy)) setDirection(p1, dx > 0 ? "right" : "left");
    else setDirection(p1, dy > 0 ? "down" : "up");
  }


  function start(mode){
    Sound.click(); state.mode=mode; state.levelSelectMode=false; state.match={golden:0,totalPoints:0,coinsEarned:0,died:false,powerUps:0,maxLength:120,deathReason:'-',startTime:performance.now()}; state.effects={magnet:0,slow:0,doubleCoins:0,freeze:0,ghost:0,mini:0};
    if(mode === "campanha"){ state.campaignIndex=0; state.campaignTotal=0; }
    if(mode === "bossrush"){ state.bossRushIndex=0; state.campaignTotal=0; state.map="cidade"; }
    if(mode === "infinito"){ state.campaignTotal=0; }
    setupGame(); showLevelIntro();
  }

  function startLevel(index){
    const save = Store.saveData();
    if(!save.unlockedLevels.includes(index)){ UI.toast("Essa fase ainda está bloqueada."); return; }
    Sound.click(); state.mode="campanha"; state.levelSelectMode=true; state.selectedLevelIndex=index; state.campaignIndex=index; state.campaignTotal=0; state.match={golden:0,totalPoints:0,coinsEarned:0,died:false,powerUps:0,maxLength:120,deathReason:'-',startTime:performance.now()}; state.effects={magnet:0,slow:0,doubleCoins:0,freeze:0,ghost:0,mini:0};
    setupGame(); showLevelIntro();
  }

  function setupGame(){
    const save = Store.saveData();
    state.obstaclesReal = document.getElementById("obstaculos").checked;
    save.sound = document.getElementById("somLigado").checked;
    state.graphics = document.getElementById("graficos").value;
    save.graphics = state.graphics;
    Store.persist();

    state.boss = null; state.bossProjectiles = []; state.bossHazards=[]; state.closing=false; state.finished=false;

    if(state.mode === "campanha"){
      const level=DATA.campaign[state.campaignIndex]; state.map=level.mapa; if(level.boss) state.boss=createBoss(level.boss);
    } else if(state.mode === "bossrush"){
      const rush = bossRushData()[state.bossRushIndex];
      state.map = rush.map;
      state.boss = createBoss(rush.type);
    } else if(state.mode === "treino" || state.mode === "tutorialmap"){
      state.map = "floresta";
    } else {
      state.map=document.getElementById("mapa").value;
    }

    hideOverlays(); state.snakes=[];
    const baseSpeed = (state.mode === "treino" || state.mode === "tutorialmap") ? 105 : Number(document.getElementById("dificuldade").value); const levelBonus = state.mode === "campanha" ? DATA.campaign[state.campaignIndex].speedBonus : 0;

    state.snakes.push(createSnake({x:W*.45,y:H*.55,angle:0,skin:save.selectedP1,controls:"wasd",speed:baseSpeed+levelBonus,isP1:true}));
    if(state.mode === "multi") state.snakes.push(createSnake({x:W*.55,y:H*.45,angle:Math.PI,skin:save.selectedP2,controls:"arrows",speed:baseSpeed,isP1:false}));

    const decorCountBase = state.mode === "campanha" ? DATA.campaign[state.campaignIndex].decoracoes : 34;
    const decorCount = state.graphics === "alto" ? decorCountBase + 12 : state.graphics === "baixo" ? Math.max(18, decorCountBase-10) : decorCountBase;
    createDecor(decorCount); applySpecialItemBoosts(); createFood(); state.powerUp=null; state.powerTimer=0; state.sessionSeconds=0; state.match.startTime=performance.now(); state.match.maxLength=120; state.particles=[]; state.waves=[]; state.floatingTexts=[]; state.confetti=[]; state.animTime=0; state.lastTime=performance.now(); state.running=false; state.paused=false; state.cameraShake=0;
    updateHUD(); drawAll();
  }


  function applySpecialItemBoosts(){
    const items = UI.consumeActiveItems ? UI.consumeActiveItems() : {};
    const p1 = state.snakes[0];

    if(!p1) return;

    if(items.escudoInicial){
      p1.shield = Math.max(p1.shield || 0, 1);
      state.floatingTexts.push({x:p1.x,y:p1.y-24,texto:"ITEM: ESCUDO",cor:"#fef08a",life:80,vy:-1});
    }

    if(items.imaInicial){
      state.effects.magnet = Math.max(state.effects.magnet || 0, 6500);
      state.floatingTexts.push({x:p1.x,y:p1.y-24,texto:"ITEM: ÍMÃ",cor:"#93c5fd",life:80,vy:-1});
    }

    if(items.moedasDobro){
      state.effects.doubleCoins = Math.max(state.effects.doubleCoins || 0, 12000);
      state.floatingTexts.push({x:p1.x,y:p1.y-24,texto:"ITEM: MOEDAS 2X",cor:"#facc15",life:80,vy:-1});
    }

    if(items.revive){
      p1.extraLives = Number(p1.extraLives || 0) + 1;
      state.floatingTexts.push({x:p1.x,y:p1.y-24,texto:"ITEM: REVIVER",cor:"#fca5a5",life:80,vy:-1});
    }

    if(items.limpaMapa){
      state.decor = state.decor.filter((_,i)=>i%2===0);
      state.floatingTexts.push({x:W/2,y:80,texto:"ITEM: MAPA LIMPO",cor:"#bbf7d0",life:80,vy:-1});
    }
  }


  function hideOverlays(){ ["menu","gameOver","pausa","comoJogar","creditos","contador","faseCompleta","loja","upgrades","conquistas","missoes","configuracoes","ranking","selecionarFase","tutorial","vitoriaEpica","modoJogo","recompensaDiaria","levelIntro","perfilJogador","desafioDiario","novidadesVersao","reportarBug","personagem","missaoSemanal","codigos"].forEach(id=>document.getElementById(id).style.display="none"); }

  function createSnake(config){
    const skin = DATA.skins[config.skin] || DATA.skins.verde; const save=Store.saveData();
    const snake = {x:config.x,y:config.y,prevX:config.x,prevY:config.y,angle:config.angle,targetAngle:config.angle,controls:config.controls,baseSpeed:config.speed,score:0,alive:true,shield:(save.upgrades&&save.upgrades.startShield>0)?1:0,turbo:0,eatAnim:0,length:120,trail:[],cor1:skin.cor1,cor2:skin.cor2,brilho:skin.brilho,skinKey:config.skin,isP1:config.isP1,extraLifeUsed:0,extraLives:(save.upgrades&&save.upgrades.extraLife)||0,headRadius:16,bodyRadius:13};
    for(let i=0;i<36;i++) snake.trail.push({x:snake.x-Math.cos(snake.angle)*i*5,y:snake.y-Math.sin(snake.angle)*i*5});
    return snake;
  }

  function createBoss(type){
    const presets = {
      tomate:{name:"Tomatão",color1:"#ef4444",color2:"#7f1d1d",seedColor:"#fef2f2",hp:6,shotInterval:820,projectiles:2,speed:120,size:38},
      pimenta:{name:"Pimentão",color1:"#f97316",color2:"#7c2d12",seedColor:"#fde68a",hp:7,shotInterval:680,projectiles:3,speed:135,size:36},
      abacate:{name:"Abacatão",color1:"#84cc16",color2:"#14532d",seedColor:"#fef3c7",hp:9,shotInterval:580,projectiles:3,speed:140,size:44}
    };
    const p = presets[type];
    return {type,name:p.name,x:W*.72,y:H*.32,vx:80,vy:55,hp:p.hp,maxHp:p.hp,inv:0,r:p.size,angry:0,attackTimer:1100,specialTimer:2600,slipperyTimer:0,phase:1,shotInterval:p.shotInterval,projectiles:p.projectiles,speed:p.speed,color1:p.color1,color2:p.color2,seedColor:p.seedColor};
  }


  function showLevelIntro(){
    const intro = document.getElementById("levelIntro");
    const title = document.getElementById("levelIntroTitle");
    const info = document.getElementById("levelIntroInfo");
    const badge = document.getElementById("levelIntroBadge");

    let name = "Modo Livre";
    let meta = "Coma o máximo de abacates que conseguir.";
    let tip = "Desvie dos obstáculos e use poderes.";

    if(state.mode === "treino"){
      name = "🎯 Modo Treino";
      meta = "Treine sem morrer e aprenda o controle.";
      tip = "Neste modo, colisões não encerram a partida.";
    }

    if(state.mode === "tutorialmap"){
      name = "🎓 Tutorial Jogável";
      meta = "Coma abacates, teste power-ups e bata em obstáculos sem perder.";
      tip = "Use WASD ou joystick. O objetivo é aprender os comandos dentro do mapa.";
    }

    if(state.mode === "infinito"){
      name = "♾️ Modo Infinito";
      meta = "Sobreviva o máximo possível.";
      tip = "A velocidade aumenta com o tempo e os obstáculos ficam mais perigosos.";
    }

    if(state.mode === "bossrush"){
      const rush = bossRushData()[state.bossRushIndex];
      name = `⚔️ Boss Rush: ${rush.name}`;
      meta = "Derrote todos os chefões em sequência.";
      tip = "Use escudo, ímã e tempo lento para sobreviver.";
    }

    if(state.mode === "multi"){
      name = "Duelo Multiplayer";
      meta = `Primeiro a comer ${DATA.metaMulti} pontos vence.`;
      tip = "Player 1 usa WASD e Player 2 usa as setas.";
    }

    if(state.mode === "campanha"){
      const level = DATA.campaign[state.campaignIndex];
      name = `${level.icon || "🗺️"} ${level.nome}`;
      meta = level.boss ? `Objetivo: derrotar ${level.boss}.` : `Objetivo: comer ${level.meta} pontos.`;
      tip = mapTip(level.mapa, level.boss);
    }

    if(state.mode === "single"){
      name = mapDisplayName(state.map);
      tip = mapTip(state.map, null);
    }

    title.textContent = name;
    info.innerHTML = `${meta}<br><br>${tip}`;
    badge.textContent = state.mode === "campanha" ? "Campanha" :
      state.mode === "multi" ? "Duelo" :
      state.mode === "treino" ? "Sem morte" :
      state.mode === "tutorialmap" ? "Aprendizado" :
      "Boa sorte!";

    intro.style.display = "block";
    UI.setBody("menu-aberto");

    setTimeout(()=>{
      intro.style.display = "none";
      countdown();
    }, 1500);
  }

  function mapDisplayName(map){
    const names = {
      floresta:"🌳 Floresta Realista",
      gelo:"❄️ Vale Congelado",
      noite:"🌙 Campo Noturno",
      pantano:"🐸 Pântano Verde",
      cidade:"🏙️ Cidade",
      deserto:"🏜️ Deserto",
      vulcao:"🌋 Vulcão"
    };
    return names[map] || "Mapa";
  }

  function mapTip(map,boss){
    if(boss === "tomate") return "Tomatão usa rajadas rápidas. Fique em movimento.";
    if(boss === "pimenta") return "Pimentão deixa o mapa escorregadio. Evite virar em cima da hora.";
    if(boss === "abacate") return "Abacatão solta explosões circulares. Guarde distância.";
    if(map === "gelo") return "No gelo a cobra vira mais devagar, então planeje as curvas.";
    if(map === "pantano") return "No pântano, poças reduzem a velocidade.";
    if(map === "vulcao") return "No vulcão, lava e pedras são perigosas.";
    if(map === "deserto") return "No deserto, o vento empurra a cobra levemente.";
    if(map === "cidade") return "Na cidade, os obstáculos deixam os corredores mais apertados.";
    if(map === "noite") return "Na noite, use os vaga-lumes como referência visual.";
    return "A floresta é equilibrada, mas as árvores ainda são perigosas.";
  }

  function countdown(){
    const tela=document.getElementById("contador"); tela.style.display="block"; let n=3; tela.textContent=n; Sound.tone(500,.1);
    const timer=setInterval(()=>{ n--; if(n>0){ tela.textContent=n; Sound.tone(500,.1); } else if(n===0){ tela.textContent="VAI!"; Sound.tone(900,.16); } else { clearInterval(timer); tela.style.display="none"; state.running=true; state.paused=false; state.lastTime=performance.now(); Sound.music(); UI.setBody("jogando"); requestAnimationFrame(loop); } }, 800);
  }

  function loop(time){
    if(!state.running) return;
    if(state.paused){ drawAll(); requestAnimationFrame(loop); return; }
    const dt=Math.min((time-state.lastTime)/1000,.05); state.lastTime=time; state.animTime += dt*1000;
    state.sessionSeconds += dt;
    updateControls(); updateEffectTimers(dt);
    if(!state.closing){ updateSnakes(dt); updateBoss(dt); updateBossProjectiles(dt); updateBossHazards(dt); updatePowerUps(dt); }
    updateEffects(); drawAll(); requestAnimationFrame(loop);
  }

  function updateEffectTimers(dt){
    if(state.effects.magnet>0) state.effects.magnet=Math.max(0,state.effects.magnet-dt*1000);
    if(state.effects.slow>0) state.effects.slow=Math.max(0,state.effects.slow-dt*1000);
    if(state.effects.doubleCoins>0) state.effects.doubleCoins=Math.max(0,state.effects.doubleCoins-dt*1000);
    if(state.effects.freeze>0) state.effects.freeze=Math.max(0,state.effects.freeze-dt*1000);
    if(state.effects.ghost>0) state.effects.ghost=Math.max(0,state.effects.ghost-dt*1000);
    if(state.effects.mini>0) state.effects.mini=Math.max(0,state.effects.mini-dt*1000);
    state.cameraShake=Math.max(0,state.cameraShake-dt*1000);
  }

  function updateControls(){
    state.snakes.forEach(s=>{ if(!s.alive) return; if(s.controls==="wasd"){ if(keys["w"]) s.targetAngle=-Math.PI/2; if(keys["s"]) s.targetAngle=Math.PI/2; if(keys["a"]) s.targetAngle=Math.PI; if(keys["d"]) s.targetAngle=0; } if(s.controls==="arrows"){ if(keys["arrowup"]) s.targetAngle=-Math.PI/2; if(keys["arrowdown"]) s.targetAngle=Math.PI/2; if(keys["arrowleft"]) s.targetAngle=Math.PI; if(keys["arrowright"]) s.targetAngle=0; } });
  }
  function setDirection(snake, dir){ if(dir==="up") snake.targetAngle=-Math.PI/2; if(dir==="down") snake.targetAngle=Math.PI/2; if(dir==="left") snake.targetAngle=Math.PI; if(dir==="right") snake.targetAngle=0; }

  function updateSnakes(dt){
    state.snakes.forEach(s=>{
      if(!s.alive) return;
      turnSmooth(s,dt);

      let velocity = s.baseSpeed + (s.turbo>0 ? 60 : 0);
      if(state.mode === "infinito") velocity += Math.min(90, state.animTime / 900);
      if(state.boss && state.boss.slipperyTimer > 0) velocity *= 1.08;
      if(state.map === "pantano" && isNearType(s.x,s.y,"lago",42)) velocity *= 0.62;
      if(state.map === "cidade") velocity *= 0.96;
      if(state.effects.slow>0) velocity *= 0.88;
      if(state.effects.ghost>0) velocity *= 1.10;

      const steps = Math.max(1, Math.ceil((velocity * dt) / 5.5));
      const stepDt = dt / steps;

      for(let step=0; step<steps; step++){
        if(!s.alive || state.closing) break;

        s.prevX = s.x;
        s.prevY = s.y;

        s.x += Math.cos(s.angle) * velocity * stepDt;
        s.y += Math.sin(s.angle) * velocity * stepDt;

        if(state.map === "deserto"){
          s.x += Math.sin(state.animTime/600) * 18 * stepDt;
        }

        s.trail.unshift({x:s.x,y:s.y});
        trimTrail(s);

        if(checkCollisions(s)) break;
        checkFood(s);
        checkPowerUp(s);
        checkBossHit(s);
      }

      spawnSkinParticles(s);

      if(s.eatAnim>0) s.eatAnim=Math.max(0,s.eatAnim-dt*1000);
      if(s.turbo>0) s.turbo=Math.max(0,s.turbo-dt*1000);
      s.headRadius = state.effects.mini>0 ? 10 : 16;
      s.bodyRadius = state.effects.mini>0 ? 8 : 13;

      if(state.effects.magnet>0 && state.food){
        const ang=Math.atan2(s.y-state.food.y,s.x-state.food.x);
        state.food.x += Math.cos(ang)*40*dt;
        state.food.y += Math.sin(ang)*40*dt;
      }
    });
    updateHUD();
  }

  function turnSmooth(s, dt){ 
    let diff=normalizeAngle(s.targetAngle-s.angle); 
    let turnRate = 8;
    if(state.map === "gelo") turnRate = 5.2;
    if(state.boss && state.boss.slipperyTimer > 0) turnRate = 4.8;
    const maxTurn=turnRate*dt; 
    if(Math.abs(diff)<maxTurn) s.angle=s.targetAngle; 
    else s.angle += Math.sign(diff)*maxTurn; 
  }
  function normalizeAngle(a){ while(a>Math.PI) a -= Math.PI*2; while(a<-Math.PI) a += Math.PI*2; return a; }
  function trimTrail(s){ let distance=0; for(let i=1;i<s.trail.length;i++){ distance += dist(s.trail[i-1],s.trail[i]); if(distance>s.length){ s.trail.length=i+1; return; } } }

  function spawnSkinParticles(s){
    if(state.graphics === "baixo") return; if(Math.random() > (state.graphics==="alto" ? .34 : .2)) return; const x=s.x-Math.cos(s.angle)*18, y=s.y-Math.sin(s.angle)*18;
    const make = cor => state.particles.push({x,y,vx:(Math.random()-.5)*2,vy:(Math.random()-.5)*2,life:18+Math.random()*10,cor,size:2+Math.random()*2});
    if(s.skinKey==="fogo") make("#fb923c"); if(s.skinKey==="branca") make("#e0f2fe"); if(s.skinKey==="ouro") make("#fde047"); if(s.skinKey==="abacate") make("#84cc16"); if(s.skinKey==="neon") make("#22d3ee"); if(s.skinKey==="pantano") make("#6b8e23");
  }

  function checkCollisions(s){
    if(!state.running || state.closing) return false;

    const moveA = {x:s.prevX ?? s.x, y:s.prevY ?? s.y};
    const moveB = {x:s.x, y:s.y};
    const hitRadius = s.headRadius || 16;

    if(s.x < hitRadius || s.y < hitRadius || s.x > W-hitRadius || s.y > H-hitRadius){
      dieOrShield(s,'Borda do mapa');
      return true;
    }

    if(state.obstaclesReal && state.effects.ghost<=0){
      for(const d of state.decor){
        if(d.block && pointToSegmentDistance(d, moveA, moveB) < d.hit + hitRadius - 4){
          dieOrShield(s,'Obstáculo');
          return true;
        }
      }
    }

    if(state.effects.ghost<=0){
      for(const hz of state.bossHazards || []){
        if(pointToSegmentDistance(hz, moveA, moveB) < hz.r + hitRadius - 4){
          dieOrShield(s,hz.label || 'Área perigosa');
          return true;
        }
      }
    }

    if(state.effects.ghost<=0) for(const other of state.snakes){
      if(!other.alive) continue;
      if(snakeHitsBody(moveA, moveB, s, other)){
        dieOrShield(s,'Corpo da cobra');
        return true;
      }
    }

    if(state.snakes.length > 1){
      const other = state.snakes.find(o=>o!==s && o.alive);
      if(other && dist({x:s.x,y:s.y},{x:other.x,y:other.y}) < (hitRadius + (other.headRadius||16) - 4)){
        dieOrShield(s);
        dieOrShield(other);
        return true;
      }
    }

    return false;
  }

  function snakeHitsBody(moveA, moveB, snake, other){
    const pts = sampleSnake(other, 6);
    if(pts.length < 3) return false;

    let bodyDistanceFromHead = 0;

    for(let i=1;i<pts.length;i++){
      const segA = pts[i-1];
      const segB = pts[i];
      bodyDistanceFromHead += dist(segA, segB);

      // Ignora uma distância segura atrás da cabeça para não morrer instantaneamente ao virar.
      if(other === snake && bodyDistanceFromHead < 58) continue;

      const gap = segmentToSegmentDistance(moveA, moveB, segA, segB);
      const radius = (snake.headRadius || 16) + (other.bodyRadius || 13) - 7;

      if(gap < radius) return true;
    }

    return false;
  }

  function pointToSegmentDistance(p, a, b){
    const abx = b.x-a.x;
    const aby = b.y-a.y;
    const lenSq = abx*abx + aby*aby || 1;

    let t = ((p.x-a.x)*abx + (p.y-a.y)*aby) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const x = a.x + abx*t;
    const y = a.y + aby*t;

    return Math.hypot(p.x-x, p.y-y);
  }

  function segmentToSegmentDistance(a,b,c,d){
    if(segmentsIntersect(a,b,c,d)) return 0;

    return Math.min(
      pointToSegmentDistance(a,c,d),
      pointToSegmentDistance(b,c,d),
      pointToSegmentDistance(c,a,b),
      pointToSegmentDistance(d,a,b)
    );
  }

  function segmentsIntersect(a,b,c,d){
    const orient = (p,q,r) => (q.x-p.x)*(r.y-p.y) - (q.y-p.y)*(r.x-p.x);
    const o1 = orient(a,b,c);
    const o2 = orient(a,b,d);
    const o3 = orient(c,d,a);
    const o4 = orient(c,d,b);

    return (o1*o2 < 0) && (o3*o4 < 0);
  }

  function dieOrShield(s,reason='Colisão'){
    if(!state.running || state.closing) return;

    if(state.mode === "treino" || state.mode === "tutorialmap"){
      state.match.deathReason = "Treino sem morte";
      s.shield = 1;
      s.x = W*.5;
      s.y = H*.5;
      s.prevX = s.x;
      s.prevY = s.y;
      s.trail = [];
      for(let i=0;i<28;i++) s.trail.push({x:s.x-i*5,y:s.y});
      state.floatingTexts.push({x:s.x,y:s.y-20,texto:"TREINO: SEM MORTE",cor:"#fef08a",life:70,vy:-1.1});
      Sound.power();
      return;
    }
    if(s.shield>0){ s.shield=0; Sound.power(); createParticles(s.x,s.y,"#fef08a"); state.waves.push({x:s.x,y:s.y,r:8,life:28,cor:"rgba(254,240,138,.85)"}); s.x-=Math.cos(s.angle)*24; s.y-=Math.sin(s.angle)*24; return; }
    if(s.extraLives>0 && s.extraLifeUsed < s.extraLives){ s.extraLifeUsed++; s.shield=1; s.x=W*.5; s.y=H*.5; s.trail=[{x:s.x,y:s.y}]; for(let i=1;i<28;i++) s.trail.push({x:s.x-i*5,y:s.y}); state.floatingTexts.push({x:s.x,y:s.y-16,texto:"VIDA EXTRA!",cor:"#fca5a5",life:55,vy:-1.1}); Sound.power(); return; }
    state.match.died=true; state.match.deathReason=reason; state.closing=true; s.alive=false; deathExplosion(s); Sound.lose(); setTimeout(()=>finish(false),700);
  }

  function deathExplosion(s){ const points=sampleSnake(s,12); points.forEach((p,i)=>{ for(let j=0;j<3;j++) state.particles.push({x:p.x,y:p.y,vx:(Math.random()-.5)*7,vy:(Math.random()-.5)*7,life:35+Math.random()*25,cor:i%2===0?s.cor1:s.cor2,size:2+Math.random()*2}); }); state.waves.push({x:s.x,y:s.y,r:12,life:42,cor:"rgba(239,68,68,.85)"}); state.floatingTexts.push({x:s.x,y:s.y-18,texto:"BOOM!",cor:"#fecaca",life:55,vy:-1.1}); }

  function coinMultiplier(){ return 1 + upgradeLevel("coinMult") * .25; }
  function goldenChance(){ return .13 + upgradeLevel("goldenLuck") * .04; }
  function magnetDuration(){ return 4200 + upgradeLevel("magnetTime") * 1200; }
  function slowDuration(){ return 3500 + upgradeLevel("slowTime") * 1200; }
  function upgradeLevel(key){
    const save = Store.saveData();
    if(!save.upgrades) save.upgrades = {};
    return Number(save.upgrades[key] || 0);
  }


  function checkFood(s){
    if(!state.food || !state.running || state.closing) return;
    if(dist({x:s.x,y:s.y}, state.food) < 24){
      const basePoints = state.food.gold ? 3 : 1; const save=Store.saveData(); const doubleActive = state.effects.doubleCoins>0; const coinGain = Math.max(1, Math.round(basePoints * coinMultiplier() * (doubleActive?2:1)));
      s.score += basePoints; s.length += state.food.gold ? 48 : 24; state.match.maxLength = Math.max(state.match.maxLength || 0, Math.round(s.length)); s.eatAnim=280; state.match.totalPoints += basePoints; save.moedas += coinGain; state.match.coinsEarned += coinGain; save.stats.totalAvocados += 1;
      UI.updateMission("abacates",1,true); 
      UI.updateMission("maxScore",s.score,false);
      UI.updateDailyChallenge("avocados",1,true);
      UI.updateDailyChallenge("score",s.score,true);
      UI.updateWeeklyMission("avocados",1,false);
      UI.updateWeeklyMission("score",basePoints,false);
      UI.addXP(basePoints * 2, "Abacate");
      if(state.mode === "infinito"){ UI.updateDailyChallenge("infinite",s.score,true); UI.updateWeeklyMission("infinite",s.score,true); } if(state.match.totalPoints>=1) UI.unlockAchievement("primeiroAbacate"); if(s.score>=10) UI.unlockAchievement("dezPontos");
      if(state.food.gold){ state.match.golden++; save.stats.totalGolden += 1; }
      Store.persist(); if(state.mode === "campanha") state.campaignTotal += basePoints; Sound.eat(); eatEffect(state.food.x,state.food.y,state.food.gold,basePoints,coinGain,doubleActive); createFood();
      if(state.mode === "tutorialmap"){
        const hints = ["Boa! Agora tente pegar um power-up.", "Repare no HUD: escudo e moedas aparecem ali.", "Se bater, você volta para o centro porque é tutorial.", "Tutorial completo! Continue treinando ou volte ao menu."];
        const h = hints[Math.min(s.score-1, hints.length-1)];
        state.floatingTexts.push({x:W/2,y:70,texto:h,cor:"#fef08a",life:120,vy:-.35});
      }
      if(state.mode === "multi" && s.score >= DATA.metaMulti){ finish(true); return; }
      if(state.mode === "campanha" && !state.boss){ const meta=DATA.campaign[state.campaignIndex].meta; if(s.score >= meta) completeLevel(); }
    }
  }

  function checkPowerUp(s){
    if(!state.powerUp || !state.running || state.closing) return false;

    const moveA = {x:s.prevX ?? s.x, y:s.prevY ?? s.y};
    const moveB = {x:s.x, y:s.y};
    const collectRadius = (s.headRadius || 16) + 14;

    if(pointToSegmentDistance(state.powerUp, moveA, moveB) <= collectRadius){
      const tipo = state.powerUp.tipo;
      const px = state.powerUp.x;
      const py = state.powerUp.y;

      applyPower(s, tipo);

      createParticles(px,py,"#fef08a");
      state.waves.push({x:px,y:py,r:8,life:28,cor:"rgba(254,240,138,.8)"});
      state.powerUp=null;
      state.powerTimer=0;

      Sound.power();
      return true;
    }

    return false;
  }

  function applyPower(s,tipo){
    state.match.powerUps = (state.match.powerUps || 0) + 1;
    const powerNames = {
      escudo:"ESCUDO ATIVO",
      pimenta:"PIMENTA NO RIVAL",
      magnet:"ÍMÃ ATIVO",
      slow:"TEMPO LENTO",
      double:"MOEDAS 2X",
      freeze:"CONGELAR",
      ghost:"FANTASMA",
      mini:"MINI COBRA",
      heart:"VIDA EXTRA",
      mega:"MEGA ABACATE"
    };

    if(tipo==="escudo"){
      s.shield = Math.max(s.shield || 0, 1);
    }

    if(tipo==="pimenta"){
      state.snakes.forEach(o=>{ if(o!==s) o.turbo=3000; });
      if(state.snakes.length === 1) s.turbo = 1200;
    }

    if(tipo==="magnet"){
      state.effects.magnet = Math.max(state.effects.magnet || 0, magnetDuration());
    }

    if(tipo==="slow"){
      state.effects.slow = Math.max(state.effects.slow || 0, slowDuration());
    }

    if(tipo==="double"){
      // Antes era pouco visível; agora dura mais e aparece no texto dos ganhos.
      state.effects.doubleCoins = Math.max(state.effects.doubleCoins || 0, 10000);
    }

    if(tipo==="freeze"){
      state.effects.freeze = Math.max(state.effects.freeze || 0, 4200);
    }

    if(tipo==="ghost"){
      state.effects.ghost = Math.max(state.effects.ghost || 0, 5200);
    }

    if(tipo==="mini"){
      state.effects.mini = Math.max(state.effects.mini || 0, 6200);
      s.length = Math.max(90, s.length - 70);
    }

    if(tipo==="heart"){
      s.extraLives = Number(s.extraLives || 0) + 1;
      s.shield = Math.max(s.shield || 0, 1);
    }

    if(tipo==="mega"){
      const save = Store.saveData();
      const points = 6;
      const coins = Math.round(8 * coinMultiplier() * (state.effects.doubleCoins>0?2:1));
      s.score += points;
      s.length += 50;
      state.match.totalPoints += points;
      state.match.coinsEarned += coins;
      state.match.maxLength = Math.max(state.match.maxLength || 0, Math.round(s.length));
      save.moedas += coins;
      Store.persist();
      UI.addXP(20, "Mega Abacate");
    }


    state.floatingTexts.push({
      x:s.x,
      y:s.y-18,
      texto:powerNames[tipo] || tipo.toUpperCase(),
      cor: tipo==="double" ? "#facc15" : "#fde047",
      life:70,
      vy:-1.1
    });
  }

  function updateBoss(dt){
    const boss=state.boss; if(!boss||!state.running||state.closing) return;
    if(state.effects.freeze>0){ boss.angry=200; return; }
    boss.inv=Math.max(0,boss.inv-dt*1000); 
    boss.angry=Math.max(0,boss.angry-dt*1000); 
    boss.attackTimer -= dt*1000;
    boss.specialTimer -= dt*1000;
    boss.slipperyTimer = Math.max(0, boss.slipperyTimer - dt*1000);
    const hpPct=boss.hp/boss.maxHp; boss.phase = hpPct>.66 ? 1 : hpPct>.33 ? 2 : 3;
    const p=state.snakes[0]; let speedMult = boss.phase===1 ? 1 : boss.phase===2 ? 1.25 : 1.55; if(state.effects.slow>0) speedMult *= .74;
    if(p && p.alive){ const dx=boss.x-p.x, dy=boss.y-p.y, d=Math.hypot(dx,dy)||1; const force = boss.type==="tomate" ? 70 : boss.type==="pimenta" ? 88 : 95; if(d<250){ boss.vx += (dx/d) * force * dt; boss.vy += (dy/d) * force * dt; } }
    boss.vx += Math.sin(state.animTime/500) * 12 * dt; boss.vy += Math.cos(state.animTime/600) * 12 * dt; const limit=boss.speed*speedMult; boss.vx=Math.max(-limit,Math.min(limit,boss.vx)); boss.vy=Math.max(-limit,Math.min(limit,boss.vy)); boss.x += boss.vx*dt; boss.y += boss.vy*dt;
    if(boss.x<60){boss.x=60; boss.vx=Math.abs(boss.vx);} if(boss.x>W-60){boss.x=W-60; boss.vx=-Math.abs(boss.vx);} if(boss.y<60){boss.y=60; boss.vy=Math.abs(boss.vy);} if(boss.y>H-60){boss.y=H-60; boss.vy=-Math.abs(boss.vy);}
    const interval = boss.shotInterval * (boss.phase===3 ? .75 : boss.phase===2 ? .9 : 1); 
    if(boss.attackTimer <= 0){ bossShoot(); boss.attackTimer = interval; }
    if(boss.specialTimer <= 0){
      bossSpecialAttack();
      boss.specialTimer = boss.phase === 3 ? 2800 : 4200;
    }
  }


  function bossSpecialAttack(){
    const boss = state.boss;
    const target = state.snakes[0];
    if(!boss || !target || !target.alive) return;

    state.cameraShake = 450;

    if(boss.type === "tomate"){
      const dashA = Math.atan2(target.y-boss.y,target.x-boss.x);
      boss.vx += Math.cos(dashA) * (boss.phase===3?160:105);
      boss.vy += Math.sin(dashA) * (boss.phase===3?160:105);
      state.floatingTexts.push({x:boss.x,y:boss.y-55,texto:"RAJADA + INVESTIDA!",cor:"#fecaca",life:55,vy:-1.1});
      for(let wave=0; wave<3; wave++){
        setTimeout(()=>{
          if(!state.boss) return;
          for(let i=0;i<5;i++){
            const a = Math.atan2(target.y-boss.y,target.x-boss.x) + (i-2)*0.18;
            state.bossProjectiles.push({
              x:boss.x,y:boss.y,
              vx:Math.cos(a)*210,
              vy:Math.sin(a)*210,
              life:1900,
              r:6,
              color:boss.seedColor
            });
          }
        }, wave*160);
      }
    }

    if(boss.type === "pimenta"){
      boss.slipperyTimer = 3600;
      state.floatingTexts.push({x:boss.x,y:boss.y-55,texto:"ZONA DE FOGO!",cor:"#fed7aa",life:70,vy:-1.1});
      state.waves.push({x:boss.x,y:boss.y,r:20,life:50,cor:"rgba(249,115,22,.85)"});
      const total = boss.phase===3 ? 5 : 3;
      for(let i=0;i<total;i++){
        const a = (Math.PI*2/total)*i + state.animTime/700;
        state.bossHazards.push({
          x:boss.x + Math.cos(a)*90,
          y:boss.y + Math.sin(a)*90,
          r:26,
          life:4200,
          color:"rgba(249,115,22,.38)",
          label:"Fogo do Pimentão"
        });
      }
    }

    if(boss.type === "abacate"){
      state.floatingTexts.push({x:boss.x,y:boss.y-55,texto:"EXPLOSÃO!",cor:"#fef3c7",life:70,vy:-1.1});
      const total = boss.phase === 3 ? 18 : 12;
      for(let i=0;i<total;i++){
        const a = (Math.PI*2/total)*i;
        state.bossProjectiles.push({
          x:boss.x,y:boss.y,
          vx:Math.cos(a)*165,
          vy:Math.sin(a)*165,
          life:2600,
          r:8,
          color:boss.seedColor
        });
      }
      state.waves.push({x:boss.x,y:boss.y,r:28,life:60,cor:"rgba(132,204,22,.75)"});
      if(boss.phase >= 2){
        for(let i=0;i<(boss.phase===3?3:2);i++){
          let d={x:60+Math.random()*(W-120), y:60+Math.random()*(H-120), tipo:"pedra", block:true, hit:22};
          if(safeArea(d.x,d.y) && !occupied(d.x,d.y)) state.decor.push(d);
        }
        state.floatingTexts.push({x:boss.x,y:boss.y-80,texto:"OBSTÁCULOS INVOCADOS!",cor:"#d9f99d",life:55,vy:-1});
      }
    }

    Sound.boss();
  }

  function bossShoot(){
    const boss=state.boss, target=state.snakes[0]; if(!boss||!target||!target.alive) return; const ang=Math.atan2(target.y-boss.y,target.x-boss.x); const amount = boss.projectiles + (boss.phase===3 ? 1 : 0);
    for(let i=0;i<amount;i++){ const spread=(i-(amount-1)/2)*.28; const a=ang+spread; let speed = boss.type==="tomate" ? 160 : boss.type==="pimenta" ? 185 : 175; if(state.effects.slow>0) speed *= .72; state.bossProjectiles.push({x:boss.x,y:boss.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:2600,r: boss.type==="abacate" ? 8 : 7,color: boss.seedColor}); }
    Sound.tone(180,.08,"sawtooth",.09);
  }

  function updateBossProjectiles(dt){
    if(state.effects.freeze>0) return;
    state.bossProjectiles.forEach(pr=>{ pr.x += pr.vx*dt; pr.y += pr.vy*dt; pr.life -= dt*1000; state.snakes.forEach(s=>{ if(!s.alive||state.closing||state.effects.ghost>0) return; if(dist({x:s.x,y:s.y}, pr) < pr.r+14){ pr.life=0; createParticles(pr.x,pr.y,pr.color); dieOrShield(s); } }); });
    state.bossProjectiles = state.bossProjectiles.filter(pr=>pr.life>0 && pr.x>-30 && pr.y>-30 && pr.x<W+30 && pr.y<H+30);
  }

  function checkBossHit(s){
    const boss=state.boss; if(!boss||!state.running||state.closing) return;
    if(dist({x:s.x,y:s.y}, boss) < boss.r+18 && boss.inv<=0){
      const save=Store.saveData(); boss.hp--; boss.inv=850; boss.angry=850; s.score += 5; s.length += 30; s.eatAnim=320; state.campaignTotal += 5; save.moedas += Math.round(5 * coinMultiplier()); UI.updateMission("maxScore",s.score,false); Store.persist(); Sound.boss(); createParticles(boss.x,boss.y,boss.color1); createParticles(boss.x,boss.y,boss.seedColor); state.waves.push({x:boss.x,y:boss.y,r:20,life:36,cor:"rgba(250,204,21,.85)"}); state.floatingTexts.push({x:boss.x,y:boss.y-50,texto:`${boss.name} -1`,cor:"#fde047",life:55,vy:-1.1}); s.x-=Math.cos(s.angle)*30; s.y-=Math.sin(s.angle)*30; boss.vx*=-1.25; boss.vy*=-1.25; state.cameraShake=250;
      if(boss.hp<=0){ 
        state.boss=null; 
        state.bossProjectiles=[]; 
        UI.unlockAchievement("derrotouBoss"); 
        UI.updateMission("bossKills",1,true); 
        UI.updateDailyChallenge("boss",1,true);
        UI.updateWeeklyMission("boss",1,false);
        UI.addXP(50, "Boss derrotado");
        save.stats.bossKills += 1; 
        Store.persist(); 
        if(state.mode === "bossrush"){ nextBossRush(); }
        else if(state.campaignIndex === DATA.campaign.length-1) finishCampaign(); 
        else completeLevel(); 
      }
    }
  }


  function updateBossHazards(dt){
    if(state.effects.freeze>0) return;

    state.bossHazards = (state.bossHazards || []).filter(hz=>{
      hz.life -= dt*1000;
      hz.pulse = (hz.pulse || 0) + dt*1000;

      state.snakes.forEach(s=>{
        if(!s.alive || state.closing || state.effects.ghost>0) return;
        if(dist({x:s.x,y:s.y}, hz) < hz.r + (s.headRadius || 16) - 4){
          dieOrShield(s, hz.label || "Área perigosa");
          hz.life = Math.min(hz.life, 180);
        }
      });

      return hz.life > 0;
    });
  }


  function updatePowerUps(dt){ 
    state.powerTimer += dt*1000; 
    const dificuldade = Number(document.getElementById("dificuldade").value || 135);
    let interval = state.mode === "infinito" ? 5200 : 6500;

    if(dificuldade <= 105) interval = 4800;
    if(dificuldade >= 170) interval = 7600;
    if(dificuldade >= 205) interval = 9000;

    if(!state.powerUp && state.powerTimer > interval){
      createPowerUp();
      state.powerTimer=0;
    }

    if(state.mode === "infinito" && state.graphics !== "baixo" && Math.floor(state.animTime) % 9000 < 40 && state.decor.length < 70){
      const oldLen = state.decor.length;
      createExtraObstacle();
      if(state.decor.length > oldLen) state.floatingTexts.push({x:W/2,y:50,texto:"PERIGO +",cor:"#fde047",life:40,vy:-.6});
    }
  }

  function createExtraObstacle(){
    let attempts=0;
    while(attempts++ < 80){
      const d={x:45+Math.random()*(W-90),y:45+Math.random()*(H-90),tipo:"pedra",block:true,hit:22};
      if(state.map==="deserto") d.tipo="cacto";
      if(state.map==="gelo") d.tipo="cristal";
      if(state.map==="cidade") d.tipo="poste";
      if(state.map==="pantano"){ d.tipo="lago"; d.block=false; d.hit=34; }
      if(state.map==="vulcao") d.tipo="lava";
      if(safeArea(d.x,d.y) && !occupied(d.x,d.y)){ state.decor.push(d); return; }
    }
  }


  function bossRushData(){
    return [
      {type:"tomate",map:"cidade",name:"Tomatão"},
      {type:"pimenta",map:"vulcao",name:"Pimentão"},
      {type:"abacate",map:"floresta",name:"Abacatão"}
    ];
  }

  function nextBossRush(){
    state.bossRushIndex++;
    if(state.bossRushIndex >= bossRushData().length){
      finishBossRush();
      return;
    }

    const rush = bossRushData()[state.bossRushIndex];
    state.map = rush.map;
    state.boss = createBoss(rush.type);
    state.bossProjectiles = [];
    state.bossHazards = [];
    createDecor(30);
    createFood();

    state.floatingTexts.push({
      x:W/2,
      y:80,
      texto:`${rush.name} apareceu!`,
      cor:"#fde047",
      life:80,
      vy:-.4
    });

    Sound.win();
  }


  function formatTime(seconds){
    seconds = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(seconds/60);
    const s = seconds%60;
    return `${m}:${String(s).padStart(2,"0")}`;
  }

  function matchStatsHTML(){
    const duration = Math.floor(state.sessionSeconds || ((performance.now() - (state.match.startTime || performance.now()))/1000));
    return `
      <div class="match-stat-item">⏱️ Tempo<b>${formatTime(duration)}</b></div>
      <div class="match-stat-item">🪙 Moedas ganhas<b>${state.match.coinsEarned || 0}</b></div>
      <div class="match-stat-item">⚡ Power-ups usados<b>${state.match.powerUps || 0}</b></div>
      <div class="match-stat-item">🌟 Dourados<b>${state.match.golden || 0}</b></div>
      <div class="match-stat-item">📏 Maior tamanho<b>${state.match.maxLength || 0}</b></div>
      <div class="match-stat-item">💀 Motivo<b>${state.match.deathReason || "-"}</b></div>
    `;
  }

  function renderMatchStats(targetId="matchStats"){
    const el = document.getElementById(targetId);
    if(el) el.innerHTML = matchStatsHTML();
  }


  function finishBossRush(){
    if(state.finished) return;

    const save = Store.saveData();
    const score = state.snakes[0]?.score || state.campaignTotal || 0;

    if(score > save.stats.bestBossRush) save.stats.bestBossRush = score;
    UI.addXP(120, "Boss Rush concluído");
    save.stats.gamesPlayed += 1;
    save.stats.playSeconds += Math.floor(state.sessionSeconds || 0);

    UI.recordScore("bossrush", score, {coins:state.match.coinsEarned,time:state.sessionSeconds});
    Store.persist();

    state.running=false;
    state.finished=true;
    Sound.stopMusic();
    UI.setBody("menu-aberto");

    document.getElementById("gameOverTitulo").textContent = "⚔️ Boss Rush concluído!";
    document.getElementById("gameOverTexto").textContent = `Você derrotou todos os bosses com ${score} pontos.`;
    document.getElementById("vencedorBadge").textContent = "Lenda dos bosses";
    document.getElementById("finalP1").textContent = score;
    document.getElementById("finalP2").textContent = "-";
    document.getElementById("finalTotal").textContent = score;
    document.getElementById("finalRecorde").textContent = save.recorde;
    const tipEl=document.getElementById("gameTip"); if(tipEl) tipEl.textContent="Mandou muito! Tente fazer mais pontos no Boss Rush usando itens especiais.";

    renderMatchStats("matchStats");

    document.getElementById("gameOver").style.display = "block";

    Sound.win();
    createConfetti();
    animateConfetti();
  }

  function completeLevel(){
    state.running=false;
    Sound.stopMusic();
    UI.setBody("menu-aberto");

    const level=DATA.campaign[state.campaignIndex];
    const next=DATA.campaign[state.campaignIndex+1];

    let stars = 1;
    const score = state.snakes[0]?.score || state.campaignTotal || 0;
    const meta = level.meta || score;

    if(!state.match.died) stars = 2;
    if(level.boss || score >= Math.ceil(meta * 1.35)) stars = 3;

    UI.setLevelStars(state.campaignIndex, stars);
    UI.unlockLevel(state.campaignIndex+1);
    UI.addXP(25 + stars*15, "Fase concluída");

    document.getElementById("faseTexto").textContent=`Você concluiu ${level.nome} com ${score} ponto(s) e ${stars} estrela(s).`;
    document.getElementById("proximaFaseTexto").textContent = next ? next.nome : "Final da campanha";

    if(next && !state.levelSelectMode){
      document.getElementById("faseCompleta").style.display="block";
      Sound.win();
      createConfetti();
      animateConfetti();
    }
    else if(next && state.levelSelectMode){
      finish(false,true);
    }
    else finishCampaign();
  }

  function nextCampaignLevel(){ state.campaignIndex++; document.getElementById("faseCompleta").style.display="none"; setupGame(); showLevelIntro(); }

  function finishCampaign(){
    if(state.finished) return; const save=Store.saveData(); state.running=false; state.closing=false; state.finished=true; Sound.stopMusic(); UI.setBody("menu-aberto"); UI.unlockAchievement("zerouCampanha"); UI.setLevelStars(state.campaignIndex,3); UI.addXP(150, "Campanha concluída");
    if(state.campaignTotal > save.recorde) save.recorde = state.campaignTotal; if(state.campaignTotal > save.stats.bestCampaign) save.stats.bestCampaign = state.campaignTotal; save.stats.gamesPlayed += 1; save.stats.playSeconds += Math.floor(state.sessionSeconds || 0); UI.recordScore("campanha", state.campaignTotal, {coins:state.match.coinsEarned,time:state.sessionSeconds}); Store.persist();
    UI.refreshMoney(); UI.renderMissions(); UI.renderRanking();
    document.getElementById("vitoriaTexto").textContent = `Você derrotou o Abacatão e terminou a campanha com ${state.campaignTotal} ponto(s)!`;
    document.getElementById("epicScore").textContent = state.campaignTotal; renderMatchStats("epicMatchStats"); document.getElementById("epicCoins").textContent = Store.saveData().moedas; document.getElementById("epicBosses").textContent = Store.saveData().stats.bossKills; document.getElementById("epicRecord").textContent = save.recorde; document.getElementById("vitoriaEpica").style.display = "block";
    Sound.win(); createConfetti(); animateConfetti();
  }

  function createFood(){
    let n, attempts=0; do{ n={x:30+Math.random()*(W-60),y:30+Math.random()*(H-60),gold:Math.random()<goldenChance()}; attempts++; } while(occupied(n.x,n.y) && attempts<200); state.food=n;
  }

  function createPowerUp(){
    const types=["escudo","pimenta","magnet","slow","double","freeze","ghost","mini","heart","mega"]; let n, attempts=0; do{ n={x:30+Math.random()*(W-60),y:30+Math.random()*(H-60),tipo:types[Math.floor(Math.random()*types.length)]}; attempts++; } while(occupied(n.x,n.y) && attempts<200); state.powerUp=n;
  }


  function isNearType(x,y,type,range){
    for(const d of state.decor){
      if(d.tipo === type && dist({x,y},d) < range) return true;
    }
    return false;
  }

  function occupied(x,y){ for(const s of state.snakes){ if(dist({x,y},{x:s.x,y:s.y})<80) return true; for(const p of s.trail){ if(dist({x,y},p)<25) return true; } } if(state.boss && dist({x,y},state.boss)<90) return true; for(const d of state.decor){ if(dist({x,y},d)<35) return true; } return false; }

  function createDecor(qtd=36){
    state.decor=[]; let attempts=0; while(state.decor.length<qtd && attempts<2000){ attempts++; let d={x:35+Math.random()*(W-70), y:35+Math.random()*(H-70), tipo:"arvore", block:false, hit:20};
      if(state.map==="floresta"){ d.tipo = Math.random()>.35 ? "arvore" : "flor"; }
      if(state.map==="gelo"){ d.tipo = Math.random()>.45 ? "cristal" : "pedra"; }
      if(state.map==="noite"){ d.tipo = Math.random()>.55 ? "arvore" : "vaga"; }
      if(state.map==="pantano"){ d.tipo = Math.random()>.5 ? "lago" : "arvore"; }
      if(state.map==="cidade"){ d.tipo = Math.random()>.45 ? "predio" : "poste"; }
      if(state.map==="deserto"){ d.tipo = Math.random()>.45 ? "cacto" : "pedra"; }
      if(state.map==="vulcao"){ d.tipo = Math.random()>.45 ? "lava" : "pedra"; }
      if(["arvore","pedra","predio","poste","cacto","lava","cristal"].includes(d.tipo)){ d.block=true; d.hit = d.tipo==="predio" ? 24 : d.tipo==="poste" ? 18 : 22; }
      if(d.tipo === "lago"){ d.block=false; d.hit=34; }
      if(safeArea(d.x,d.y)) state.decor.push(d);
    }
  }

  function safeArea(x,y){ const spawns=[{x:W*.45,y:H*.55},{x:W*.55,y:H*.45}]; for(const s of spawns){ if(dist({x,y},s)<100) return false; } if(state.boss && dist({x,y},state.boss)<110) return false; return true; }

  function updateEffects(){
    state.particles.forEach(p=>{ p.x += p.vx; p.y += p.vy; p.life--; }); state.particles = state.particles.filter(p=>p.life>0);
    state.waves.forEach(o=>{ o.r += 1.6; o.life--; }); state.waves = state.waves.filter(o=>o.life>0);
    state.floatingTexts.forEach(t=>{ t.y += t.vy; t.life--; }); state.floatingTexts = state.floatingTexts.filter(t=>t.life>0);
    state.confetti.forEach(c=>{ c.y += c.vy; c.x += c.vx; });
  }

  function createParticles(x,y,cor){ const amount = state.graphics==="alto" ? 22 : state.graphics==="baixo" ? 8 : 14; for(let i=0;i<amount;i++) state.particles.push({x,y,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,life:25,cor,size:2+Math.random()*2}); }
  function eatEffect(x,y,gold,points,coins=1,doubleActive=false){ const cor=gold?"#fde047":"#bef264"; createParticles(x,y,cor); createParticles(x,y,"#92400e"); state.waves.push({x,y,r:6,life:28,cor:gold?"rgba(250,204,21,.8)":"rgba(190,242,100,.8)"}); state.floatingTexts.push({x,y:y-8,texto:`+${points} pts`,cor:gold?"#fde047":"#dcfce7",life:45,vy:-1.2}); state.floatingTexts.push({x,y:y+12,texto:`+${coins} 🪙${doubleActive?" 2X":""}`,cor:"#facc15",life:52,vy:-1.05}); }
  function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }

  function sampleSnake(s, step){ const result=[]; if(!s.trail.length) return result; result.push({x:s.x,y:s.y}); let target=step, walked=0; for(let i=1;i<s.trail.length;i++){ const a=s.trail[i-1], b=s.trail[i], d=dist(a,b); if(d===0) continue; while(walked+d>=target){ const ratio=(target-walked)/d; result.push({x:a.x+(b.x-a.x)*ratio, y:a.y+(b.y-a.y)*ratio}); target += step; if(result.length>90) return result; } walked += d; if(walked>s.length) break; } return result; }


  function drawBossHazards(){
    (state.bossHazards || []).forEach(hz=>{
      const pulse = Math.sin((hz.pulse || 0)/140) * 4;
      ctx.fillStyle = hz.color || "rgba(239,68,68,.30)";
      ctx.beginPath();
      ctx.arc(hz.x,hz.y,hz.r+pulse,0,Math.PI*2);
      ctx.fill();

      ctx.strokeStyle = "rgba(254,240,138,.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hz.x,hz.y,hz.r+6+pulse,0,Math.PI*2);
      ctx.stroke();
    });
  }


  function drawAll(){
    const shakeX = state.cameraShake>0 ? (Math.random()-.5)*5 : 0; const shakeY = state.cameraShake>0 ? (Math.random()-.5)*5 : 0;
    ctx.save(); ctx.translate(shakeX, shakeY); drawMap(); drawWeather(); drawBossHazards(); drawWaves(); drawFood(); if(state.powerUp) drawPowerUp(); if(state.boss) drawBoss(); drawBossProjectiles(); state.snakes.forEach(s=>{ if(s.alive) drawSnake(s); }); drawParticles(); drawFloatingTexts(); drawConfetti(); drawPowerBadges(); ctx.restore();
  }

  function drawPowerBadges(){
    let x=14, y=24;
    const badges=[];
    if(state.effects.magnet>0) badges.push(["🧲",state.effects.magnet]);
    if(state.effects.slow>0) badges.push(["⏳",state.effects.slow]);
    if(state.effects.doubleCoins>0) badges.push(["💰",state.effects.doubleCoins]);
    if(state.effects.freeze>0) badges.push(["❄️",state.effects.freeze]);
    if(state.effects.ghost>0) badges.push(["👻",state.effects.ghost]);
    if(state.effects.mini>0) badges.push(["🔹",state.effects.mini]);

    badges.forEach(([icon,time])=>{
      ctx.fillStyle="rgba(0,0,0,.42)";
      roundRect(x-8,y-20,44,34,10,true,false);
      ctx.font="18px Arial";
      ctx.fillStyle="#fff";
      ctx.textAlign="left";
      ctx.fillText(icon,x,y+2);
      ctx.font="bold 10px Arial";
      ctx.fillStyle="#fde047";
      ctx.fillText(`${Math.ceil(time/1000)}s`,x+19,y+3);
      x += 50;
    });
  }

  function roundRect(x,y,w,h,r,fill,stroke){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y);
    if(fill) ctx.fill();
    if(stroke) ctx.stroke();
  }


  function drawWeather(){
    if(state.graphics === "baixo") return;

    const count = state.graphics === "alto" ? 48 : 24;

    if(state.map === "floresta"){
      for(let i=0;i<count;i++){
        const x = (i*91 + state.animTime/35) % W;
        const y = (i*47 + state.animTime/22) % H;
        ctx.fillStyle = "rgba(190,242,100,.28)";
        ctx.beginPath();
        ctx.ellipse(x,y,5,2,Math.sin(i),0,Math.PI*2);
        ctx.fill();
      }
    }

    if(state.map === "gelo"){
      for(let i=0;i<count+20;i++){
        const x = (i*57 + Math.sin(state.animTime/500+i)*18) % W;
        const y = (i*83 + state.animTime/18) % H;
        ctx.fillStyle = "rgba(255,255,255,.55)";
        ctx.beginPath();
        ctx.arc(x,y,1.8,0,Math.PI*2);
        ctx.fill();
      }
    }

    if(state.map === "noite"){
      for(let i=0;i<count;i++){
        const x = (i*71 + Math.sin(state.animTime/700+i)*20) % W;
        const y = (i*39 + Math.cos(state.animTime/800+i)*16) % H;
        const a = .18 + .26*Math.sin(state.animTime/220+i);
        ctx.fillStyle = `rgba(253,224,71,${a})`;
        ctx.beginPath();
        ctx.arc(x,y,4,0,Math.PI*2);
        ctx.fill();
      }
    }

    if(state.map === "vulcao"){
      for(let i=0;i<count;i++){
        const x = (i*63 + state.animTime/28) % W;
        const y = (i*79 + state.animTime/45) % H;
        ctx.fillStyle = "rgba(31,41,55,.35)";
        ctx.beginPath();
        ctx.arc(x,y,3,0,Math.PI*2);
        ctx.fill();
      }
    }

    if(state.map === "pantano"){
      for(let i=0;i<count;i++){
        const x = (i*76) % W;
        const y = (i*58 + Math.sin(state.animTime/600+i)*8) % H;
        ctx.strokeStyle = "rgba(132,204,22,.22)";
        ctx.beginPath();
        ctx.arc(x,y,4+Math.sin(state.animTime/220+i)*2,0,Math.PI*2);
        ctx.stroke();
      }
    }

    if(state.map === "deserto"){
      for(let i=0;i<count;i++){
        const x = (i*70 + state.animTime/12) % W;
        const y = (i*44 + Math.sin(state.animTime/350+i)*12) % H;
        ctx.strokeStyle = "rgba(254,240,138,.18)";
        ctx.beginPath();
        ctx.moveTo(x,y);
        ctx.lineTo(x+28,y-4);
        ctx.stroke();
      }
    }

    if(state.map === "cidade"){
      for(let i=0;i<count;i++){
        const x = (i*87) % W;
        const y = (i*53) % H;
        const a = .10 + .18*Math.sin(state.animTime/300+i);
        ctx.fillStyle = `rgba(254,240,138,${a})`;
        ctx.fillRect(x,y,10,5);
      }
    }
  }

  function drawMap(){
    if(state.map==="floresta") drawForest(); if(state.map==="noite") drawNight(); if(state.map==="gelo") drawIce(); if(state.map==="deserto") drawDesert(); if(state.map==="vulcao") drawVolcano(); if(state.map==="pantano") drawSwamp(); if(state.map==="cidade") drawCity();
    state.decor.forEach(d=>{ if(state.obstaclesReal && d.block){ ctx.strokeStyle="rgba(239,68,68,.10)"; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(d.x,d.y,d.hit,0,Math.PI*2); ctx.stroke(); }
      if(d.tipo==="arvore") drawTree(d.x,d.y); if(d.tipo==="flor") drawFlower(d.x,d.y); if(d.tipo==="pedra") drawRock(d.x,d.y); if(d.tipo==="predio") drawBuilding(d.x,d.y); if(d.tipo==="poste") drawPost(d.x,d.y); if(d.tipo==="lava") drawLavaRock(d.x,d.y); if(d.tipo==="lago") drawSwampPond(d.x,d.y); if(d.tipo==="vaga") drawFirefly(d.x,d.y); if(d.tipo==="cacto") drawCactus(d.x,d.y); if(d.tipo==="cristal") drawCrystal(d.x,d.y); });
  }

  function drawForest(){ const grad=ctx.createLinearGradient(0,0,0,H); grad.addColorStop(0,"#8fce72"); grad.addColorStop(.45,"#5ea858"); grad.addColorStop(1,"#2f7d3f"); ctx.fillStyle=grad; ctx.fillRect(0,0,W,H); for(let i=0;i<(state.graphics==="alto"?160:90);i++){ const x=(i*73)%W,y=(i*41)%H; ctx.fillStyle=i%2===0?"rgba(22,101,52,.14)":"rgba(255,255,255,.06)"; ctx.beginPath(); ctx.ellipse(x,y,22,10,(i%7)*.4,0,Math.PI*2); ctx.fill(); } }
  function drawNight(){ const grad=ctx.createLinearGradient(0,0,0,H); grad.addColorStop(0,"#020617"); grad.addColorStop(.5,"#0f172a"); grad.addColorStop(1,"#1e293b"); ctx.fillStyle=grad; ctx.fillRect(0,0,W,H); ctx.fillStyle="rgba(254,240,138,.9)"; ctx.beginPath(); ctx.arc(595,88,34,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#020617"; ctx.beginPath(); ctx.arc(582,78,32,0,Math.PI*2); ctx.fill(); const stars = state.graphics==="alto" ? 120 : 70; for(let i=0;i<stars;i++){ const x=(i*67)%W, y=(i*37)%H, b=.35+.35*Math.sin(state.animTime/500+i); ctx.fillStyle=`rgba(255,255,255,${b})`; ctx.beginPath(); ctx.arc(x,y,1.4+(i%3),0,Math.PI*2); ctx.fill(); } }
  function drawIce(){ const grad=ctx.createLinearGradient(0,0,W,H); grad.addColorStop(0,"#edfaff"); grad.addColorStop(.42,"#a7d8f0"); grad.addColorStop(1,"#5eaee6"); ctx.fillStyle=grad; ctx.fillRect(0,0,W,H); const flakes = state.graphics==="alto" ? 110 : 60; for(let i=0;i<flakes;i++){ const x=(i*49+Math.sin(state.animTime/1000+i)*8)%W, y=(i*71+state.animTime/45)%H; ctx.fillStyle="rgba(255,255,255,.65)"; ctx.beginPath(); ctx.arc(x,y,2,0,Math.PI*2); ctx.fill(); } }
  function drawDesert(){ const grad=ctx.createLinearGradient(0,0,0,H); grad.addColorStop(0,"#f6df97"); grad.addColorStop(.5,"#dfba63"); grad.addColorStop(1,"#b67b2c"); ctx.fillStyle=grad; ctx.fillRect(0,0,W,H); for(let i=0;i<9;i++){ const y=90+i*72; ctx.fillStyle=i%2===0?"rgba(180,83,9,.18)":"rgba(255,255,255,.12)"; ctx.beginPath(); ctx.moveTo(0,y); for(let x=0;x<=W;x+=50) ctx.quadraticCurveTo(x+25,y+25,x+50,y); ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.fill(); } }
  function drawVolcano(){ const grad=ctx.createLinearGradient(0,0,0,H); grad.addColorStop(0,"#6e1111"); grad.addColorStop(.45,"#a61919"); grad.addColorStop(1,"#1f2937"); ctx.fillStyle=grad; ctx.fillRect(0,0,W,H); for(let i=0;i<10;i++){ ctx.fillStyle="rgba(249,115,22,.20)"; ctx.beginPath(); const y=80+i*65; ctx.moveTo(0,y); for(let x=0;x<=W;x+=60) ctx.quadraticCurveTo(x+30,y+20,x+60,y); ctx.lineTo(W,y+20); ctx.lineTo(0,y+20); ctx.fill(); } }
  function drawSwamp(){ const grad=ctx.createLinearGradient(0,0,0,H); grad.addColorStop(0,"#3c5c1d"); grad.addColorStop(.5,"#526d1e"); grad.addColorStop(1,"#202f0d"); ctx.fillStyle=grad; ctx.fillRect(0,0,W,H); for(let i=0;i<60;i++){ const x=(i*83)%W,y=(i*59)%H; ctx.fillStyle="rgba(132,204,22,.12)"; ctx.beginPath(); ctx.ellipse(x,y,35,14,Math.sin(i),0,Math.PI*2); ctx.fill(); } }
  function drawCity(){ const grad=ctx.createLinearGradient(0,0,0,H); grad.addColorStop(0,"#5e6f87"); grad.addColorStop(.6,"#415168"); grad.addColorStop(1,"#192537"); ctx.fillStyle=grad; ctx.fillRect(0,0,W,H); ctx.strokeStyle="rgba(255,255,255,.10)"; ctx.lineWidth=2; for(let x=0;x<W;x+=52){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); } for(let y=0;y<H;y+=52){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); } }

  function drawSnake(s){
    const pts=sampleSnake(s,12); if(pts.length<2) return; const wavePts=pts.map((p,i)=>{ const next=pts[Math.min(i+1,pts.length-1)]; const angle=Math.atan2(next.y-p.y,next.x-p.x); const normal=angle+Math.PI/2; const wave=Math.sin(state.animTime/120+i*.7)*2.2; return {x:p.x+Math.cos(normal)*wave,y:p.y+Math.sin(normal)*wave}; });
    const ghostAlpha = state.effects.ghost>0 ? .58 : 1;
    ctx.save();
    ctx.globalAlpha = ghostAlpha;
    ctx.lineCap="round"; ctx.lineJoin="round"; drawSpecialSkinGlow(s,wavePts); drawSmoothLine(wavePts,"rgba(0,0,0,.28)",38,4,7); drawSmoothLine(wavePts,s.cor2,32,0,0); const grad=ctx.createLinearGradient(0,0,W,H); grad.addColorStop(0,s.cor1); grad.addColorStop(.5,s.cor2); grad.addColorStop(1,s.cor1); drawSmoothLine(wavePts,grad,26,0,0); drawSmoothLine(wavePts,s.brilho,7,-5,-5); drawScaleMarks(s,wavePts); const tail=wavePts[wavePts.length-1]; ctx.fillStyle=s.cor2; ctx.beginPath(); ctx.arc(tail.x,tail.y,9,0,Math.PI*2); ctx.fill(); drawSnakeHead(s); ctx.restore();
  }

  function drawScaleMarks(s, pts){
    for(let i=2;i<pts.length;i+=2){ const p=pts[i]; ctx.fillStyle = (i%4===0) ? "rgba(255,255,255,.16)" : "rgba(0,0,0,.16)"; const r = s.skinKey==="coral" ? 4.2 : s.skinKey==="pantano" ? 4.6 : 3.2; ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fill(); if(s.skinKey==="coral" && i%6===0){ ctx.strokeStyle="#111827"; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(p.x-8,p.y-8); ctx.lineTo(p.x+8,p.y+8); ctx.stroke(); } }
  }

  function drawSpecialSkinGlow(s, pts){ if(!["neon","fogo","branca","ouro","abacate"].includes(s.skinKey)) return; let color=s.brilho,width=42; if(s.skinKey==="fogo"){color="rgba(249,115,22,.35)"; width=46;} if(s.skinKey==="branca"){color="rgba(224,242,254,.42)"; width=44;} if(s.skinKey==="ouro"){color="rgba(250,204,21,.42)"; width=48;} if(s.skinKey==="abacate"){color="rgba(132,204,22,.35)"; width=44;} if(s.skinKey==="neon"){color="rgba(34,211,238,.45)"; width=48;} ctx.globalAlpha=.75; drawSmoothLine(pts,color,width,0,0); ctx.globalAlpha=1; }
  function drawSmoothLine(pts, cor, width, ox, oy){ if(pts.length<2) return; ctx.strokeStyle=cor; ctx.lineWidth=width; ctx.beginPath(); ctx.moveTo(pts[0].x+ox,pts[0].y+oy); for(let i=1;i<pts.length-1;i++){ const mx=(pts[i].x+pts[i+1].x)/2, my=(pts[i].y+pts[i+1].y)/2; ctx.quadraticCurveTo(pts[i].x+ox,pts[i].y+oy,mx+ox,my+oy); } const last=pts[pts.length-1]; ctx.lineTo(last.x+ox,last.y+oy); ctx.stroke(); }

  function drawSnakeHead(s){ const eat=s.eatAnim/280, breath=1.4*Math.sin(state.animTime/220), mouth=Math.max(0,eat); ctx.save(); ctx.translate(s.x,s.y); ctx.rotate(s.angle); ctx.scale(1+mouth*.28,1+mouth*.12); ctx.fillStyle="rgba(0,0,0,.22)"; ctx.beginPath(); ctx.ellipse(4,6,23,18,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle=s.cor2; ctx.beginPath(); ctx.ellipse(0,0,23+breath,19+breath,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle=s.cor1; ctx.beginPath(); ctx.ellipse(1,0,20+breath,17+breath,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle=s.brilho; ctx.globalAlpha=.82; ctx.beginPath(); ctx.arc(-7,-8,6,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; if(mouth>0){ ctx.fillStyle="rgba(2,6,23,.9)"; ctx.beginPath(); ctx.ellipse(18,0,5+mouth*9,6+mouth*5,0,0,Math.PI*2); ctx.fill(); } if(s.shield>0){ const r=27+Math.sin(state.animTime/120)*3; ctx.strokeStyle="#fef08a"; ctx.lineWidth=3; ctx.globalAlpha=.85; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=1; } drawEye(8,-7); drawEye(8,7); drawTongue(); ctx.restore(); }
  function drawEye(x,y){ const blink=Math.sin(state.animTime/900)>.94; if(blink){ ctx.strokeStyle="#052e16"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(x-5,y); ctx.lineTo(x+5,y); ctx.stroke(); return; } ctx.fillStyle="white"; ctx.beginPath(); ctx.arc(x,y,6,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#0f172a"; ctx.beginPath(); ctx.arc(x+1,y,3.1,0,Math.PI*2); ctx.fill(); ctx.fillStyle="white"; ctx.beginPath(); ctx.arc(x+2,y-1,1.1,0,Math.PI*2); ctx.fill(); }
  function drawTongue(){ const cycle=(Math.sin(state.animTime/110)+1)/2, length=10+cycle*18, wiggle=Math.sin(state.animTime/70)*5; ctx.strokeStyle="#ef4444"; ctx.lineWidth=3; ctx.lineCap="round"; ctx.beginPath(); ctx.moveTo(18,0); ctx.quadraticCurveTo(20+length*.45,wiggle,18+length,wiggle*.35); ctx.moveTo(18+length,wiggle*.35); ctx.lineTo(24+length,-5); ctx.moveTo(18+length,wiggle*.35); ctx.lineTo(24+length,5); ctx.stroke(); }

  function drawFood(){ const f=state.food; if(!f) return; const pulse=1+Math.sin(state.animTime/220)*.08;
    if(drawSprite("avocado", f.x, f.y, f.gold ? 42*pulse : 32*pulse, f.gold ? 52*pulse : 42*pulse, Math.sin(state.animTime/500)*0.08)){
      if(f.gold){
        ctx.fillStyle="rgba(250,204,21,.22)";
        ctx.beginPath();
        ctx.arc(f.x,f.y,26+Math.sin(state.animTime/160)*3,0,Math.PI*2);
        ctx.fill();
      }
      return;
    } ctx.save(); ctx.translate(f.x,f.y); ctx.scale(pulse,pulse); if(f.gold){ const glow=22+Math.sin(state.animTime/180)*3; ctx.fillStyle="rgba(250,204,21,.35)"; ctx.beginPath(); ctx.arc(0,0,glow,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#fde047"; ctx.beginPath(); ctx.arc(0,0,17,0,Math.PI*2); ctx.fill(); } ctx.fillStyle="rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(1,8,11,6,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#14532d"; ctx.beginPath(); ctx.ellipse(0,0,11,14,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#bef264"; ctx.beginPath(); ctx.ellipse(0,0,8,11,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#92400e"; ctx.beginPath(); ctx.arc(0,3,4,0,Math.PI*2); ctx.fill(); ctx.fillStyle="rgba(255,255,255,.45)"; ctx.beginPath(); ctx.arc(-4,-5,2.4,0,Math.PI*2); ctx.fill(); ctx.restore(); }

  function drawPowerUp(){ const p=state.powerUp; const pulse=17+Math.sin(state.animTime/160)*3; ctx.fillStyle="rgba(255,255,255,.35)"; ctx.beginPath(); ctx.arc(p.x,p.y,pulse,0,Math.PI*2); ctx.fill(); const map={escudo:["#fef08a","🛡️"],pimenta:["#ef4444","🌶️"],magnet:["#60a5fa","🧲"],slow:["#c4b5fd","⏳"],double:["#fde047","💰"],freeze:["#93c5fd","❄️"],ghost:["#e9d5ff","👻"],mini:["#bbf7d0","🔹"],heart:["#fca5a5","❤️"],mega:["#fde047","🥑"]}; ctx.fillStyle=map[p.tipo][0]; ctx.beginPath(); ctx.arc(p.x,p.y,12,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#052e16"; ctx.font="16px Arial"; ctx.textAlign="center"; ctx.fillText(map[p.tipo][1],p.x,p.y+6); }

  function drawBoss(){ const boss=state.boss; if(!boss) return; const blink=boss.inv>0 && Math.floor(state.animTime/90)%2===0; const shake=boss.angry>0 ? Math.sin(state.animTime/40)*3 : 0; ctx.save(); ctx.translate(boss.x+shake,boss.y); ctx.fillStyle="rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(4,35,44,15,0,0,Math.PI*2); ctx.fill(); if(!blink){ const aura = boss.type==="tomate" ? "rgba(239,68,68,.28)" : boss.type==="pimenta" ? "rgba(249,115,22,.28)" : "rgba(132,204,22,.30)"; ctx.fillStyle=aura; ctx.beginPath(); ctx.arc(0,0,boss.r+12+Math.sin(state.animTime/120)*4,0,Math.PI*2); ctx.fill(); ctx.fillStyle=boss.color2; ctx.beginPath(); ctx.ellipse(0,0,boss.r*.82,boss.r,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle=boss.color1; ctx.beginPath(); ctx.ellipse(0,0,boss.r*.62,boss.r*.78,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#92400e"; ctx.beginPath(); ctx.arc(0,12,15,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#020617"; ctx.beginPath(); ctx.arc(-13,-14,5,0,Math.PI*2); ctx.arc(13,-14,5,0,Math.PI*2); ctx.fill(); ctx.strokeStyle="#020617"; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(-12,25); ctx.quadraticCurveTo(0,34,12,25); ctx.stroke(); } const hpW=100,hpPct=boss.hp/boss.maxHp; ctx.fillStyle="rgba(0,0,0,.45)"; ctx.fillRect(-hpW/2,-65,hpW,10); ctx.fillStyle=hpPct<.35?"#ef4444":hpPct<.66?"#f97316":"#facc15"; ctx.fillRect(-hpW/2,-65,hpW*hpPct,10); ctx.strokeStyle="#fef08a"; ctx.lineWidth=2; ctx.strokeRect(-hpW/2,-65,hpW,10); ctx.fillStyle="#fef08a"; ctx.font="bold 14px Arial"; ctx.textAlign="center"; ctx.fillText(`${boss.name} F${boss.phase}`,0,-72); ctx.restore(); }
  function drawBossProjectiles(){ state.bossProjectiles.forEach(pr=>{ ctx.fillStyle="rgba(0,0,0,.22)"; ctx.beginPath(); ctx.arc(pr.x+3,pr.y+4,pr.r,0,Math.PI*2); ctx.fill(); ctx.fillStyle=pr.color; ctx.beginPath(); ctx.arc(pr.x,pr.y,pr.r,0,Math.PI*2); ctx.fill(); }); }

  function drawTree(x,y){ const sway=Math.sin(state.animTime/700+x)*2;
    if(drawSprite("tree",x+sway,y,64,64,0)) return; ctx.fillStyle="rgba(0,0,0,.22)"; ctx.beginPath(); ctx.ellipse(x,y+24,18,8,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#7c2d12"; ctx.fillRect(x-5,y+8,10,20); ctx.fillStyle="#14532d"; ctx.beginPath(); ctx.arc(x+sway,y,20,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#16a34a"; ctx.beginPath(); ctx.arc(x-11+sway,y+4,15,0,Math.PI*2); ctx.arc(x+11+sway,y+4,15,0,Math.PI*2); ctx.arc(x+sway,y-10,14,0,Math.PI*2); ctx.fill(); }
  function drawFlower(x,y){ const rot=state.animTime/500; ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.fillStyle="#f472b6"; for(let i=0;i<6;i++){ const a=i*Math.PI*2/6; ctx.beginPath(); ctx.ellipse(Math.cos(a)*7,Math.sin(a)*7,4,7,a,0,Math.PI*2); ctx.fill(); } ctx.fillStyle="#fef08a"; ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill(); ctx.restore(); }
  function drawRock(x,y){ if(drawSprite("rock",x,y,52,40,0)) return; ctx.fillStyle="rgba(0,0,0,.20)"; ctx.beginPath(); ctx.ellipse(x+2,y+7,15,7,0,0,Math.PI*2); ctx.fill(); const grad=ctx.createLinearGradient(x-10,y-8,x+12,y+10); grad.addColorStop(0,"#dbe4ea"); grad.addColorStop(1,"#6b7b8e"); ctx.fillStyle=grad; ctx.beginPath(); ctx.ellipse(x,y,14,10,.35,0,Math.PI*2); ctx.fill(); }
  function drawCrystal(x,y){ if(drawSprite("crystal",x,y,44,56,0)) return; ctx.fillStyle="rgba(255,255,255,.22)"; ctx.beginPath(); ctx.moveTo(x,y-18); ctx.lineTo(x+12,y); ctx.lineTo(x,y+18); ctx.lineTo(x-12,y); ctx.closePath(); ctx.fill(); ctx.fillStyle="#a5f3fc"; ctx.beginPath(); ctx.moveTo(x,y-15); ctx.lineTo(x+9,y); ctx.lineTo(x,y+15); ctx.lineTo(x-9,y); ctx.closePath(); ctx.fill(); }
  function drawLavaRock(x,y){ if(drawSprite("lava",x,y,56,44,0)) return; drawRock(x,y); ctx.fillStyle="rgba(249,115,22,.85)"; ctx.beginPath(); ctx.arc(x+3,y,4+Math.sin(state.animTime/130)*1.5,0,Math.PI*2); ctx.fill(); }
  function drawSwampPond(x,y){ if(drawSprite("pond",x,y,62,40,0)) return; ctx.fillStyle="rgba(20,83,45,.45)"; ctx.beginPath(); ctx.ellipse(x,y,23,13,Math.sin(x),0,Math.PI*2); ctx.fill(); ctx.fillStyle="rgba(190,242,100,.55)"; ctx.beginPath(); ctx.arc(x-7,y-3,4,0,Math.PI*2); ctx.fill(); }
  function drawBuilding(x,y){ if(drawSprite("building",x,y,46,62,0)) return; ctx.fillStyle="rgba(15,23,42,.35)"; ctx.fillRect(x-14,y-20,28,40); ctx.fillStyle="#1e293b"; ctx.fillRect(x-12,y-24,24,44); ctx.fillStyle="#fef08a"; for(let yy=-16;yy<16;yy+=12){ ctx.fillRect(x-6,y+yy,4,5); ctx.fillRect(x+3,y+yy,4,5); } }
  function drawPost(x,y){ if(drawSprite("post",x,y,38,64,0)) return; ctx.fillStyle="#111827"; ctx.fillRect(x-3,y-20,6,38); ctx.fillStyle="#fde047"; ctx.beginPath(); ctx.arc(x,y-23,8+Math.sin(state.animTime/180)*1,0,Math.PI*2); ctx.fill(); }
  function drawFirefly(x,y){ ctx.fillStyle="rgba(253,224,71,.28)"; ctx.beginPath(); ctx.arc(x,y,9+Math.sin(state.animTime/200+x)*2,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#fde047"; ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill(); }
  function drawCactus(x,y){ if(drawSprite("cactus",x,y,44,62,0)) return; ctx.fillStyle="#356b2e"; ctx.fillRect(x-5,y-18,10,36); ctx.fillRect(x-14,y-6,8,18); ctx.fillRect(x+6,y-2,8,16); }

  function drawWaves(){ state.waves.forEach(o=>{ ctx.strokeStyle=o.cor; ctx.globalAlpha=o.life/28; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(o.x,o.y,o.r,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=1; }); }
  function drawParticles(){ state.particles.forEach(p=>{ ctx.fillStyle=p.cor; ctx.globalAlpha=p.life/45; ctx.beginPath(); ctx.arc(p.x,p.y,p.size||3,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; }); }
  function drawFloatingTexts(){ state.floatingTexts.forEach(t=>{ ctx.globalAlpha=t.life/45; ctx.fillStyle=t.cor; ctx.font="bold 24px Arial"; ctx.textAlign="center"; ctx.strokeStyle="rgba(0,0,0,.55)"; ctx.lineWidth=4; ctx.strokeText(t.texto,t.x,t.y); ctx.fillText(t.texto,t.x,t.y); ctx.globalAlpha=1; }); }
  function createConfetti(){ state.confetti=[]; for(let i=0;i<130;i++) state.confetti.push({x:Math.random()*W,y:-Math.random()*350,vy:2+Math.random()*4,vx:(Math.random()-.5)*2,r:3+Math.random()*5,cor:["#facc15","#22c55e","#38bdf8","#f472b6","#f97316"][Math.floor(Math.random()*5)]}); }
  function drawConfetti(){ state.confetti.forEach(c=>{ ctx.fillStyle=c.cor; ctx.fillRect(c.x,c.y,c.r,c.r); }); }
  function animateConfetti(){ let frames=0; function anim(){ if(frames++>150) return; state.confetti.forEach(c=>{ c.y += c.vy; c.x += c.vx; }); drawAll(); requestAnimationFrame(anim); } anim(); }

  function updateHUD(){ document.getElementById("score1").textContent=state.snakes[0]?.score||0; document.getElementById("score2").textContent=state.snakes[1]?.score||0; document.getElementById("shield1").textContent=state.snakes[0]?.shield||0; document.getElementById("shield2").textContent=state.snakes[1]?.shield||0; if(state.mode==="multi") document.getElementById("meta").textContent=DATA.metaMulti; 
    else if(state.mode==="bossrush") document.getElementById("meta").textContent="BOSS RUSH";
    else if(state.mode==="treino") document.getElementById("meta").textContent="TREINO";
    else if(state.mode==="tutorialmap") document.getElementById("meta").textContent="TUTORIAL";
    else if(state.mode==="infinito") document.getElementById("meta").textContent="∞";
    else if(state.mode==="campanha") document.getElementById("meta").textContent=state.boss?"BOSS":DATA.campaign[state.campaignIndex].meta; 
    else document.getElementById("meta").textContent="-"; document.getElementById("faseHud").textContent=state.mode==="campanha"?`${state.campaignIndex+1}/${DATA.campaign.length}`:"-"; document.getElementById("bossHud").textContent=state.boss?`${state.boss.hp}/${state.boss.maxHp}`:"-"; document.getElementById("moedasHud").textContent=Store.saveData().moedas; }


  function deathTip(reason){
    const tips = {
      "Borda do mapa":"Dica: faça curvas mais abertas perto da borda.",
      "Obstáculo":"Dica: use o power-up fantasma para atravessar obstáculos por alguns segundos.",
      "Corpo da cobra":"Dica: quando a cobra estiver grande, use mini cobra ou diminua a velocidade.",
      "Fogo do Pimentão":"Dica: contra o Pimentão, fique longe das zonas laranjas no chão."
    };

    if(state.mode === "bossrush") return "Dica: guarde escudo e congelar para a fase final do boss.";
    if(state.effects.doubleCoins>0) return "Dica: aproveite Moedas 2X com abacate dourado para farmar mais.";
    return tips[reason] || "Dica: use escudo, ímã e fantasma para sobreviver mais.";
  }


  function finish(meta, levelOnly=false){
    if(state.finished) return; const save=Store.saveData(); state.finished=true; state.running=false; state.closing=false; Sound.stopMusic(); UI.setBody("menu-aberto"); let title="💀 Game Over", text="", badge="Fim de jogo"; const p1=state.snakes[0]?.score||0, p2=state.snakes[1]?.score||0, total=p1+p2; save.stats.gamesPlayed += 1;
    if(state.mode==="single" || state.mode==="campanha" || state.mode==="infinito" || state.mode==="bossrush" || state.mode==="treino" || state.mode==="tutorialmap"){
      if(p1>save.recorde) save.recorde=p1; if(state.mode==="single" && p1>save.stats.bestSingle) save.stats.bestSingle=p1; 
      if(state.mode==="infinito" && p1>save.stats.bestInfinite) save.stats.bestInfinite=p1;
      if(state.mode==="bossrush" && p1>save.stats.bestBossRush) save.stats.bestBossRush=p1;
      if(state.mode==="campanha" && p1>save.stats.bestCampaign) save.stats.bestCampaign=p1;
      if(state.mode==="treino"){ title="🎯 Treino encerrado"; text=`Você treinou e fez ${p1} ponto(s).`; badge="Treino livre"; }
      else if(state.mode==="tutorialmap"){ title="🎓 Tutorial encerrado"; text=`Você praticou e fez ${p1} ponto(s).`; badge="Aprendizado"; }
      else if(levelOnly){ title="✅ Fase concluída!"; text=`Você concluiu ${DATA.campaign[state.campaignIndex].nome} com ${p1} ponto(s).`; badge="Fase liberada"; }
      else if(p1>=save.recorde){ title="🏆 Novo recorde!"; text=`Você comeu ${p1} abacate(s)!`; badge="Mandou muito!"; Sound.win(); createConfetti(); }
      else { text=`Você comeu ${p1} abacate(s). Tente novamente!`; badge="Tente novamente"; }
    }
    if(state.mode==="multi"){
      if(p1>p2){ title="🏆 Player 1 venceu!"; text=`P1 comeu ${p1}. P2 comeu ${p2}.`; badge="Player 1 campeão"; save.stats.winsP1 += 1; UI.unlockAchievement("venceuMulti"); UI.updateMission("multiWins",1,true); Sound.win(); createConfetti(); }
      else if(p2>p1){ title="🏆 Player 2 venceu!"; text=`P2 comeu ${p2}. P1 comeu ${p1}.`; badge="Player 2 campeão"; save.stats.winsP2 += 1; UI.unlockAchievement("venceuMulti"); UI.updateMission("multiWins",1,true); Sound.win(); createConfetti(); }
      else { title="🤝 Empate!"; text=`Os dois comeram ${p1}.`; badge="Empate"; }
      if(meta) text += " Vitória por meta!";
    }
    if(state.mode !== "treino" && state.mode !== "tutorialmap") UI.addXP(Math.max(5, Math.round((state.mode==="multi" ? Math.max(p1,p2) : p1) * 3)), "Partida"); UI.recordScore(state.mode, state.mode==="multi" ? Math.max(p1,p2) : p1, {coins:state.match.coinsEarned,time:state.sessionSeconds}); Store.persist(); UI.refreshMoney(); UI.renderAchievements(); UI.renderMissions(); UI.renderRanking(); document.getElementById("gameOverTitulo").textContent=title; document.getElementById("gameOverTexto").textContent=text; document.getElementById("vencedorBadge").textContent=badge; document.getElementById("finalP1").textContent=p1; document.getElementById("finalP2").textContent=state.mode==="multi"?p2:"-"; document.getElementById("finalTotal").textContent=total; document.getElementById("finalRecorde").textContent=save.recorde; const tipEl=document.getElementById("gameTip"); if(tipEl) tipEl.textContent=deathTip(state.match.deathReason); renderMatchStats("matchStats"); document.getElementById("gameOver").style.display="block"; animateConfetti();
  }

  function togglePause(){ state.paused=!state.paused; document.getElementById("pausa").style.display = state.paused ? "block" : "none"; document.getElementById("somStatusPausa").textContent = Store.saveData().sound ? "Som ligado" : "Som desligado"; UI.setBody(state.paused ? "menu-aberto" : "jogando"); state.lastTime=performance.now(); }
  function toggleFullscreen(){ if(!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }
  function restart(){ if(state.mode==="campanha" && !state.levelSelectMode){ state.campaignIndex=0; state.campaignTotal=0; } setupGame(); showLevelIntro(); }
  function backToMenu(){ state.running=false; state.paused=false; state.closing=false; state.finished=false; state.boss=null; state.bossProjectiles=[]; state.bossHazards=[]; Sound.stopMusic(); UI.backToMenu(); }



  function startWeeklyMission(){
    const mission = UI.currentWeeklyMission();

    if(mission.type === "boss"){
      start("bossrush");
      return;
    }

    if(mission.type === "infinite"){
      start("infinito");
      return;
    }

    start("single");
  }


  function startDailyChallenge(){
    const ch = UI.currentDailyChallenge();

    if(ch.type === "boss"){
      start("bossrush");
      return;
    }

    if(ch.type === "infinite"){
      start("infinito");
      return;
    }

    start("single");
  }

  UI.setBody("menu-aberto"); drawForest();
  return {start,startLevel,startDailyChallenge,startWeeklyMission,restart,backToMenu,togglePause,nextCampaignLevel};
})();
