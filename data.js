const DATA = {
  metaMulti: 10,
  storageKey: "cobrinhaAbacateLegendsV1",
  skins: {
    verde:{nome:"Jiboia Verde",cor1:"#65a30d",cor2:"#365314",brilho:"#d9f99d",preco:0,raridade:"comum",efeito:"Natural"},
    azul:{nome:"Cobra Azul",cor1:"#38bdf8",cor2:"#0f766e",brilho:"#cffafe",preco:0,raridade:"comum",efeito:"Fria"},
    coral:{nome:"Coral",cor1:"#ef4444",cor2:"#111827",brilho:"#fca5a5",preco:25,raridade:"rara",efeito:"Listras fortes"},
    areia:{nome:"Cobra da Areia",cor1:"#d6b06e",cor2:"#8b5e34",brilho:"#f6e7c3",preco:25,raridade:"rara",efeito:"Pele seca"},
    pantano:{nome:"Víbora do Pântano",cor1:"#6b8e23",cor2:"#2f4f2f",brilho:"#cfe58f",preco:35,raridade:"rara",efeito:"Manchas escuras"},
    branca:{nome:"Serpente do Gelo",cor1:"#e2f7ff",cor2:"#8ac8e2",brilho:"#ffffff",preco:50,raridade:"epica",efeito:"Cristais"},
    fogo:{nome:"Serpente de Lava",cor1:"#fb923c",cor2:"#991b1b",brilho:"#fde68a",preco:60,raridade:"epica",efeito:"Faíscas"},
    neon:{nome:"Víbora Neon",cor1:"#22d3ee",cor2:"#7c3aed",brilho:"#f0abfc",preco:70,raridade:"epica",efeito:"Brilho neon"},
    ouro:{nome:"Anaconda Dourada",cor1:"#fde047",cor2:"#a16207",brilho:"#fff7b3",preco:100,raridade:"lendaria",efeito:"Aura dourada"},
    abacate:{nome:"Rei Abacate",cor1:"#84cc16",cor2:"#14532d",brilho:"#fef3c7",preco:120,raridade:"lendaria",efeito:"Folhas"}
  },
  upgrades: {
    coinMult:{nome:"Moeda Extra",desc:"+25% moedas por abacate.",icon:"💰",max:4,baseCost:35},
    goldenLuck:{nome:"Sorte Dourada",desc:"Aumenta chance de abacate dourado.",icon:"🌟",max:4,baseCost:40},
    startShield:{nome:"Escudo Inicial",desc:"Começa a partida com escudo.",icon:"🛡️",max:1,baseCost:60},
    extraLife:{nome:"Vida Extra",desc:"Sobrevive uma vez ao morrer.",icon:"❤️",max:2,baseCost:70},
    magnetTime:{nome:"Ímã Melhorado",desc:"Ímã dura mais tempo.",icon:"🧲",max:3,baseCost:45},
    slowTime:{nome:"Tempo Lento+",desc:"Tempo lento dura mais tempo.",icon:"⏳",max:3,baseCost:45}
  },
  achievements: {
    primeiroAbacate:{nome:"Primeiro abacate",desc:"Coma seu primeiro abacate.",icon:"🥑"},
    dezPontos:{nome:"Fome de cobra",desc:"Faça 10 pontos em uma partida.",icon:"🔥"},
    compraSkin:{nome:"Estiloso",desc:"Compre uma skin.",icon:"🛒"},
    venceuMulti:{nome:"Campeão multiplayer",desc:"Vença uma partida multiplayer.",icon:"👑"},
    zerouCampanha:{nome:"Mestre do abacate",desc:"Complete a campanha.",icon:"🏆"},
    derrotouBoss:{nome:"Caçador de Boss",desc:"Derrote ao menos um boss.",icon:"⚔️"},
    upgrades3:{nome:"Turbinado",desc:"Compre 3 upgrades.",icon:"⬆️"}
  },
  missions: {
    comer20:{nome:"Fome de abacate",desc:"Coma 20 abacates no total.",icon:"🥑",goal:20,reward:25,progressKey:"abacates"},
    vencerMulti:{nome:"Rei do duelo",desc:"Vença 1 partida multiplayer.",icon:"👑",goal:1,reward:30,progressKey:"multiWins"},
    derrotarBoss:{nome:"Caça aos chefes",desc:"Derrote 1 boss.",icon:"⚔️",goal:1,reward:50,progressKey:"bossKills"},
    fazer30:{nome:"Pontuação braba",desc:"Faça 30 pontos em uma partida.",icon:"🔥",goal:30,reward:40,progressKey:"maxScore"},
    comprar3:{nome:"Colecionador",desc:"Libere 3 skins na loja.",icon:"🛒",goal:3,reward:35,progressKey:"skinsCompradas"}
  },
  campaign: [
    {nome:"Floresta Inicial",mapa:"floresta",meta:8,decoracoes:30,speedBonus:0,boss:null,icon:"🌳"},
    {nome:"Vale Congelado",mapa:"gelo",meta:12,decoracoes:32,speedBonus:8,boss:null,icon:"❄️"},
    {nome:"Campo Noturno",mapa:"noite",meta:14,decoracoes:32,speedBonus:12,boss:null,icon:"🌙"},
    {nome:"Tomatão",mapa:"cidade",meta:0,decoracoes:28,speedBonus:14,boss:"tomate",icon:"🍅"},
    {nome:"Pântano Verde",mapa:"pantano",meta:17,decoracoes:35,speedBonus:18,boss:null,icon:"🐸"},
    {nome:"Deserto Seco",mapa:"deserto",meta:19,decoracoes:35,speedBonus:22,boss:null,icon:"🏜️"},
    {nome:"Pimentão",mapa:"vulcao",meta:0,decoracoes:30,speedBonus:24,boss:"pimenta",icon:"🌶️"},
    {nome:"Vulcão Final",mapa:"vulcao",meta:22,decoracoes:38,speedBonus:28,boss:null,icon:"🌋"},
    {nome:"Abacatão",mapa:"floresta",meta:0,decoracoes:30,speedBonus:20,boss:"abacate",icon:"👑"}
  ]
};
