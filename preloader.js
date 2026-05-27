(() => {
  const preloader = document.getElementById("preloader");
  const bar = document.getElementById("preloaderBar");

  const assets = [
    "assets/avocado.svg",
    "assets/tree.svg",
    "assets/rock.svg",
    "assets/cactus.svg",
    "assets/crystal.svg",
    "assets/building.svg",
    "assets/lava.svg",
    "assets/pond.svg",
    "assets/post.svg",
    "assets/favicon.svg"
  ];

  let loaded = 0;

  function update(){
    loaded++;
    if(bar){
      const pct = Math.min(100, Math.round((loaded / assets.length) * 100));
      bar.style.animation = "none";
      bar.style.width = pct + "%";
      bar.style.transform = "translateX(0)";
    }

    if(loaded >= assets.length){
      setTimeout(hide, 250);
    }
  }

  function hide(){
    if(preloader) preloader.classList.add("hide");
  }

  assets.forEach(src => {
    const img = new Image();
    img.onload = update;
    img.onerror = update;
    img.src = src;
  });

  window.addEventListener("load", () => setTimeout(hide, 800));
  setTimeout(hide, 2600);
})();
