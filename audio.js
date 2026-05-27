const Sound = (() => {
  let musicTimer = null;
  let musicAudio = null;

  const files = {
    eat:"assets/sounds/eat.wav",
    click:"assets/sounds/click.wav",
    power:"assets/sounds/power.wav",
    lose:"assets/sounds/lose.wav",
    win:"assets/sounds/win.wav",
    boss:"assets/sounds/boss.wav",
    music:"assets/sounds/music.wav"
  };

  const pool = {};

  function isOn(){ return Store.saveData().sound !== false; }

  function playFile(name, volume=.65){
    if(!isOn()) return false;
    try{
      if(!pool[name]) pool[name] = [];
      let audio = pool[name].find(a => a.paused || a.ended);
      if(!audio){
        audio = new Audio(files[name]);
        pool[name].push(audio);
      }
      audio.currentTime = 0;
      audio.volume = volume;
      const p = audio.play();
      if(p && p.catch) p.catch(()=>{});
      return true;
    }catch{
      return false;
    }
  }

  function tone(freq, dur, tipo="sine", vol=.13){
    if(!isOn()) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if(!AudioContextClass) return;
    const a = new AudioContextClass();
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(freq, a.currentTime);
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(.01, a.currentTime + dur);
    o.connect(g);
    g.connect(a.destination);
    o.start();
    o.stop(a.currentTime + dur);
  }

  function click(){ if(!playFile("click",.45)) tone(450,.05,"square",.05); }
  function eat(){ if(!playFile("eat",.72)){ tone(780,.08,"sine",.18); setTimeout(()=>tone(980,.08,"triangle",.12),70); } }
  function power(){ if(!playFile("power",.70)) tone(1100,.16,"triangle",.16); }
  function lose(){ if(!playFile("lose",.75)) tone(160,.35,"sawtooth",.12); }
  function win(){ if(!playFile("win",.78)){ tone(500,.15); setTimeout(()=>tone(750,.15),150); setTimeout(()=>tone(1000,.25),300); } }
  function boss(){ if(!playFile("boss",.72)){ tone(120,.18,"sawtooth",.18); setTimeout(()=>tone(90,.20,"sawtooth",.14),110); } }

  function music(){
    stopMusic();
    if(!isOn()) return;
    try{
      musicAudio = new Audio(files.music);
      musicAudio.loop = true;
      musicAudio.volume = .22;
      const p = musicAudio.play();
      if(p && p.catch) p.catch(()=>fallbackMusic());
    }catch{
      fallbackMusic();
    }
  }

  function fallbackMusic(){
    let notes=[262,330,392,330],i=0;
    musicTimer=setInterval(()=>{ tone(notes[i%notes.length],.09,"sine",.035); i++; },750);
  }

  function stopMusic(){
    if(musicTimer) clearInterval(musicTimer);
    musicTimer=null;
    if(musicAudio){
      musicAudio.pause();
      musicAudio.currentTime = 0;
      musicAudio = null;
    }
  }

  return {tone,click,eat,power,lose,win,boss,music,stopMusic};
})();
