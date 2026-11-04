/**
 * PRIANKA’S BIRTHDAY ALBUM — plain JavaScript, no dependencies and no build step.
 * PERSONALIZE: edit the name and message directly in index.html.
 * Each effect is an original implementation based on the provided visual references.
 */
'use strict';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const random = (min, max) => Math.random() * (max - min) + min;

// ORIGINAL SOUNDTRACK — every MP3 was composed/synthesised for this website.
// Nothing plays before a real tap/click because Safari/Chrome block audible autoplay.
const audioPaths = {
  intro: 'assets/audio/starlit-intro.mp3',
  romance: 'assets/audio/forever-piano.mp3',
  birthday: 'assets/audio/birthday-magic.mp3'
};
const tracks = Object.fromEntries(Object.entries(audioPaths).map(([name, path]) => {
  const player = new Audio(path);
  player.loop = true;
  player.preload = 'none';
  player.volume = 0;
  return [name, player];
}));
const soundtrackTitles = {intro:'Starlit Intro ✧', romance:'Birthday Piano ♫', birthday:'A Birthday Wish ✨'};
let soundEnabled = true;
let soundStarted = false;
let desiredMood = 'intro';
let playingMood = null;
let musicVolume = 0.5;
let fadeRaf = 0;
const soundButton = $('#sound-toggle');
const introSoundButton = $('#intro-audio-toggle');
const volumeSlider = $('#music-volume');
const sfxFiles = {
  sky: 'sky-swish', tree: 'tree-whisper', letter: 'letter-rustle',
  sparkle: 'sparkle', flame: 'candle-light', wish: 'wish-puff', fireworks: 'firework-pop'
};
const loadedEffects = Object.fromEntries(Object.entries(sfxFiles).map(([key, file]) => {
  const player = new Audio(`assets/audio/${file}.mp3`);
  player.preload = 'none';
  return [key, player];
}));
let lastFireworkSoundAt = 0;
function playEffect(name, strength = 1) {
  if (!soundEnabled || !soundStarted || document.hidden) return;
  if (name === 'fireworks') {
    const now = performance.now();
    if (now - lastFireworkSoundAt < 900) return;
    lastFireworkSoundAt = now;
  }
  const template = loadedEffects[name];
  if (!template) return;
  // Clone so consecutive sparkles can overlap; the volume never becomes harsh.
  const effect = template.cloneNode();
  effect.volume = clamp(musicVolume * strength * 0.55, 0, 0.28);
  const attempt = effect.play();
  if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
}
function updateAudioUI() {
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
  soundButton.setAttribute('aria-label', soundEnabled ? 'Turn music and sound effects off' : 'Turn music and sound effects on');
  $('#sound-label').textContent = soundEnabled ? 'Music on' : 'Music off';
  introSoundButton.setAttribute('aria-pressed', String(soundEnabled));
  introSoundButton.setAttribute('aria-label', soundEnabled ? 'Turn birthday music off' : 'Turn birthday music on');
  introSoundButton.textContent = soundEnabled ? '♫ Music on · tap to mute' : '♫ Music off · tap to play';
  $('#now-playing').textContent = !soundEnabled ? 'Music is muted.' : !soundStarted ? 'Music is ON; your first tap enables sound if autoplay is blocked ♡' : `Now playing: ${soundtrackTitles[desiredMood]}`;
  $('#volume-value').textContent = `${volumeSlider.value}%`;
}
function fadeToMood(mood, duration = 1600) {
  desiredMood = mood;
  updateAudioUI();
  if (!soundEnabled || !soundStarted || document.hidden) return;
  if (playingMood === mood && !tracks[mood].paused) return;
  cancelAnimationFrame(fadeRaf);
  const incoming = tracks[mood];
  const oldVolumes = Object.fromEntries(Object.entries(tracks).map(([name, a]) => [name, a.volume]));
  incoming.volume = oldVolumes[mood] || 0;
  const playAttempt = incoming.play();
  if (playAttempt && typeof playAttempt.catch === 'function') playAttempt.catch(() => {
    $('#now-playing').textContent = 'Tap Music off, then Music on to enable audio.';
  });
  const startTime = performance.now();
  const targetVol = musicVolume * .48;
  playingMood = mood;
  function step(now) {
    const t = clamp((now-startTime)/duration,0,1);
    const eased = t*t*(3-2*t);
    Object.entries(tracks).forEach(([name,a]) => {
      const endValue = name === mood ? targetVol : 0;
      a.volume = clamp(oldVolumes[name]*(1-eased) + endValue*eased,0,1);
      if (t>=1 && name !== mood) a.pause();
    });
    if (t<1 && soundEnabled && !document.hidden) fadeRaf=requestAnimationFrame(step);
  }
  fadeRaf=requestAnimationFrame(step);
}
function startMusic(mood='intro') {
  desiredMood = mood;
  if (!soundEnabled) { updateAudioUI(); return; }
  soundStarted = true;
  fadeToMood(mood,850);
}
function toggleSound() {
  soundEnabled = !soundEnabled;
  if (!soundEnabled) {
    cancelAnimationFrame(fadeRaf);
    Object.values(tracks).forEach(a => {a.pause(); a.volume=0;});
    playingMood=null;
  } else {
    // This is a real user click, so audio playback is permitted by browsers.
    startMusic(desiredMood);
    playEffect('sparkle',.65);
  }
  updateAudioUI();
}
soundButton.addEventListener('click',toggleSound);
introSoundButton.addEventListener('click',toggleSound);
volumeSlider.addEventListener('input', () => {
  musicVolume = Number(volumeSlider.value)/100;
  if (playingMood && soundEnabled) {
    cancelAnimationFrame(fadeRaf);
    tracks[playingMood].volume = musicVolume*.48;
  }
  updateAudioUI();
});
// Try automatic playback immediately if this browser/site allows it.
// When blocked (usually on first visits), the FIRST genuine tap starts playback.
// We never disguise a blocked play() as audio that is currently playing.
function tryAudibleAutoplay() {
  if (!soundEnabled || soundStarted) return;
  const initial = tracks.intro;
  initial.volume = musicVolume * .22;
  const attempt = initial.play();
  if (!attempt || typeof attempt.then !== 'function') return;
  attempt.then(() => {
    if (!soundEnabled) { initial.pause(); return; }
    if (!soundStarted) {soundStarted=true;playingMood='intro';desiredMood='intro';}
    updateAudioUI();
  }).catch(() => {
    if (!soundStarted) { initial.pause(); updateAudioUI(); }
  });
}
function unlockOnFirstInput(event) {
  if (!soundEnabled || soundStarted) return;
  if (event.target.closest('#sound-toggle, #intro-audio-toggle, #music-volume')) return;
  startMusic(document.body.classList.contains('intro-locked') ? 'intro' : 'romance');
}
document.addEventListener('pointerdown', unlockOnFirstInput, {capture:true, passive:true});
document.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') unlockOnFirstInput(event);
}, {capture:true});
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',tryAudibleAutoplay,{once:true});
else tryAudibleAutoplay();
function chime() {playEffect('sparkle',.45);} // Retains subtle cues at existing interaction points.
updateAudioUI();
// Crossfade on chapter changes, not on every tiny scroll movement.
function refreshMusicChapter() {
  if (document.body.classList.contains('intro-locked')) return;
  const center = window.innerHeight*.48;
  const birthday = $('#birthday').getBoundingClientRect();
  const finale = $('#forever').getBoundingClientRect();
  const inCelebration = (birthday.top<center && birthday.bottom>center) || (finale.top<center && finale.bottom>center);
  const wanted = inCelebration ? 'birthday' : 'romance';
  if (wanted !== desiredMood) fadeToMood(wanted);
}
let audioScrollTicking=false;
window.addEventListener('scroll',() => {
  if (!audioScrollTicking) requestAnimationFrame(() => {audioScrollTicking=false;refreshMusicChapter();});
  audioScrollTicking=true;
},{passive:true});
document.addEventListener('visibilitychange',() => {
  if (document.hidden) {
    cancelAnimationFrame(fadeRaf);
    Object.values(tracks).forEach(a => a.pause());
    playingMood=null;
  } else if (soundEnabled && soundStarted) {
    startMusic(desiredMood);
  }
});
let toastTimer;
function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('show'), 3200);
}

// OPENING CINEMATIC — the plane follows the same SVG path that leaves the contrail.
const intro = $('#intro');
const flight = $('#flight-guide');
const plane = $('#airplane');
const trail = $('#flight-draw');
const totalFlightLength = flight.getTotalLength();
trail.style.strokeDasharray = String(totalFlightLength);
trail.style.strokeDashoffset = String(totalFlightLength);
let introRaf = 0, introTimeout = 0, introMessageTimeout = 0;
const behindIntro = [$('main'), $('.site-header'), $('.site-footer')];
function lockPage(locked) {
  document.body.classList.toggle('intro-locked', locked);
  behindIntro.forEach(el => { if (el) el.inert = locked; });
}
lockPage(true);
function movePlane(progress) {
  const position = flight.getPointAtLength(totalFlightLength * progress);
  const ahead = flight.getPointAtLength(totalFlightLength * Math.min(.99999, progress + .002));
  const angle = Math.atan2(ahead.y - position.y, ahead.x - position.x) * (180 / Math.PI);
  plane.setAttribute('transform', `translate(${position.x.toFixed(2)} ${position.y.toFixed(2)}) rotate(${angle.toFixed(2)})`);
  trail.style.strokeDashoffset = String(totalFlightLength * (1 - progress));
}
movePlane(0);
function finishIntro() {
  cancelAnimationFrame(introRaf);
  clearTimeout(introTimeout); clearTimeout(introMessageTimeout);
  intro.classList.add('intro-exit');
  lockPage(false);
  intro.setAttribute('aria-hidden', 'true');
  const heading = $('#hero-title');
  heading.setAttribute('tabindex', '-1');
  heading.focus({preventScroll:true});
  fadeToMood('romance',1800);
  playEffect('sparkle',.55);
}
function beginIntro() {
  if (intro.classList.contains('is-playing')) return;
  intro.classList.add('is-playing');
  startMusic('intro');
  playEffect('sky',.55);
  if (prefersReducedMotion.matches) {
    movePlane(1); intro.classList.add('show-message');
    introTimeout = setTimeout(finishIntro, 950);
    return;
  }
  const duration = 5350;
  const timeStart = performance.now();
  function tick(now) {
    const p = clamp((now - timeStart) / duration, 0, 1);
    // Smooth but not over-eased: the contrail closely follows the airplane.
    movePlane(p < .5 ? 2*p*p : 1 - Math.pow(-2*p + 2, 2)/2);
    if (p < 1) introRaf = requestAnimationFrame(tick);
    else { intro.classList.add('show-message'); introTimeout = setTimeout(finishIntro, 2100); }
  }
  introRaf = requestAnimationFrame(tick);
}
$('#open-surprise').addEventListener('click', beginIntro);
$('#skip-intro').addEventListener('click', () => {startMusic('romance');finishIntro();});
$('#start-again').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'instant' });
  cancelAnimationFrame(introRaf); clearTimeout(introTimeout); clearTimeout(introMessageTimeout);
  intro.classList.remove('intro-exit','is-playing','show-message');
  intro.removeAttribute('aria-hidden');
  movePlane(0); lockPage(true);
  fadeToMood('intro',900);
  $('#open-surprise').focus({preventScroll:true});
});

// CHAPTER REVEALS, PROGRESS, AND THE HEARTS BACKGROUND
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: .12, rootMargin: '0px 0px -15px 0px' });
$$('.reveal').forEach(el => revealObserver.observe(el));
let scrollScheduled = false;
function updateProgress() {
  const total = document.documentElement.scrollHeight - window.innerHeight;
  $('#page-progress').style.width = `${total > 0 ? (scrollY / total * 100) : 0}%`;
  scrollScheduled = false;
}
window.addEventListener('scroll', () => {
  if (!scrollScheduled) { scrollScheduled = true; requestAnimationFrame(updateProgress); }
}, { passive: true });
updateProgress();
let heartInterval;
const heartsContainer = $('#floating-hearts');
function addFloatingHeart() {
  if (prefersReducedMotion.matches || document.hidden) return;
  const heart = document.createElement('span');
  heart.className = 'floating-heart';
  heart.textContent = Math.random() > .48 ? '♥' : '♡';
  heart.style.left = `${random(2,95)}%`;
  heart.style.setProperty('--duration', `${random(6,11).toFixed(1)}s`);
  heart.style.setProperty('--size', `${Math.round(random(14,35))}px`);
  heart.style.setProperty('--drift', `${Math.round(random(-115,115))}px`);
  heartsContainer.appendChild(heart);
  heart.addEventListener('animationend', () => heart.remove(), { once: true });
}
const letterObserver = new IntersectionObserver(([entry]) => {
  clearInterval(heartInterval); heartInterval = undefined;
  if (entry.isIntersecting && !prefersReducedMotion.matches) {
    addFloatingHeart(); heartInterval = setInterval(addFloatingHeart, 680);
  }
}, {threshold: .12});
letterObserver.observe($('#letter'));

// HEART TREE — hundreds of leaves arranged inside a mathematically precise heart silhouette.
const leavesEl = $('#heart-leaves');
const leafColors = ['#d35c80','#ec94a2','#c86986','#f1aab1','#b95876','#f4c2bc','#9f5277','#e78393'];
let randomSeed = 42713;
function seededRandom() { randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0; return randomSeed / 4294967296; }
function makeLeaves() {
  let added = 0;
  while (added < 210) {
    const x = seededRandom() * 2.5 - 1.25;
    const y = seededRandom() * 2.45 - 1.2;
    if (Math.pow(x*x+y*y-1,3) - x*x*y*y*y > 0) continue;
    const leaf = document.createElement('span');
    leaf.className = 'leaf';
    leaf.style.left = `${(50 + 25*x).toFixed(2)}%`;
    leaf.style.top = `${(39 - 26*y).toFixed(2)}%`;
    leaf.style.setProperty('--leaf-size', `${9 + Math.round(seededRandom()*8)}px`);
    leaf.style.setProperty('--leaf-color', leafColors[Math.floor(seededRandom()*leafColors.length)]);
    leaf.style.setProperty('--delay', `${(seededRandom()*2.5).toFixed(2)}s`);
    leaf.style.setProperty('--leaf-opacity', `${(.73+seededRandom()*.27).toFixed(2)}`);
    leaf.style.setProperty('--xoffset', `${Math.round((seededRandom()-.5)*160)}px`);
    leavesEl.append(leaf); added++;
  }
}
makeLeaves();
const tree = $('#tree-scene');
$('#grow-tree').addEventListener('click', () => {
  if (tree.classList.contains('tree-grown')) {
    tree.classList.remove('tree-grown');
    $('#tree-heart-notes').classList.remove('show');
    $('#tree-status').textContent = 'The wish tree is growing…';
    setTimeout(() => { tree.classList.add('tree-grown'); $('#tree-heart-notes').classList.add('show'); }, 90);
  } else {
    tree.classList.add('tree-grown');
    $('#tree-heart-notes').classList.add('show');
    $('#tree-status').textContent = 'Still growing, every day ♡';
  }
  playEffect('tree',.87);
});

// LETTER — tactile envelope plus a real, readable letter.
const envelopeButton = $('#open-letter');
const letterContent = $('#letter-content');
function openLetter() {
  if (envelopeButton.getAttribute('aria-expanded') === 'true') return;
  envelopeButton.classList.add('opened');
  envelopeButton.setAttribute('aria-expanded','true');
  letterContent.hidden = false;
  playEffect('letter',.9);
  setTimeout(()=>playEffect('sparkle',.35),450);
  setTimeout(() => {
    letterContent.scrollIntoView({behavior:prefersReducedMotion.matches?'instant':'smooth',block:'start'});
  }, 350);
}
function closeLetter() {
  envelopeButton.classList.remove('opened');
  envelopeButton.setAttribute('aria-expanded','false');
  letterContent.hidden = true;
  envelopeButton.focus({preventScroll:true});
}
envelopeButton.addEventListener('click', () => {
  if (envelopeButton.getAttribute('aria-expanded') === 'true') closeLetter(); else openLetter();
});
$('#close-letter').addEventListener('click', closeLetter);

// CONFETTI — tiny CSS-driven pieces, no external scripts.
function confettiBurst(fromX, fromY, count = 72) {
  if (prefersReducedMotion.matches) return;
  for (let i=0;i<count;i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.left = `${fromX}px`; piece.style.top = `${fromY}px`;
    piece.style.background = leafColors[i % leafColors.length];
    piece.style.setProperty('--dx', `${random(-window.innerWidth*.4,window.innerWidth*.4)}px`);
    piece.style.setProperty('--dy', `${random(-230,window.innerHeight*.53)}px`);
    piece.style.setProperty('--spin', `${random(-1000,1000)}deg`);
    piece.style.setProperty('--time', `${random(.95,2.3)}s`);
    document.body.append(piece);
    piece.addEventListener('animationend',() => piece.remove(),{once:true});
  }
}
// Playful Yes / No interaction. On touch the No button remains clickable; neither choice is a dead-end.
const yesButton = $('#answer-yes');
const noButton = $('#answer-no');
const questionResult = $('#question-result');
let noAttempts = 0;
function celebrateYes() {
  $('.question-buttons').hidden = true;
  $('.question-card h3').hidden = true;
  $('.question-pre').hidden = true;
  $('.question-icon').hidden = true;
  questionResult.hidden = false;
  const bounds = $('#question-card').getBoundingClientRect();
  confettiBurst(bounds.left+bounds.width/2,bounds.top+bounds.height/3,85);
  playEffect('tree',.8);
}
yesButton.addEventListener('click',celebrateYes);
noButton.addEventListener('mouseenter', () => {
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && noAttempts < 3) {
    noButton.style.transform = `translate(${Math.round(random(-26,26))}px, ${Math.round(random(-15,15))}px)`;
  }
});
noButton.addEventListener('click', () => {
  noAttempts++;
  const messages = ['Take your time','The cake is ready','Ready for cake?'];
  noButton.textContent = messages[Math.min(noAttempts-1,messages.length-1)];
  noButton.style.transform = '';
  if (noAttempts >= 3) {
    noButton.textContent = 'Ready for cake!';
    noButton.onclick = celebrateYes;
  }
});

// THE BIRTHDAY CAKE — animated assembly, light, blow, and replay.
const cakeWrap = $('#cake-wrap');
const flame = $('#candle-flame');
const smoke = $('#candle-smoke');
const cakeButton = $('#cake-button');
const cakePrompt = $('#cake-prompt');
const cakeMessage = $('#cake-message');
let cakeStage = 0;
let finaleTimeout;
const cakeObserver = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting) { cakeWrap.classList.add('cake-ready'); cakeObserver.disconnect(); }
}, {threshold:.25});
cakeObserver.observe($('#birthday'));
cakeButton.addEventListener('click', () => {
  if (cakeStage === 0) {
    cakeWrap.classList.add('cake-ready');
    flame.classList.add('lit');
    smoke.classList.remove('show');
    cakePrompt.textContent = 'Close your eyes and make a wish...';
    cakeButton.innerHTML = 'Blow out the candle <span aria-hidden="true">♡</span>';
    cakeStage = 1; playEffect('flame',.93);
    fadeToMood('birthday',900);
  } else if (cakeStage === 1) {
    flame.classList.remove('lit');
    smoke.classList.remove('show');
    void smoke.offsetWidth;
    smoke.classList.add('show');
    cakePrompt.textContent = 'May Allah make your sweetest wishes come true.';
    cakeButton.hidden = true;
    $('#cake-replay').hidden = false;
    cakeMessage.classList.add('show');
    cakeStage = 2;
    const bb = cakeWrap.getBoundingClientRect();
    confettiBurst(bb.left+bb.width/2,bb.top+bb.height*.35,110);
    playEffect('wish',.95);
    setTimeout(()=>playEffect('sparkle',.73),400);
    finaleTimeout = setTimeout(() => {
      if (location.hash !== '#forever') $('#forever').scrollIntoView({behavior:prefersReducedMotion.matches?'instant':'smooth',block:'start'});
    }, 2600);
  }
});
$('#cake-replay').addEventListener('click', () => {
  clearTimeout(finaleTimeout);
  cakeStage = 0;
  flame.classList.remove('lit'); smoke.classList.remove('show');
  cakeButton.hidden = false; $('#cake-replay').hidden = true;
  cakePrompt.textContent = 'A birthday cake made just for you ♡';
  cakeButton.innerHTML = 'Light the candle <span aria-hidden="true">✧</span>';
  cakeMessage.classList.remove('show');
});

// FIREWORKS — original, responsive canvas particle effect; heart-shaped bursts included.
const fireworksCanvas = $('#fireworks-canvas');
const fx = fireworksCanvas.getContext('2d');
let fwWidth=0,fwHeight=0,lastFire=0,fireworksVisible=false,fxRaf=0,activeFireworks=[];
const fireColors = ['#ffe5b4','#ffc7d5','#f58bb0','#dfa9f6','#e8e0ff','#ffffff','#f9d6c2'];
function fitFireworks() {
  const rect = fireworksCanvas.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  fwWidth = rect.width; fwHeight = rect.height;
  fireworksCanvas.width = Math.round(rect.width*dpr);
  fireworksCanvas.height = Math.round(rect.height*dpr);
  fx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize',fitFireworks,{passive:true});
fitFireworks();
function launchFirework(x=random(fwWidth*.15,fwWidth*.85),y=random(fwHeight*.12,fwHeight*.58),heart=Math.random()>.63) {
  if (prefersReducedMotion.matches) return;
  const count = heart ? 94 : 80;
  const color = fireColors[Math.floor(Math.random()*fireColors.length)];
  for(let i=0;i<count;i++){
    const t=2*Math.PI*i/count;
    let dx,dy;
    if(heart){
      // Parametric heart, inverted Y because the canvas coordinate system grows downward.
      dx=16*Math.pow(Math.sin(t),3)/18;
      dy=-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))/18;
    }else{dx=Math.cos(t)*random(.7,1.25);dy=Math.sin(t)*random(.7,1.25);}
    const velocity = heart?random(1.5,2.4):random(1.35,3.6);
    activeFireworks.push({x,y,vx:dx*velocity,vy:dy*velocity,age:0,life:random(55,90),size:random(.7,2),color:Math.random()>.8?fireColors[Math.floor(Math.random()*fireColors.length)]:color});
  }
  if (fireworksVisible) playEffect('fireworks',.24);
  if(activeFireworks.length>750)activeFireworks.splice(0,activeFireworks.length-750);
}
function drawFireworks(time) {
  fx.clearRect(0,0,fwWidth,fwHeight);
  if (!document.hidden && fireworksVisible && !prefersReducedMotion.matches) {
    if (time-lastFire>1350) { launchFirework(); lastFire=time; }
    fx.globalCompositeOperation='lighter';
    for(let i=activeFireworks.length-1;i>=0;i--){
      const p=activeFireworks[i];p.age++;p.x+=p.vx;p.y+=p.vy;p.vx*=.985;p.vy=p.vy*.985+.025;
      const alpha=clamp(1-p.age/p.life,0,1);
      fx.globalAlpha=alpha;
      fx.fillStyle=p.color;
      fx.beginPath();fx.arc(p.x,p.y,p.size*alpha+.3,0,Math.PI*2);fx.fill();
      if(p.age>=p.life)activeFireworks.splice(i,1);
    }
    fx.globalAlpha=1;fx.globalCompositeOperation='source-over';
  }
  if (fireworksVisible) fxRaf=requestAnimationFrame(drawFireworks);
  else { fxRaf=0; activeFireworks=[]; fx.clearRect(0,0,fwWidth,fwHeight); }
}
const fireworksObserver = new IntersectionObserver(([entry]) => {
  fireworksVisible=entry.isIntersecting;
  if(fireworksVisible){
    fitFireworks();lastFire=0;launchFirework(fwWidth*.5,fwHeight*.3,true);
    if (!fxRaf && !prefersReducedMotion.matches) fxRaf=requestAnimationFrame(drawFireworks);
  }
}, {threshold:.08});
fireworksObserver.observe($('#forever'));
$('#replay-fireworks').addEventListener('click', () => {
  fitFireworks();
  for (let i=0;i<4;i++) setTimeout(() => launchFirework(random(fwWidth*.2,fwWidth*.8),random(fwHeight*.12,fwHeight*.5),i%2===0),i*260);
  playEffect('fireworks',.8);
  setTimeout(()=>playEffect('sparkle',.55),300);
});
// The fireworks loop starts only when the finale enters the viewport.

// Ensure all media interactions work when navigating via a section link.
window.addEventListener('keydown',event => {
  if (event.key === 'Escape' && !letterContent.hidden) closeLetter();
});


// Signature edition: a barely-visible light wash follows the mouse in the hero.
const heroShowcase = $('.hero');
if (heroShowcase && matchMedia('(hover:hover) and (pointer:fine)').matches && !prefersReducedMotion.matches) {
  heroShowcase.addEventListener('pointermove',event => {
    const rect = heroShowcase.getBoundingClientRect();
    heroShowcase.style.setProperty('--hero-x',`${((event.clientX-rect.left)/rect.width*100).toFixed(1)}%`);
    heroShowcase.style.setProperty('--hero-y',`${((event.clientY-rect.top)/rect.height*100).toFixed(1)}%`);
  },{passive:true});
}

// Gallery order also determines the previous and next photos in the viewer.
const memoryPhotos = [
  ['portrait-pink.webp', 'Prianka in pink'],
  ['IMG_6565.JPG', 'At the picnic table'],
  ['IMG_6566.JPG', 'Beside the yellow flowers'],
  ['portrait-lakeside.webp', 'An afternoon by the lake'],
  ['portrait-yellow.webp', 'A portrait in yellow']
];
const memoryLightbox = $('#memory-lightbox');
const fullPhoto = $('#memory-full-photo');
const photoHeading = $('#memory-lightbox-heading');
const photoIndex = $('#memory-index');
const photoClose = $('#memory-close');
let memoryPosition = 0;
let lastMemoryTrigger = null;
function showMemory(pos) {
  memoryPosition=(pos+memoryPhotos.length)%memoryPhotos.length;
  const [file,title] = memoryPhotos[memoryPosition];
  fullPhoto.src=`assets/photos/${file}`;
  fullPhoto.alt=title;
  photoHeading.textContent=title;
  photoIndex.textContent=`${String(memoryPosition+1).padStart(2,'0')} / ${memoryPhotos.length}`;
}
function openMemory(pos, trigger) {
  lastMemoryTrigger=trigger||document.activeElement;
  showMemory(pos);
  memoryLightbox.hidden=false;
  document.body.classList.add('lightbox-open');
  photoClose.focus({preventScroll:true});
  playEffect('sparkle',.35);
}
function closeMemory() {
  memoryLightbox.hidden=true;
  document.body.classList.remove('lightbox-open');
  if (lastMemoryTrigger?.focus) lastMemoryTrigger.focus({preventScroll:true});
}
$('.gallery').querySelectorAll('.photo-card').forEach(card => {
  const photo = card.querySelector('img');
  const file=photo.getAttribute('src').split('/').pop();
  const index=memoryPhotos.findIndex(entry => entry[0] === file);
  const btn=document.createElement('button');
  btn.className='photo-expand';
  btn.type='button';
  btn.innerHTML='<span>VIEW PHOTO ↗</span>';
  btn.setAttribute('aria-label',`Open photo: ${photo.getAttribute('alt')}`);
  btn.addEventListener('click',()=>openMemory(index,btn));
  card.append(btn);
});
$('#view-all-memories').addEventListener('click',event=>openMemory(0,event.currentTarget));
photoClose.addEventListener('click',closeMemory);
$('#memory-prev').addEventListener('click',()=>{showMemory(memoryPosition-1);playEffect('sparkle',.25)});
$('#memory-next').addEventListener('click',()=>{showMemory(memoryPosition+1);playEffect('sparkle',.25)});
memoryLightbox.addEventListener('click',event=>{if(event.target===memoryLightbox)closeMemory()});
document.addEventListener('keydown',event => {
  if (memoryLightbox.hidden) return;
  if (event.key==='Escape') {event.preventDefault();closeMemory()}
  if (event.key==='ArrowRight') {event.preventDefault();showMemory(memoryPosition+1)}
  if (event.key==='ArrowLeft') {event.preventDefault();showMemory(memoryPosition-1)}
  // Keep keyboard focus inside the gallery dialog.
  if (event.key==='Tab') {
    const focusables=[photoClose,$('#memory-prev'),$('#memory-next')];
    const current=focusables.indexOf(document.activeElement);
    if (event.shiftKey && current===0) {event.preventDefault();focusables.at(-1).focus()}
    else if (!event.shiftKey && current===focusables.length-1) {event.preventDefault();focusables[0].focus()}
  }
});
let touchX=null;
memoryLightbox.addEventListener('touchstart',event=>{touchX=event.touches[0]?.clientX??null},{passive:true});
memoryLightbox.addEventListener('touchend',event=>{
  if(touchX===null)return;
  const dx=(event.changedTouches[0]?.clientX??touchX)-touchX;
  if(Math.abs(dx)>55)showMemory(memoryPosition+(dx<0?1:-1));
  touchX=null;
},{passive:true});
