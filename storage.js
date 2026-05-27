const Store = (() => {
  const defaultSave = {
    moedas:0,
    recorde:0,
    playerName:"Braian",
    localScores:[],
    xp:0,
    levelStars:{},
    redeemedCodes:{},
    inventory:{},
    activeItems:{},
    weeklyMission:{week:"",completed:false,claimed:false,progress:0,target:0,type:""},
    unlocked:["verde","azul"],
    achievements:{},
    missionsClaimed:{},
    selectedP1:"verde",
    selectedP2:"azul",
    sound:true,
    tutorialSeen:false,
    unlockedLevels:[0],
    graphics:"medio",
    version:"1.4.0",
    lastSeenVersion:"",
    effectVolume:80,
    musicVolume:55,
    dailyReward:{lastClaim:"",streak:0},
    dailyChallenge:{date:"",completed:false,claimed:false,progress:0,target:0,type:""},
    upgrades:{coinMult:0,goldenLuck:0,startShield:0,extraLife:0,magnetTime:0,slowTime:0},
    stats:{bestSingle:0,bestCampaign:0,bestInfinite:0,bestBossRush:0,winsP1:0,winsP2:0,bossKills:0,totalAvocados:0,totalGolden:0,gamesPlayed:0,playSeconds:0},
    missionProgress:{abacates:0,multiWins:0,bossKills:0,maxScore:0,skinsCompradas:0,upgradesComprados:0}
  };

  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function load(){
    try{
      const raw = localStorage.getItem(DATA.storageKey);
      if(!raw) return clone(defaultSave);
      const parsed = JSON.parse(raw);
      return normalizeSave({
        ...clone(defaultSave), ...parsed,
        unlocked: parsed.unlocked || defaultSave.unlocked,
        achievements: parsed.achievements || {},
        missionsClaimed: parsed.missionsClaimed || {},
        unlockedLevels: parsed.unlockedLevels || [0],
        dailyReward: {...defaultSave.dailyReward, ...(parsed.dailyReward||{})},
        dailyChallenge: {...defaultSave.dailyChallenge, ...(parsed.dailyChallenge||{})},
        upgrades: {...defaultSave.upgrades, ...(parsed.upgrades||{})},
        stats: {...defaultSave.stats, ...(parsed.stats||{})},
        missionProgress: {...defaultSave.missionProgress, ...(parsed.missionProgress||{})}
      });
    }catch{ return clone(defaultSave); }
  }

  let save = load();
  function normalizeSave(data){
    data.playerName = String(data.playerName || defaultSave.playerName).slice(0,18);
    data.xp = Number(data.xp || 0);
    data.levelStars = {...defaultSave.levelStars, ...(data.levelStars || {})};
    data.redeemedCodes = {...defaultSave.redeemedCodes, ...(data.redeemedCodes || {})};
    data.inventory = {...defaultSave.inventory, ...(data.inventory || {})};
    data.activeItems = {...defaultSave.activeItems, ...(data.activeItems || {})};
    data.weeklyMission = {...defaultSave.weeklyMission, ...(data.weeklyMission || {})};
    data.localScores = Array.isArray(data.localScores) ? data.localScores.slice(0,50) : [];
    data.upgrades = {...defaultSave.upgrades, ...(data.upgrades || {})};
    data.effectVolume = Number(data.effectVolume ?? defaultSave.effectVolume);
    data.musicVolume = Number(data.musicVolume ?? defaultSave.musicVolume);
    data.lastSeenVersion = data.lastSeenVersion || defaultSave.lastSeenVersion;
    data.stats = {...defaultSave.stats, ...(data.stats || {})};
    data.missionProgress = {...defaultSave.missionProgress, ...(data.missionProgress || {})};
    data.dailyReward = {...defaultSave.dailyReward, ...(data.dailyReward || {})};
    data.dailyChallenge = {...defaultSave.dailyChallenge, ...(data.dailyChallenge || {})};
    data.unlocked = data.unlocked || defaultSave.unlocked;
    data.unlockedLevels = data.unlockedLevels || [0];
    return data;
  }

  function persist(){
    save = normalizeSave(save);
    localStorage.setItem(DATA.storageKey, JSON.stringify(save));
  }
  function resetAll(){ localStorage.removeItem(DATA.storageKey); save = load(); }
  function resetRanking(){ save.recorde=0; save.stats=clone(defaultSave.stats); persist(); }
  function saveData(){ return save; }
  return {saveData, persist, resetAll, resetRanking};
})();
