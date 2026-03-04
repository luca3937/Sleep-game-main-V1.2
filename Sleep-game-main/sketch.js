
// Time and game state 
let currentMinutes = 20 * 60; // 20:00
let wakeUpTime = 6 * 60;      // 06:00
let gameOver = false;
let sleepButton; // button to end game early
let restartButton; // reloads page to start over

// Sleep Parameters 
let temperature = 20.0; // 10 - 30, supports .5 steps
let lightOn = true;
let windowOpen = false;
let blindFrac = 0; // 0 = fully open, ~0.45 = each blind covers 45%
let sleepPosition = 0; // 0 = back, 1 = side, 2 = stomach

let sleepQuality = 100;

// thermostat popup state
let thermostatActive = false;
let popup = {x:0,y:0,w:0,h:0};
let popupArrows = []; // will hold {name:'up'/'down',x,y,w,h}

// lighting transition state
let lightAlpha = 0;
let lightTargetAlpha = 0;
let lightTransitionStart = 0;
const LIGHT_TRANSITION_DURATION = 1000; // ms

// Interactive Objects 
let objects = [];

// sprite handles
let thermostatUpImg, thermostatDownImg;
let lightOnImg, lightOffImg;
// window images are no longer used; window is drawn in room.png
let roomImg; // full room background
let personBackImg, personSideImg, personStomachImg;

function preload() {
  // load only required sprites and background
  thermostatUpImg = loadImage('assets/thermostat_up.png');
  thermostatDownImg = loadImage('assets/thermostat_down.png');
  lightOnImg = loadImage('assets/light_on.png');
  lightOffImg = loadImage('assets/light_off.png');

  // combined room with all static decor
  roomImg = loadImage('assets/room.png');

  // person orientation sprites
  personBackImg = loadImage('assets/person_back.png');
  personSideImg = loadImage('assets/person_side.png');
  personStomachImg = loadImage('assets/person_stomach.png');
}

// fixed game resolution used for all logic and hitboxes
const GAME_W = 900;
const GAME_H = 600;

let scaleFactor = 1;
let offsetX = 0;
let offsetY = 0;
let patternGraphics;

function setup() {
  // canvas fills the window; we render the game into a centered, scaled region
  createCanvas(windowWidth, windowHeight);
  updateScaling();

  patternGraphics = createGraphics(width, height);
  generatePattern(patternGraphics);

  // create the "sleep" button; clicking it ends the game immediately
  sleepButton = createButton('Sleep');
  sleepButton.mousePressed(goSleep);

  // restart button reloads the page, resetting the entire sketch
  restartButton = createButton('Restart');
  restartButton.mousePressed(() => {
    // simple page refresh
    window.location.reload();
  });

  // position will be updated in draw() so we can recalc each frame
  updateButtonPositions();

  // restart button reloads the page, resetting the entire sketch
  restartButton = createButton('Restart');
  restartButton.position(100, 20);
  restartButton.mousePressed(() => {
    // simple page refresh
    window.location.reload();
  });

  objects = [
    // single hitbox for the thermostat control
    { name: "thermostat", x: 576, y: 36, w: 90, h: 40 },
    // light chain over bed is now the switch
    { name: "chain", x: 360, y: 30, w: 180, h: 84 },
    // window painting hitbox moved upward about 60% of its height
    { name: "window", x: 691, y: 40, w: 164, h: 64 },
    // bed hitbox updated for 90° rotation (vertical orientation)
    { name: "bed", x: 350, y: 150, w: 200, h: 300 }
  ];
}

function draw() {
  // paint the surrounding area with a retro-pixel pattern
  if (patternGraphics) {
    image(patternGraphics, 0, 0);
  } else {
    background(220);
  }

  // apply center/scale transform for the game itself
  push();
  translate(offsetX, offsetY);
  scale(scaleFactor);

  drawRoom();
  drawUI();
  if (!gameOver) calculateSleepQuality();

  pop();

  // keep buttons in sync with the game area
  updateButtonPositions();
}



// Drawing functions

function drawRoom() {

  // draw combined room background into the virtual game resolution
  image(roomImg, 0, 0, GAME_W, GAME_H);

  // darkening overlay with animated transition when the light toggles
  // determine desired alpha based on current light state
  lightTargetAlpha = lightOn ? 0 : 150;

  // calculate how long we've been transitioning
  let elapsed = millis() - lightTransitionStart;
  if (elapsed < LIGHT_TRANSITION_DURATION) {
    // interpolate toward target over the duration
    let t = elapsed / LIGHT_TRANSITION_DURATION;
    lightAlpha = lerp(lightAlpha, lightTargetAlpha, t);
  } else {
    // after the timer, lock to the target exactly
    lightAlpha = lightTargetAlpha;
  }

  if (lightAlpha > 1) {
    // simple fade overlay with no flicker
    fill(0, 0, 0, lightAlpha);
    rect(0, 0, GAME_W, GAME_H);
  }

  // Person sprite (remains unrotated so head points up)
  drawPerson();

  // window blinds (animated)
  // interpolate fraction towards target depending on open/closed state
  blindFrac = lerp(blindFrac, windowOpen ? 0 : 0.45, 0.1);
  if (blindFrac > 0.001) {
    let wx = 691, wy = 40, ww = 164, wh = 64;
    // medium-blue fill for balanced contrast
    fill(0, 0, 180);
    // expand vertically: even taller with a few extra pixels below
    let extraTop = wh * 0.20;
    let extraBottom = wh * 0.15 + 5; // additional 5px at bottom
    let drawY = wy - extraTop;
    let drawH = wh + extraTop + extraBottom;
    // compute base width for each blind
    let baseBlindW = ww * blindFrac;
    // reduce horizontal overhang to 5% each side
    let leftExtra = ww * 0.05;
    let leftX = wx - leftExtra;
    let leftW = baseBlindW + leftExtra;
    rect(leftX, drawY, leftW, drawH);
    // draw vertical slats inside left blind (mid-tone for subtler contrast)
    stroke(120, 120, 200);
    let slatCount = 4;
    for (let i = 1; i <= slatCount; i++) {
      let xpos = leftX + (i * leftW) / (slatCount + 1);
      line(xpos, drawY, xpos, drawY + drawH);
    }
    noStroke();

    // right blind width
    let rightExtra = ww * 0.05;
    let rightX = wx + ww - baseBlindW;
    let rightW = baseBlindW + rightExtra;
    rect(rightX, drawY, rightW, drawH);
    // vertical slats on right blind (mid-tone)
    stroke(120, 120, 200);
    for (let i = 1; i <= slatCount; i++) {
      let xpos = rightX + (i * rightW) / (slatCount + 1);
      line(xpos, drawY, xpos, drawY + drawH);
    }
    noStroke();
  }


  // Thermostat container (full size) – blend with wall colour
  let tx = 576, ty = 36, tw = 90, th = 40;
  // sample room image at centre of thermostat to pick a base tone
  let c = roomImg.get(tx + tw/2, ty + th/2);
  // drop shadow for depth
  push();
  noStroke();
  fill(0, 0, 0, 50);
  rect(tx+2, ty+2, tw, th, 6);
  pop();
  // draw a slightly transparent rounded panel
  push();
  noStroke();
  fill(red(c), green(c), blue(c), 200);
  rect(tx, ty, tw, th, 6);
  pop();

  // thermostat icon on left
  let iconX = tx + 10;
  let iconY = ty + th/2;
  push();
  noStroke();
  fill(180);
  ellipse(iconX, iconY, 24, 24);
  fill(150, 0, 0);
  ellipse(iconX, iconY, 8, 8);
  pop();

  // temperature text using a muted colour
  fill(220);
  textSize(14);
  textAlign(LEFT, CENTER);
  let dispTemp = (temperature % 1 === 0) ? temperature.toString() : temperature.toFixed(1);
  text(dispTemp + "°C", tx + 35, ty + th/2);

  // draw panel popup if active
  if (thermostatActive) {
    drawThermostatPopup();
  }


  highlightHover();
}

function drawPerson() {
  let x = 450, y = 280; // raise character slightly to center on bed
  if (sleepPosition === 0) {
    // back
    image(personBackImg, x - 20, y - 30, 40, 60);
  } else if (sleepPosition === 1) {
    // side
    image(personSideImg, x - 30, y - 20, 60, 40);
  } else {
    // stomach
    image(personStomachImg, x - 20, y - 30, 40, 60);
  }
}


function drawUI() {

  fill(255);
  textSize(18);
  textAlign(LEFT);

  let displayHour = floor(currentMinutes / 60) % 24;
  let displayMin = currentMinutes % 60;
  let formattedMin = displayMin < 10 ? "0" + displayMin : displayMin;

  // draw at bottom-left corner of virtual game area
  let baseX = 40;
  let baseY = GAME_H - 80;
  text(displayHour + ":" + formattedMin, baseX, baseY);
  text("Wake: 06:00", baseX, baseY + 30);
  text("Sleep Quality: " + sleepQuality, baseX, baseY + 60);

  if (gameOver) {
    // if gameOver was triggered by the button we may not have advanced time
    textSize(40);
    textAlign(CENTER, CENTER);
    text("Morning!\nFinal Sleep Quality: " + sleepQuality, GAME_W/2, GAME_H/2);
    noLoop();
  } else if (currentMinutes >= 24 * 60 + wakeUpTime) {
    gameOver = true;
    textSize(40);
    textAlign(CENTER, CENTER);
    text("Morning!\nFinal Sleep Quality: " + sleepQuality, GAME_W/2, GAME_H/2);
    noLoop();
  }
}


// Interaction logic


function mousePressed() {
  if (gameOver) return;

  // convert to game coordinates immediately
  let gx = (mouseX - offsetX) / scaleFactor;
  let gy = (mouseY - offsetY) / scaleFactor;

  if (thermostatActive) {
    // check clicks relative to popup
    if (gx < popup.x || gx > popup.x + popup.w || gy < popup.y || gy > popup.y + popup.h) {
      // clicked outside popup → close
      thermostatActive = false;
      return;
    }
    // inside popup: check arrow buttons
    for (let arrow of popupArrows) {
      if (gx > arrow.x && gx < arrow.x + arrow.w &&
          gy > arrow.y && gy < arrow.y + arrow.h) {
        if (arrow.name === 'up') {
          temperature = min(30, temperature + 0.5);
        } else if (arrow.name === 'down') {
          temperature = max(10, temperature - 0.5);
        }
        // temperature change inside popup does not advance time
        return;
      }
    }
    // clicking within popup but not on arrows does nothing
    return;
  }

  // thermostat not active: regular object handling
  for (let obj of objects) {
    if (isHovering(obj)) {
      if (obj.name === "thermostat") {
        thermostatActive = true;
        advanceTime(); // fixed 15 minutes for opening
      }

      if (obj.name === "chain") {
        lightOn = !lightOn;
        lightTransitionStart = millis();
        advanceTime();
      }

      if (obj.name === "window") {
        windowOpen = !windowOpen;
        advanceTime();
      }

      if (obj.name === "bed") {
        sleepPosition = (sleepPosition + 1) % 3;
        advanceTime();
      }
    }
  }
}

function advanceTime() {
  currentMinutes += 15;
}

function goSleep() {
  // treat as if time has advanced to wake-up
  currentMinutes = 24 * 60 + wakeUpTime;
  gameOver = true;
  // disable button so it isn't clicked repeatedly
  if (sleepButton) sleepButton.attribute('disabled', '');
}

// restart handler is just a reload; defined inline in setup

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateScaling();
  if (patternGraphics) {
    patternGraphics.resizeCanvas(width, height);
    generatePattern(patternGraphics);
  }
}


// Highlight objects on hover


function drawThermostatPopup() {
  // central pop-up panel
  let pw = 300, ph = 180;
  popup.w = pw;
  popup.h = ph;
  popup.x = (GAME_W - pw) / 2;
  popup.y = (GAME_H - ph) / 2;

  fill(50, 220);
  rect(popup.x, popup.y, pw, ph, 10);

  fill(255);
  textSize(18);
  textAlign(CENTER, TOP);
  text("Thermostat", popup.x + pw/2, popup.y + 10);

  textSize(24);
  textAlign(CENTER, CENTER);
  let dispTemp = (temperature % 1 === 0) ? temperature.toString() : temperature.toFixed(1);
  text(dispTemp + "°C", popup.x + pw/2 - 10, popup.y + ph/2 - 10);

  // arrows at bottom
  let aw = 40, ah = 40;
  let ax = popup.x + pw/2 - aw - 10;
  let dx = popup.x + pw/2 + 10;
  let ay = popup.y + ph - ah - 20;
  popupArrows = [
    {name: 'down', x: ax, y: ay, w: aw, h: ah},
    {name: 'up',   x: dx, y: ay, w: aw, h: ah}
  ];
  tint(255);
  image(thermostatDownImg, ax, ay, aw, ah);
  image(thermostatUpImg, dx, ay, aw, ah);
  noTint();
}

function highlightHover() {
  // when the thermostat popup is open #Don't show hover highlights
  if (thermostatActive) return;

  noFill();
  stroke(255);
  strokeWeight(2);

  for (let obj of objects) {
    if (isHovering(obj)) {
      rect(obj.x, obj.y, obj.w, obj.h);
    }
  }

  noStroke();
}

function isHovering(obj) {
  // convert canvas coordinates into scaled game space
  let gx = (mouseX - offsetX) / scaleFactor;
  let gy = (mouseY - offsetY) / scaleFactor;
  return gx > obj.x &&
         gx < obj.x + obj.w &&
         gy > obj.y &&
         gy < obj.y + obj.h;
}

function updateButtonPositions() {
  if (sleepButton) {
    sleepButton.position(offsetX + 20 * scaleFactor, offsetY + 20 * scaleFactor);
  }
  if (restartButton) {
    restartButton.position(offsetX + 100 * scaleFactor, offsetY + 20 * scaleFactor);
  }
}

// helper functions for scaling & pattern

function updateScaling() {
  // never scale the game larger than its native resolution to avoid blurry assets
  scaleFactor = min(1, width / GAME_W, height / GAME_H);
  offsetX = (width - GAME_W * scaleFactor) / 2;
  offsetY = (height - GAME_H * scaleFactor) / 2;
}

function generatePattern(g) {
  // checkerboard for border around the game
  let tile = 16;
  for (let y = 0; y < g.height; y += tile) {
    for (let x = 0; x < g.width; x += tile) {
      if (((x / tile) + (y / tile)) % 2 === 0) {
        g.fill(150, 100,  50);
      } else {
        g.fill(120,  80,  40);
      }
      g.noStroke();
      g.rect(x, y, tile, tile);
    }
  }
}

// Sleep quiality calculation based on parameters


function calculateSleepQuality() {

  sleepQuality = 100;

  // Temperature ideal ~18-21
  sleepQuality -= abs(19 - temperature) * 2;

  // Light penalty
  if (lightOn) sleepQuality -= 20;

  // Position bonus
  if (sleepPosition === 1) sleepQuality += 5;

  sleepQuality = constrain(sleepQuality, 0, 100);
}



//fix player model
//Animated lighting
//Thermometer blend better
//Thermometer popup change 
//Make blanket animations for amount% covered

//Create more days, add weather effects, add sound effects, 
//Add cat, that can sleep on the bed with you + sleep quality

//Adjust sleep quality, easter eggs at certain %
//Add dream minigames
//Add blinds minigames
//Minigames for all interactions, with different difficulty levels based on sleep quality
//Add more interactions (e.g. alarm clock, phone, etc.) and corresponding minigames