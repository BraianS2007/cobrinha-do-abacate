const UI = (() => {
  const telas = ["menu","loja","upgrades","missoes","conquistas","configuracoes","comoJogar","creditos","gameOver","pausa","faseCompleta","contador","ranking","selecionarFase","tutorial","vitoriaEpica","modoJogo","recompensaDiaria","levelIntro","perfilJogador","desafioDiario","novidadesVersao","reportarBug","personagem","missaoSemanal","codigos"];
  let shopPreviewSkin = Store.saveData().selectedP1 || "verde";
  const APP_VERSION = "1.4.0";
  let deferredInstallPrompt = null;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
  });

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
    renderSpecialItems();
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
    if(tab === "especiais") renderSpecialItems();
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
    const save=Store.saveData();
    if(!save.upgrades) save.upgrades = {};
    if(!save.missionProgress) save.missionProgress = {};

    const u=DATA.upgrades[key];
    const level = Number(save.upgrades[key] || 0);

    if(level >= u.max){
      toast("Upgrade já está no máximo.");
      return;
    }

    const cost = u.baseCost * (level + 1);

    if(save.moedas < cost){
      toast(`Moedas insuficientes. Precisa de ${cost} moedas.`);
      return;
    }

    save.moedas -= cost;
    save.upgrades[key] = level + 1;
    save.missionProgress.upgradesComprados = Number(save.missionProgress.upgradesComprados || 0) + 1;

    if(save.missionProgress.upgradesComprados >= 3) unlockAchievement("upgrades3");

    Store.persist();

    toast(`✅ ${u.nome} nível ${level+1}/${u.max} aplicado!`);

    renderUpgradeStore(false);
    renderUpgradeStore(true);
    renderStore();
    refreshMoney();
    renderProfile();
  }

  function renderAchievements(){
    const lista=document.getElementById("listaConquistas"); lista.innerHTML=""; const save=Store.saveData();
    Object.keys(DATA.achievements).forEach(id=>{ const c=DATA.achievements[id], ok=save.achievements[id]; const item=document.createElement("div"); item.className="conquista"; if(!ok) item.classList.add("locked"); item.innerHTML=`<span>${ok ? c.icon : "🔒"}</span><div><b>${c.nome}</b><br><small>${c.desc}</small></div><strong>${ok ? "OK" : "Pendente"}</strong>`; lista.appendChild(item); });
  }

  function unlockAchievement(id){
    const save=Store.saveData();
    if(save.achievements[id]) return;

    save.achievements[id]=true;
    Store.persist();

    toast(`🏅 Conquista desbloqueada: ${DATA.achievements[id].nome}`);
    addXP(35, "Conquista");

    const skinRewards = {
      dezPontos:"coral",
      derrotouBoss:"fogo",
      venceuMulti:"neon",
      zerouCampanha:"ouro"
    };

    if(skinRewards[id]){
      unlockSkinReward(skinRewards[id], DATA.achievements[id].nome);
    }

    renderAchievements();
  }
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

  function renderRanking(){ const s=Store.saveData().stats; const cards=[["🎮","Melhor Single",s.bestSingle],["♾️","Melhor Infinito",s.bestInfinite],["⚔️","Melhor Boss Rush",s.bestBossRush],["🏆","Melhor Campanha",s.bestCampaign],["🥑","Abacates comidos",s.totalAvocados],["🌟","Dourados comidos",s.totalGolden],["👑","Bosses derrotados",s.bossKills],["🕹️","Partidas jogadas",s.gamesPlayed],["🐍","Vitórias P1",s.winsP1],["🐍","Vitórias P2",s.winsP2]]; document.getElementById("rankingCards").innerHTML = cards.map(([i,l,v])=>`<div class="stat">${i} ${l}<b>${v||0}</b></div>`).join(""); renderLocalRanking(); }




  function renderSpecialItems(){
    const area = document.getElementById("listaItensEspeciais");
    if(!area || !DATA.specialItems) return;

    const save = Store.saveData();
    if(!save.inventory) save.inventory = {};
    if(!save.activeItems) save.activeItems = {};

    area.innerHTML = Object.keys(DATA.specialItems).map(key=>{
      const item = DATA.specialItems[key];
      const qtd = Number(save.inventory[key] || 0);
      const active = !!save.activeItems[key];

      return `
        <div class="special-item-card">
          <div class="icon">${item.icon}</div>
          <div style="flex:1">
            <b>${item.nome}</b><br>
            <small>${item.desc}</small><br>
            <small>Preço: 🪙 ${item.preco} • Estoque: ${qtd} ${active ? "• Ativo na próxima partida" : ""}</small>
          </div>
          <div class="special-item-actions">
            <button onclick="UI.buySpecialItem('${key}')">Comprar</button>
            <button onclick="UI.activateSpecialItem('${key}')" ${qtd<=0 || active ? "disabled" : ""}>Ativar</button>
          </div>
        </div>
      `;
    }).join("");
  }

  function buySpecialItem(key){
    const save = Store.saveData();
    const item = DATA.specialItems[key];

    if(!item) return;
    if(!save.inventory) save.inventory = {};

    if(save.moedas < item.preco){
      toast(`Moedas insuficientes. Precisa de ${item.preco}.`);
      return;
    }

    save.moedas -= item.preco;
    save.inventory[key] = Number(save.inventory[key] || 0) + 1;

    Store.persist();
    toast(`Comprou: ${item.nome}`);
    refreshAll();
  }

  function activateSpecialItem(key){
    const save = Store.saveData();
    const item = DATA.specialItems[key];

    if(!item) return;
    if(!save.inventory) save.inventory = {};
    if(!save.activeItems) save.activeItems = {};

    if((save.inventory[key] || 0) <= 0){
      toast("Compre esse item primeiro.");
      return;
    }

    save.inventory[key] -= 1;
    save.activeItems[key] = true;

    Store.persist();
    toast(`${item.nome} ativado para a próxima partida!`);
    refreshAll();
  }

  function consumeActiveItems(){
    const save = Store.saveData();
    const items = {...(save.activeItems || {})};
    save.activeItems = {};
    Store.persist();
    return items;
  }


  function levelFromXP(xp){
    xp = Number(xp || 0);
    return Math.floor(Math.sqrt(xp / 80)) + 1;
  }

  function xpForLevel(level){
    level = Math.max(1, Number(level || 1));
    return Math.pow(level - 1, 2) * 80;
  }

  function xpForNextLevel(level){
    return Math.pow(level, 2) * 80;
  }

  function addXP(amount, reason="XP"){
    const save = Store.saveData();
    const before = levelFromXP(save.xp || 0);

    save.xp = Number(save.xp || 0) + Number(amount || 0);

    const after = levelFromXP(save.xp || 0);
    Store.persist();

    showXPToast(`+${amount} XP • ${reason}`);

    if(after > before){
      save.moedas = Number(save.moedas || 0) + (after - before) * 25;
      Store.persist();
      showXPToast(`🎉 Nível ${after}! +${(after-before)*25} moedas`);
    }

    refreshAll();
  }

  function showXPToast(text){
    const el = document.createElement("div");
    el.className = "xp-toast";
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 1900);
  }

  function setLevelStars(index, stars){
    const save = Store.saveData();
    if(!save.levelStars) save.levelStars = {};

    const current = Number(save.levelStars[index] || 0);
    const next = Math.max(current, Math.max(0, Math.min(3, Number(stars || 0))));

    save.levelStars[index] = next;
    Store.persist();

    if(next > current){
      addXP(next * 20, `${next} estrela(s) na fase`);
    }

    return next;
  }

  function starText(stars){
    stars = Number(stars || 0);
    return "⭐".repeat(stars) + "☆".repeat(3-stars);
  }

  function unlockSkinReward(key, reason){
    const save = Store.saveData();

    if(!DATA.skins[key]) return false;
    if(save.unlocked.includes(key)) return false;

    save.unlocked.push(key);
    Store.persist();

    toast(`🎁 Skin liberada: ${DATA.skins[key].nome} (${reason})`);
    refreshAll();
    return true;
  }

  function openCodes(){
    const input = document.getElementById("promoCodeInput");
    const result = document.getElementById("codigoResultado");
    if(input) input.value = "";
    if(result) result.textContent = "";
    open("codigos");
  }

  function redeemCode(){
    const input = document.getElementById("promoCodeInput");
    const result = document.getElementById("codigoResultado");
    const code = String(input?.value || "").trim().toUpperCase();
    const save = Store.saveData();

    if(!code){
      if(result) result.innerHTML = `<span class="code-error">Digite um código.</span>`;
      return;
    }

    if(!save.redeemedCodes) save.redeemedCodes = {};
    if(save.redeemedCodes[code]){
      if(result) result.innerHTML = `<span class="code-error">Esse código já foi usado.</span>`;
      return;
    }

    const codes = {
      ABACATE100: () => { save.moedas += 100; return "Você ganhou 100 moedas!"; },
      XP50: () => { save.xp = Number(save.xp || 0) + 50; return "Você ganhou 50 XP!"; },
      BOSS: () => { save.moedas += 60; save.xp = Number(save.xp || 0) + 30; return "Você ganhou 60 moedas e 30 XP!"; },
      SKINREAL: () => {
        if(!save.unlocked.includes("coral")) save.unlocked.push("coral");
        return "Skin Coral Real liberada!";
      }
    };

    if(!codes[code]){
      if(result) result.innerHTML = `<span class="code-error">Código inválido.</span>`;
      return;
    }

    const msg = codes[code]();
    save.redeemedCodes[code] = true;
    Store.persist();

    if(result) result.innerHTML = `<span class="code-success">✅ ${msg}</span>`;

    refreshAll();
  }

  function weekKey(){
    const d = new Date();
    const first = new Date(d.getFullYear(),0,1);
    const days = Math.floor((d - first) / 86400000);
    const week = Math.ceil((days + first.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2,"0")}`;
  }

  function currentWeeklyMission(){
    const save = Store.saveData();
    const wk = weekKey();
    const weekNumber = Number(wk.split("W")[1] || 1);

    const missions = [
      {type:"boss",label:"Derrote 3 bosses na semana",target:3,reward:120,xp:120},
      {type:"avocados",label:"Coma 100 abacates na semana",target:100,reward:100,xp:100},
      {type:"infinite",label:"Faça 50 pontos no Modo Infinito",target:50,reward:130,xp:110},
      {type:"score",label:"Faça 80 pontos somando partidas",target:80,reward:90,xp:90}
    ];

    const mission = missions[weekNumber % missions.length];

    if(save.weeklyMission.week !== wk || save.weeklyMission.type !== mission.type){
      save.weeklyMission = {
        week:wk,
        completed:false,
        claimed:false,
        progress:0,
        target:mission.target,
        type:mission.type
      };
      Store.persist();
    }

    return {...mission, ...save.weeklyMission};
  }

  function updateWeeklyMission(type, amount, absolute=false){
    const save = Store.saveData();
    const mission = currentWeeklyMission();

    if(mission.type !== type) return;

    if(absolute){
      save.weeklyMission.progress = Math.max(save.weeklyMission.progress || 0, amount);
    }else{
      save.weeklyMission.progress = Number(save.weeklyMission.progress || 0) + Number(amount || 0);
    }

    if(save.weeklyMission.progress >= mission.target){
      save.weeklyMission.progress = mission.target;
      save.weeklyMission.completed = true;
      toast("🗓️ Missão semanal concluída!");
    }

    Store.persist();
  }

  function renderWeeklyMission(){
    const mission = currentWeeklyMission();
    const text = document.getElementById("weeklyMissionText");
    const reward = document.getElementById("weeklyMissionReward");
    const progress = document.getElementById("weeklyMissionProgress");
    const status = document.getElementById("weeklyMissionStatus");

    if(text) text.textContent = mission.label;
    if(reward) reward.textContent = mission.reward;
    if(progress) progress.style.width = `${Math.min(100,(mission.progress/mission.target)*100)}%`;
    if(status) status.textContent =
      mission.claimed ? "Recompensa já resgatada nesta semana." :
      mission.completed ? `Concluído! Pode resgatar ${mission.reward} moedas e ${mission.xp} XP.` :
      `Progresso: ${mission.progress}/${mission.target}`;
  }

  function openWeeklyMission(){
    open("missaoSemanal");
    renderWeeklyMission();
  }

  function claimWeeklyMissionReward(){
    const save = Store.saveData();
    const mission = currentWeeklyMission();

    if(!save.weeklyMission.completed){
      toast("Complete a missão semanal primeiro.");
      renderWeeklyMission();
      return;
    }

    if(save.weeklyMission.claimed){
      toast("Você já resgatou essa missão semanal.");
      renderWeeklyMission();
      return;
    }

    save.moedas += mission.reward;
    save.weeklyMission.claimed = true;
    Store.persist();

    addXP(mission.xp, "Missão semanal");
    toast(`🗓️ Missão semanal: +${mission.reward} moedas!`);

    renderWeeklyMission();
    refreshAll();
  }


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
    const level = levelFromXP(save.xp || 0);
    const base = xpForLevel(level);
    const next = xpForNextLevel(level);
    const current = Number(save.xp || 0);

    document.getElementById("perfilSkins").textContent = unlockedSkins;
    document.getElementById("perfilUpgrades").textContent = upgrades;
    document.getElementById("perfilFases").textContent = phases;

    const perfilNivel = document.getElementById("perfilNivel");
    const perfilXP = document.getElementById("perfilXP");
    const perfilNextXP = document.getElementById("perfilNextXP");
    const perfilXPBar = document.getElementById("perfilXPBar");

    if(perfilNivel) perfilNivel.textContent = level;
    if(perfilXP) perfilXP.textContent = current;
    if(perfilNextXP) perfilNextXP.textContent = next;
    if(perfilXPBar) perfilXPBar.style.width = `${Math.min(100, ((current-base)/(next-base))*100)}%`;

    const minutes = Math.floor((stats.playSeconds || 0) / 60);
    const totalStars = Object.values(save.levelStars || {}).reduce((a,b)=>a+Number(b||0),0);

    const cards = [
      ["⭐","Estrelas",totalStars],
      ["🧪","XP total",current],
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
      renderDailyChallenge(); renderWeeklyMission();
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
    if(shouldShowVersionNews()){
      openVersionNews();
      return;
    }

    if(!Store.saveData().tutorialSeen) open("tutorial");
    else checkDailyReward();
  }
  function closeTutorial(){ 
    Store.saveData().tutorialSeen=true; 
    Store.persist(); 
    backToMenu(); 
    setTimeout(()=>{ if(!shouldShowVersionNews()) checkDailyReward(); }, 350); 
  }
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



  function currentPlayerName(){
    const save = Store.saveData();
    return String(save.playerName || "Braian").slice(0,18);
  }

  function savePlayerName(){
    const input = document.getElementById("playerNameInput");
    const name = String(input?.value || "").trim().slice(0,18);

    if(!name){
      toast("Digite um nome primeiro.");
      return;
    }

    Store.saveData().playerName = name;
    Store.persist();
    toast(`Nome salvo: ${name}`);
    refreshAll();
  }

  function syncPlayerName(){
    const name = currentPlayerName();
    const input = document.getElementById("playerNameInput");
    const perfil = document.getElementById("perfilNome");

    if(input) input.value = name;
    if(perfil) perfil.textContent = name;
  }

  let characterPreviewSkin = Store.saveData().selectedP1 || "verde";

  function openCharacterSelect(){
    characterPreviewSkin = Store.saveData().selectedP1 || "verde";
    open("personagem");
    renderCharacterSelect();
  }

  function renderCharacterSelect(){
    const grid = document.getElementById("personagemGrid");
    if(!grid) return;

    grid.innerHTML = "";
    Object.keys(DATA.skins).forEach(key=>{
      const card = skinCard(key, 1, true);
      card.onclick = () => {
        characterPreviewSkin = key;

        if(!Store.saveData().unlocked.includes(key)){
          buySkin(key);
        }

        renderCharacterSelect();
      };
      grid.appendChild(card);
    });

    renderCharacterPreview();
  }

  function renderCharacterPreview(){
    const box = document.getElementById("personagemPreview");
    if(!box) return;

    const save = Store.saveData();
    const key = characterPreviewSkin || save.selectedP1 || "verde";
    const s = DATA.skins[key];
    const unlocked = save.unlocked.includes(key);

    const body = Array.from({length:6}).map((_,i)=>`
      <span style="background:linear-gradient(135deg,${i%2?s.cor2:s.cor1},${s.brilho})"></span>
    `).join("");

    box.innerHTML = `
      <div class="character-card-large">
        <div class="character-snake-big">${body}</div>
        <h3>${s.nome}</h3>
        <p>
          <b>Raridade:</b> ${s.raridade.toUpperCase()}<br>
          <b>Efeito:</b> ${s.efeito}<br>
          <b>Status:</b> ${unlocked ? "Liberada" : "Bloqueada - 🪙 " + s.preco}
        </p>
        <div class="character-actions">
          ${unlocked ? `
            <button onclick="UI.equipCharacter('${key}',1)">Equipar P1</button>
            <button onclick="UI.equipCharacter('${key}',2)">Equipar P2</button>
          ` : `<button onclick="UI.buySkin('${key}')">Comprar skin</button>`}
        </div>
      </div>
    `;
  }

  function equipCharacter(key, player){
    const save = Store.saveData();

    if(!save.unlocked.includes(key)){
      toast("Compre essa skin primeiro.");
      return;
    }

    if(player === 1) save.selectedP1 = key;
    if(player === 2) save.selectedP2 = key;

    Store.persist();
    toast(`${DATA.skins[key].nome} equipada no P${player}!`);
    renderCharacterSelect();
    refreshAll();
  }

  function recordScore(mode, score, extra={}){
    const save = Store.saveData();
    if(!Array.isArray(save.localScores)) save.localScores = [];

    if(mode === "treino" || mode === "tutorialmap") return;

    const item = {
      name: currentPlayerName(),
      mode,
      score: Number(score || 0),
      coins: Number(extra.coins || 0),
      time: Number(extra.time || 0),
      date: new Date().toLocaleDateString("pt-BR")
    };

    save.localScores.push(item);
    save.localScores.sort((a,b)=>b.score-a.score || b.coins-a.coins);
    save.localScores = save.localScores.slice(0,50);
    Store.persist();
  }

  function renderLocalRanking(){
    const list = document.getElementById("rankingLista");
    if(!list) return;

    const scores = Store.saveData().localScores || [];

    if(!scores.length){
      list.innerHTML = `<div class="rank-empty">Ainda não tem partidas salvas no ranking.</div>`;
      return;
    }

    const modeName = {
      single:"Single",
      multi:"Multi",
      campanha:"Campanha",
      infinito:"Infinito",
      bossrush:"Boss Rush"
    };

    list.innerHTML = scores.slice(0,10).map((r,i)=>`
      <div class="rank-row">
        <span><b>#${i+1}</b></span>
        <span><b>${r.name || "Jogador"}</b><br><small>${modeName[r.mode] || r.mode} • ${r.date || ""}</small></span>
        <span>⭐ ${r.score || 0}</span>
        <span>🪙 ${r.coins || 0}</span>
      </div>
    `).join("");
  }

  function clearLocalRanking(){
    Store.saveData().localScores = [];
    Store.persist();
    renderLocalRanking();
    toast("Ranking local limpo.");
  }


  function syncVolumeControls(){
    const save = Store.saveData();
    const effect = Number(save.effectVolume ?? 80);
    const music = Number(save.musicVolume ?? 55);

    const e = document.getElementById("effectVolume");
    const m = document.getElementById("musicVolume");
    const el = document.getElementById("effectVolumeLabel");
    const ml = document.getElementById("musicVolumeLabel");

    if(e) e.value = effect;
    if(m) m.value = music;
    if(el) el.textContent = effect;
    if(ml) ml.textContent = music;
  }

  function setEffectVolume(value){
    const save = Store.saveData();
    save.effectVolume = Math.max(0, Math.min(100, Number(value)));
    Store.persist();
    syncVolumeControls();
    Sound.click();
  }

  function setMusicVolume(value){
    const save = Store.saveData();
    save.musicVolume = Math.max(0, Math.min(100, Number(value)));
    Store.persist();
    syncVolumeControls();

    if(save.sound){
      Sound.stopMusic();
      Sound.music();
    }
  }

  function shouldShowVersionNews(){
    return Store.saveData().lastSeenVersion !== APP_VERSION;
  }

  function openVersionNews(){
    open("novidadesVersao");
  }

  function closeVersionNews(){
    const save = Store.saveData();
    save.lastSeenVersion = APP_VERSION;
    save.version = APP_VERSION;
    Store.persist();
    backToMenu();
    setTimeout(showTutorialIfNeeded, 200);
  }

  function openBugReport(){
    const save = Store.saveData();
    const info = document.getElementById("bugInfoText");
    if(info){
      info.innerHTML = `
        Versão: ${APP_VERSION}<br>
        Modo salvo: ${save.graphics || "medio"}<br>
        Som: ${save.sound === false ? "desligado" : "ligado"}<br>
        Skins: ${save.unlocked?.length || 0}<br>
        Moedas: ${save.moedas || 0}<br><br>
        Copie isso e mande junto com print ou vídeo do bug.
      `;
    }
    open("reportarBug");
  }

  async function copyBugInfo(){
    const text = document.getElementById("bugInfoText")?.innerText || `Cobrinha do Abacate ${APP_VERSION}`;
    try{
      await navigator.clipboard.writeText(text);
      toast("Informações copiadas!");
    }catch{
      toast("Não consegui copiar. Tire print dessa tela.");
    }
  }

  async function promptInstall(){
    if(deferredInstallPrompt){
      deferredInstallPrompt.prompt();
      try{ await deferredInstallPrompt.userChoice; }catch{}
      deferredInstallPrompt = null;
      return;
    }

    toast("Para instalar: no navegador, toque em ⋮ e escolha 'Adicionar à tela inicial'.");
  }


  function refreshAll(){ refreshMoney(); renderSkins(); renderStore(); renderUpgradeStore(); renderAchievements(); renderMissions(); renderRanking(); renderLevelSelect(); renderProfile(); renderSpecialItems(); renderDailyChallenge(); document.getElementById("graficos").value = Store.saveData().graphics || "medio";
    const gp = document.getElementById("graficosPausa");
    if(gp) gp.value = Store.saveData().graphics || "medio"; syncVolumeControls(); syncPlayerName(); }

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
  function openVersionNews(){ open("novidadesVersao"); }
  
  function openLevelSelect(){ open("selecionarFase"); renderLevelSelect(); }

  document.getElementById("somLigado").checked = Store.saveData().sound; document.getElementById("graficos").value = Store.saveData().graphics || "medio";
    const gp = document.getElementById("graficosPausa");
    if(gp) gp.value = Store.saveData().graphics || "medio"; syncVolumeControls(); syncPlayerName(); refreshAll(); setTimeout(showTutorialIfNeeded, 450);

  return {setBody,open,backToMenu,toast,refreshMoney,refreshAll,openPlayMenu,openStore,openUpgradeStore,setShopTab,openMissions,openAchievements,openSettings,openHowToPlay,openCredits,openRanking,openProfile,openDailyChallenge,openLevelSelect,renderSkins,renderStore,renderUpgradeStore,renderAchievements,renderMissions,renderRanking,renderLevelSelect,claimMission,buyUpgrade,buySkin,equipPreviewSkin,renderShopPreview,unlockAchievement,updateMission,unlockLevel,toggleSoundSetting,toggleSoundPause,resetCoins,resetRanking,resetEverything,closeTutorial,showTutorialAgain,checkDailyReward,claimDailyReward,changeGraphicsFromPause,setShopTab,currentDailyChallenge,updateDailyChallenge,renderDailyChallenge,claimDailyChallengeReward,renderProfile,openVersionNews,closeVersionNews,openBugReport,copyBugInfo,promptInstall,setEffectVolume,setMusicVolume,syncVolumeControls,savePlayerName,syncPlayerName,openCharacterSelect,renderCharacterSelect,renderCharacterPreview,equipCharacter,recordScore,renderLocalRanking,clearLocalRanking,currentPlayerName,addXP,levelFromXP,setLevelStars,unlockSkinReward,openCodes,redeemCode,currentWeeklyMission,updateWeeklyMission,renderWeeklyMission,openWeeklyMission,claimWeeklyMissionReward,starText,renderSpecialItems,buySpecialItem,activateSpecialItem,consumeActiveItems};
})();
