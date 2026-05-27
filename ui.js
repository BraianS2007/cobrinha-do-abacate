const UI = (() => {
  const telas = ["menu","loja","upgrades","missoes","conquistas","configuracoes","comoJogar","creditos","gameOver","pausa","faseCompleta","contador","ranking","selecionarFase","tutorial","vitoriaEpica","modoJogo","recompensaDiaria","levelIntro","perfilJogador","desafioDiario"];
  let shopPreviewSkin = Store.saveData().selectedP1 || "verde";

  function setBody(state){ document.body.classList.remove("menu-aberto","jogando"); document.body.classList.add(state); }
  function open(id){ telas.forEach(t => document.getElementById(t).style.display = "none"); document.getElementById(id).style.display = "block"; setBody("menu-aberto"); }
  function backToMenu(){ open("menu"); refreshAll(); }

  function toast(text){
    ["menuToast","lojaToast","configToast"].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=text; });
    setTimeout(()=>{ ["menuToast","lojaToast","configToast"].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=""; }); }, 2600);
  }

  function refreshMoney(){
    const save=Store.saveData();
    document.getElementById("moedasMenu").textContent=save.moedas;
    document.getElementById("moedasLoja").textContent=save.moedas;
    document.getElementById("moedasUpgrade").textContent=save.moedas;
    document.getElementById("moedasHud").textContent=save.moedas;
    document.getElementById("recorde").textContent=save.recorde;
    document.getElementById("totalAbacatesMenu").textContent=save.stats.totalAvocados || 0;
  }

  function skinCard(key, player, loja=false){
    const s = DATA.skins[key]; const save = Store.saveData(); const unlocked = save.unlocked.includes(key);
    const card = document.createElement("div"); card.className="skin-card"; if(!unlocked) card.classList.add("locked"); card.dataset.skin=key; card.dataset.player=player;
    const equipped = (!loja && ((player===1 && save.selectedP1===key) || (player===2 && save.selectedP2===key)));
    card.innerHTML = `
      <div class="skin-preview"><span style="background:${s.cor2}"></span><span style="background:${s.cor1}"></span><span style="background:${s.brilho}"></span></div>
      <small>${s.nome}${equipped?" ✓":""}</small>
      <div class="preco">${unlocked ? (loja ? "Comprada" : "Liberada") : "🪙 " + s.preco}</div>
      <div class="efeito">${s.efeito}</div>
      <div class="raridade ${s.raridade}">${s.raridade.toUpperCase()}</div>`;
    card.onclick = () => {
      if(!unlocked){ buySkin(key); return; }
      if(loja){
        shopPreviewSkin = key;
        renderShopPreview();
        return;
      }
      if(player===1) save.selectedP1=key; if(player===2) save.selectedP2=key; Store.persist(); renderSkins(); renderStore();
    };
    return card;
  }

  function renderSkins(){
    const p1=document.getElementById("skinsP1"), p2=document.getElementById("skinsP2"); p1.innerHTML=""; p2.innerHTML="";
    Object.keys(DATA.skins).forEach(key=>{ p1.appendChild(skinCard(key,1)); p2.appendChild(skinCard(key,2)); }); updateActiveSkins();
  }

  function updateActiveSkins(){
    const save=Store.saveData(); document.querySelectorAll(".skin-card").forEach(card=>{ const player=Number(card.dataset.player), skin=card.dataset.skin; card.classList.remove("ativo"); if(player===1 && skin===save.selectedP1) card.classList.add("ativo"); if(player===2 && skin===save.selectedP2) card.classList.add("ativo"); });
  }

  function renderStore(){
    const loja=document.getElementById("lojaSkins");
    loja.innerHTML="";
    Object.keys(DATA.skins).forEach(key=>loja.appendChild(skinCard(key,1,true)));
    renderShopPreview();
    refreshMoney();
  }

  function renderShopPreview(){
    const box = document.getElementById("skinPreviewBox");
    if(!box) return;
    const save = Store.saveData();
    const key = shopPreviewSkin || save.selectedP1 || "verde";
    const s = DATA.skins[key];
    const unlocked = save.unlocked.includes(key);
    box.innerHTML = `
      <div class="big-snake-preview">
        <span class="seg" style="background:${s.cor2}"></span>
        <span class="seg" style="background:${s.cor1}"></span>
        <span class="seg" style="background:${s.cor2}"></span>
        <span class="seg" style="background:${s.brilho}"></span>
      </div>
      <div class="skin-preview-info">
        <b>${s.nome}</b>
        <small>Raridade: ${s.raridade.toUpperCase()}<br>Efeito: ${s.efeito}<br>${unlocked ? "Skin liberada." : "Preço: 🪙 " + s.preco}</small>
        <div class="skin-preview-actions">
          ${unlocked ? `<button onclick="UI.equipPreviewSkin(1)">Equipar P1</button><button onclick="UI.equipPreviewSkin(2)">Equipar P2</button>` : `<button onclick="UI.buySkin('${key}')">Comprar</button>`}
        </div>
      </div>`;
  }

  function equipPreviewSkin(player){
    const save = Store.saveData();
    if(!save.unlocked.includes(shopPreviewSkin)){
      toast("Compre essa skin primeiro.");
      return;
    }
    if(player === 1) save.selectedP1 = shopPreviewSkin;
    if(player === 2) save.selectedP2 = shopPreviewSkin;
    Store.persist();
    renderSkins();
    renderStore();
    toast(`Skin equipada no Player ${player}.`);
  }
  function buySkin(key){
    const save=Store.saveData(), skin=DATA.skins[key];
    if(save.unlocked.includes(key)){ toast(`Skin ${skin.nome} já está liberada.`); return; }
    if(save.moedas < skin.preco){ toast("Moedas insuficientes."); return; }
    save.moedas -= skin.preco; save.unlocked.push(key); save.missionProgress.skinsCompradas=Math.max(0,save.unlocked.length-2); unlockAchievement("compraSkin"); Store.persist(); toast(`Skin ${skin.nome} comprada!`); refreshAll();
  }


  function setShopTab(tab){
    const panels = {
      skins: document.getElementById("shopSkinsPanel"),
      upgrades: document.getElementById("shopUpgradesPanel"),
      especiais: document.getElementById("shopSpecialPanel")
    };

    Object.values(panels).forEach(p => {
      if(p) p.style.display = "none";
    });

    if(panels[tab]) panels[tab].style.display = "block";

    ["tabSkins","tabUpgrades","tabEspeciais"].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.classList.remove("ativo");
    });

    const active = tab === "skins" ? "tabSkins" : tab === "upgrades" ? "tabUpgrades" : "tabEspeciais";
    const activeEl = document.getElementById(active);
    if(activeEl) activeEl.classList.add("ativo");

    if(tab === "upgrades") renderUpgradeStore(true);
  }

  function renderUpgradeStore(inline=false){
    const area = document.getElementById(inline ? "lojaUpgradesInline" : "listaUpgrades"), save=Store.saveData(); if(!area) return; area.innerHTML="";
    Object.entries(DATA.upgrades).forEach(([key,u])=>{
      const level = save.upgrades[key] || 0; const maxed = level >= u.max; const cost = u.baseCost * (level + 1);
      const div=document.createElement("div"); div.className="upgrade-card";
      div.innerHTML = `
        <span>${u.icon}</span>
        <div style="flex:1"><b>${u.nome}</b><br><small>${u.desc}</small><br><small>Nível: ${level}/${u.max}</small></div>
        <div>${maxed ? `<strong>MAX</strong>` : `<button onclick="UI.buyUpgrade('${key}')">🪙 ${cost}</button>`}</div>`;
      area.appendChild(div);
    });
    refreshMoney();
  }

  function buyUpgrade(key){
    const save=Store.saveData(), u=DATA.upgrades[key]; const level = save.upgrades[key] || 0; if(level >= u.max){ toast("Upgrade já está no máximo."); return; }
    const cost = u.baseCost * (level + 1); if(save.moedas < cost){ toast("Moedas insuficientes para upgrade."); return; }
    save.moedas -= cost; save.upgrades[key] = level + 1; save.missionProgress.upgradesComprados += 1; if(save.missionProgress.upgradesComprados >= 3) unlockAchievement("upgrades3"); Store.persist(); toast(`${u.nome} melhorado!`); renderUpgradeStore(); refreshMoney();
  }

  function renderAchievements(){
    const lista=document.getElementById("listaConquistas"); lista.innerHTML=""; const save=Store.saveData();
    Object.keys(DATA.achievements).forEach(id=>{ const c=DATA.achievements[id], ok=save.achievements[id]; const item=document.createElement("div"); item.className="conquista"; if(!ok) item.classList.add("locked"); item.innerHTML=`<span>${ok ? c.icon : "🔒"}</span><div><b>${c.nome}</b><br><small>${c.desc}</small></div><strong>${ok ? "OK" : "Pendente"}</strong>`; lista.appendChild(item); });
  }

  function unlockAchievement(id){ const save=Store.saveData(); if(save.achievements[id]) return; save.achievements[id]=true; Store.persist(); toast(`🏅 Conquista desbloqueada: ${DATA.achievements[id].nome}`); renderAchievements(); }
  function updateMission(key, value, add=true){ const save=Store.saveData(); if(add) save.missionProgress[key]=(save.missionProgress[key]||0)+value; else save.missionProgress[key]=Math.max(save.missionProgress[key]||0,value); Store.persist(); }

  function renderMissions(){
    const lista=document.getElementById("listaMissoes"); lista.innerHTML=""; const save=Store.saveData();
    Object.keys(DATA.missions).forEach(id=>{ const m=DATA.missions[id], atual=Math.min(save.missionProgress[m.progressKey]||0,m.goal), pct=Math.min(100,(atual/m.goal)*100), complete=atual>=m.goal, claimed=save.missionsClaimed[id];
      const item=document.createElement("div"); item.className="missao"; if(!complete) item.classList.add("locked");
      item.innerHTML = `<span>${complete ? m.icon : "🔒"}</span><div style="flex:1"><b>${m.nome}</b><br><small>${m.desc}</small><div class="progresso"><div style="width:${pct}%"></div></div><small>${atual}/${m.goal} — recompensa: 🪙 ${m.reward}</small></div><div>${claimed ? "<strong>OK</strong>" : complete ? `<button onclick="UI.claimMission('${id}')">Resgatar</button>` : "<strong>Pendente</strong>"}</div>`;
      lista.appendChild(item);
    });
  }

  function claimMission(id){ const save=Store.saveData(), m=DATA.missions[id]; if(!m||save.missionsClaimed[id]) return; const atual=save.missionProgress[m.progressKey]||0; if(atual<m.goal) return; save.missionsClaimed[id]=true; save.moedas += m.reward; Store.persist(); refreshMoney(); renderMissions(); toast(`Missão concluída! +${m.reward} moedas.`); }

  function renderRanking(){ const s=Store.saveData().stats; const cards=[["🎮","Melhor Single",s.bestSingle],["♾️","Melhor Infinito",s.bestInfinite],["⚔️","Melhor Boss Rush",s.bestBossRush],["🏆","Melhor Campanha",s.bestCampaign],["🥑","Abacates comidos",s.totalAvocados],["🌟","Dourados comidos",s.totalGolden],["👑","Bosses derrotados",s.bossKills],["🕹️","Partidas jogadas",s.gamesPlayed],["🐍","Vitórias P1",s.winsP1],["🐍","Vitórias P2",s.winsP2]]; document.getElementById("rankingCards").innerHTML = cards.map(([i,l,v])=>`<div class="stat">${i} ${l}<b>${v||0}</b></div>`).join(""); }


  function currentDailyChallenge(){
    const save = Store.saveData();
    const today = todayKey();

    const dayNumber = Math.floor(Date.now() / 86400000);
    const types = [
      {type:"score",label:"Faça 18 pontos em qualquer modo",target:18,reward:35},
      {type:"avocados",label:"Coma 15 abacates",target:15,reward:30},
      {type:"boss",label:"Derrote 1 boss",target:1,reward:55},
      {type:"infinite",label:"Faça 20 pontos no Modo Infinito",target:20,reward:45}
    ];

    const challenge = types[dayNumber % types.length];

    if(save.dailyChallenge.date !== today || save.dailyChallenge.type !== challenge.type){
      save.dailyChallenge = {
        date: today,
        completed:false,
        claimed:false,
        progress:0,
        target:challenge.target,
        type:challenge.type
      };
      Store.persist();
    }

    return {...challenge, ...save.dailyChallenge};
  }

  function updateDailyChallenge(type, amount, absolute=false){
    const save = Store.saveData();
    const ch = currentDailyChallenge();

    if(ch.type !== type) return;

    if(absolute){
      save.dailyChallenge.progress = Math.max(save.dailyChallenge.progress || 0, amount);
    }else{
      save.dailyChallenge.progress = (save.dailyChallenge.progress || 0) + amount;
    }

    if(save.dailyChallenge.progress >= ch.target){
      save.dailyChallenge.progress = ch.target;
      save.dailyChallenge.completed = true;
      toast("📅 Desafio diário concluído!");
    }

    Store.persist();
  }

  function renderProfile(){
    const save = Store.saveData();
    const stats = save.stats;
    const unlockedSkins = save.unlocked.length;
    const upgrades = Object.values(save.upgrades || {}).reduce((a,b)=>a+(b||0),0);
    const phases = save.unlockedLevels.length;

    document.getElementById("perfilSkins").textContent = unlockedSkins;
    document.getElementById("perfilUpgrades").textContent = upgrades;
    document.getElementById("perfilFases").textContent = phases;

    const minutes = Math.floor((stats.playSeconds || 0) / 60);
    const cards = [
      ["🪙","Moedas",save.moedas],
      ["🏆","Recorde",save.recorde],
      ["🥑","Abacates",stats.totalAvocados],
      ["👑","Bosses",stats.bossKills],
      ["🕹️","Partidas",stats.gamesPlayed],
      ["⏱️","Tempo jogado",`${minutes} min`]
    ];

    document.getElementById("perfilStats").innerHTML = cards.map(([i,l,v])=>`
      <div class="stat">${i} ${l}<b>${v || 0}</b></div>
    `).join("");
  }

  function renderDailyChallenge(){
    const ch = currentDailyChallenge();
    document.getElementById("dailyChallengeText").textContent = ch.label;
    document.getElementById("dailyChallengeReward").textContent = ch.reward;
    document.getElementById("dailyChallengeProgress").style.width = `${Math.min(100,(ch.progress/ch.target)*100)}%`;
    document.getElementById("dailyChallengeStatus").textContent =
      ch.claimed ? "Recompensa já resgatada hoje." :
      ch.completed ? "Concluído! Pode resgatar." :
      `Progresso: ${ch.progress}/${ch.target}`;
  }

  function claimDailyChallengeReward(){
    const save = Store.saveData();
    const ch = currentDailyChallenge();

    if(!save.dailyChallenge.completed){
      toast("Complete o desafio primeiro.");
      renderDailyChallenge();
      return;
    }

    if(save.dailyChallenge.claimed){
      toast("Você já resgatou essa recompensa.");
      renderDailyChallenge();
      return;
    }

    save.moedas += ch.reward;
    save.dailyChallenge.claimed = true;
    Store.persist();

    toast(`📅 Desafio diário: +${ch.reward} moedas!`);
    refreshAll();
    renderDailyChallenge();
  }

  function renderLevelSelect(){ const save=Store.saveData(); const el=document.getElementById("listaFases"); el.innerHTML = DATA.campaign.map((fase,index)=>{ const unlocked = save.unlockedLevels.includes(index); return `<div class="level-card ${unlocked?"":"locked"}"><span>${unlocked?fase.icon:"🔒"}</span><div style="flex:1"><b>${fase.nome}</b><br><small>Mapa: ${fase.mapa}${fase.boss?" — Boss: "+fase.boss:" — Meta: "+fase.meta}</small></div><button class="${unlocked?"":"bloqueado"}" ${unlocked?`onclick="Game.startLevel(${index})"`:""}>${unlocked?"Jogar":"Bloqueada"}</button></div>`; }).join(""); }
  function unlockLevel(index){ const save=Store.saveData(); if(index>=DATA.campaign.length) return; if(!save.unlockedLevels.includes(index)){ save.unlockedLevels.push(index); save.unlockedLevels.sort((a,b)=>a-b); Store.persist(); toast(`🗺️ Nova fase liberada: ${DATA.campaign[index].nome}`); } }

  function toggleSoundSetting(){ const save=Store.saveData(); save.sound=!save.sound; document.getElementById("somLigado").checked=save.sound; Store.persist(); if(!save.sound) Sound.stopMusic(); toast(save.sound ? "Som ligado." : "Som desligado."); }
  function toggleSoundPause(){ toggleSoundSetting(); document.getElementById("somStatusPausa").textContent = Store.saveData().sound ? "Som ligado" : "Som desligado"; if(Store.saveData().sound) Sound.music(); }
  function resetCoins(){ Store.saveData().moedas=0; Store.persist(); refreshMoney(); toast("Moedas resetadas."); }
  function resetRanking(){ Store.resetRanking(); refreshAll(); toast("Ranking resetado."); }
  function resetEverything(){ Store.resetAll(); document.getElementById("somLigado").checked=Store.saveData().sound; document.getElementById("graficos").value=Store.saveData().graphics; refreshAll(); toast("Tudo foi resetado."); }
  function showTutorialIfNeeded(){ 
    if(!Store.saveData().tutorialSeen) open("tutorial");
    else checkDailyReward();
  }
  function closeTutorial(){ Store.saveData().tutorialSeen=true; Store.persist(); backToMenu(); setTimeout(checkDailyReward, 350); }
  function showTutorialAgain(){ open("tutorial"); }


  function todayKey(){
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function yesterdayKey(){
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function dailyRewardAmount(streak){
    if(streak >= 7) return 80;
    return 10 + Math.min(streak - 1, 6) * 8;
  }

  function checkDailyReward(){
    const save = Store.saveData();
    const today = todayKey();
    if(save.dailyReward.lastClaim === today) return;

    const nextStreak = save.dailyReward.lastClaim === yesterdayKey()
      ? save.dailyReward.streak + 1
      : 1;

    const amount = dailyRewardAmount(nextStreak);
    document.getElementById("dailyStreak").textContent = nextStreak;
    document.getElementById("dailyCoins").textContent = amount;
    document.getElementById("dailyRewardText").textContent =
      `Hoje você pode resgatar ${amount} moedas. Sequência atual: ${nextStreak} dia(s).`;
    open("recompensaDiaria");
  }

  function claimDailyReward(){
    const save = Store.saveData();
    const today = todayKey();

    if(save.dailyReward.lastClaim === today){
      toast("Você já resgatou a recompensa de hoje.");
      backToMenu();
      return;
    }

    const nextStreak = save.dailyReward.lastClaim === yesterdayKey()
      ? save.dailyReward.streak + 1
      : 1;

    const amount = dailyRewardAmount(nextStreak);
    save.dailyReward.lastClaim = today;
    save.dailyReward.streak = nextStreak;
    save.moedas += amount;

    Store.persist();
    refreshAll();
    toast(`🎁 Recompensa diária: +${amount} moedas!`);
    backToMenu();
  }


  function changeGraphicsFromPause(value){
    Store.saveData().graphics = value;
    Store.persist();
    const main = document.getElementById("graficos");
    if(main) main.value = value;
    toast(`Qualidade alterada para ${value}. Reinicie a fase para aplicar tudo.`);
  }

  function refreshAll(){ refreshMoney(); renderSkins(); renderStore(); renderUpgradeStore(); renderAchievements(); renderMissions(); renderRanking(); renderLevelSelect(); renderProfile(); renderDailyChallenge(); document.getElementById("graficos").value = Store.saveData().graphics || "medio";
    const gp = document.getElementById("graficosPausa");
    if(gp) gp.value = Store.saveData().graphics || "medio"; }

  function openPlayMenu(){ open("modoJogo"); }
  function openStore(){ open("loja"); renderStore(); setShopTab("skins"); }
  function openUpgradeStore(){ open("upgrades"); renderUpgradeStore(); }
  function openMissions(){ open("missoes"); renderMissions(); }
  function openAchievements(){ open("conquistas"); renderAchievements(); }
  function openSettings(){ open("configuracoes"); }
  function openHowToPlay(){ open("comoJogar"); }
  function openCredits(){ open("creditos"); }
  function openRanking(){ open("ranking"); renderRanking(); }
  function openProfile(){ open("perfilJogador"); renderProfile(); }
  function openDailyChallenge(){ open("desafioDiario"); renderDailyChallenge(); }
  function openLevelSelect(){ open("selecionarFase"); renderLevelSelect(); }

  document.getElementById("somLigado").checked = Store.saveData().sound; document.getElementById("graficos").value = Store.saveData().graphics || "medio";
    const gp = document.getElementById("graficosPausa");
    if(gp) gp.value = Store.saveData().graphics || "medio"; refreshAll(); setTimeout(showTutorialIfNeeded, 450);

  return {setBody,open,backToMenu,toast,refreshMoney,refreshAll,openPlayMenu,openStore,openUpgradeStore,setShopTab,openMissions,openAchievements,openSettings,openHowToPlay,openCredits,openRanking,openProfile,openDailyChallenge,openLevelSelect,renderSkins,renderStore,renderUpgradeStore,renderAchievements,renderMissions,renderRanking,renderLevelSelect,claimMission,buyUpgrade,buySkin,equipPreviewSkin,renderShopPreview,unlockAchievement,updateMission,unlockLevel,toggleSoundSetting,toggleSoundPause,resetCoins,resetRanking,resetEverything,closeTutorial,showTutorialAgain,checkDailyReward,claimDailyReward,changeGraphicsFromPause,setShopTab,currentDailyChallenge,updateDailyChallenge,renderDailyChallenge,claimDailyChallengeReward,renderProfile};
})();
