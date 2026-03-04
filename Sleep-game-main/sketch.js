
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
let blanketPosition = 0; // 0 = under person, 1 = legs covered, 2 = up to shoulders

let sleepQuality = 100;

// thermostat popup state
let thermostatActive = false;
let popup = {x:0,y:0,w:0,h:0};
let popupArrows = []; //  Array for {name:'up'/'down',x,y,w,h}

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

// resolution used for all logic and hitboxes
const GAME_W = 900;
const GAME_H = 600;

let scaleFactor = 1;
let offsetX = 0;
let offsetY = 0;
let patternGraphics;

function setup() {
  // canvas fills the window; game rendered into a centered, scaled region
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

  // position will be updated in draw() 
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
    // light chain over bed for light switch
    { name: "chain", x: 360, y: 30, w: 180, h: 84 },
    // window painting hitbox 
    { name: "window", x: 691, y: 40, w: 164, h: 64 },
    // person hitbox around head only for changing sleep pose
    { name: "person", x: 410, y: 180, w: 80, h: 60 },
    // blanket/body area hitbox below person for changing blanket coverage
    { name: "blanket", x: 352, y: 210, w: 196, h: 108 }
  ];
}

function draw() {
  // Background around game paint 
  if (patternGraphics) {
    image(patternGraphics, 0, 0);
  } else {
    background(220);
  }

  // center/scale transformation for the game itself
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

  // draw combined room background
  image(roomImg, 0, 0, GAME_W, GAME_H);

  // darkening overlay with animated transition when the light toggles (AI)
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

  // Person sprite 
  drawPerson();
  
  // Blanket overlay (drawn after person so it appears on top when covering)
  drawBlanket();

  // window blinds (animated AI)
  // interpolate fraction towards target depending on open/closed state
  blindFrac = lerp(blindFrac, windowOpen ? 0 : 0.45, 0.1);
  if (blindFrac > 0.001) {
    let wx = 691, wy = 40, ww = 164, wh = 64;
    // medium-blue fill for balanced contrast
    fill(0, 0, 180);
    // expand vertically
    let extraTop = wh * 0.20;
    let extraBottom = wh * 0.15 + 5; 
    let drawY = wy - extraTop;
    let drawH = wh + extraTop + extraBottom;
    // compute base width for each blind
    let baseBlindW = ww * blindFrac;
    // reduce horizontal overhang to 5% each side
    let leftExtra = ww * 0.05;
    let leftX = wx - leftExtra;
    let leftW = baseBlindW + leftExtra;
    rect(leftX, drawY, leftW, drawH);
    // draw vertical slats inside left blind 
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
    // vertical slats on right blind 
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
  // slightly transparent round panel
  push();
  noStroke();
  fill(red(c), green(c), blue(c), 200);
  rect(tx, ty, tw, th, 6);
  pop();

  // thermostat icon 
  let iconX = tx + 10;
  let iconY = ty + th/2;
  push();
  noStroke();
  fill(180);
  ellipse(iconX, iconY, 24, 24);
  fill(150, 0, 0);
  ellipse(iconX, iconY, 8, 8);
  pop();

  // temperature text 
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
  let x = 450;
  let y = 230;

  let skin = color(230, 195, 165);
  let hair = color(55, 35, 25);
  let pajamaMain = color(70, 105, 165);
  let pajamaShade = color(55, 88, 145);
  let cuff = color(230, 235, 245);

  noStroke();

  if (sleepPosition === 0) {
    fill(pajamaMain);
    rect(x - 20, y - 32, 40, 50, 8);
    fill(pajamaShade);
    rect(x - 18, y + 16, 16, 18, 5);
    rect(x + 2, y + 16, 16, 18, 5);

    fill(skin);
    rect(x - 26, y - 24, 8, 24, 4);
    rect(x + 18, y - 24, 8, 24, 4);

    fill(cuff);
    rect(x - 19, y - 12, 38, 5, 3);

    fill(skin);
    ellipse(x, y - 42, 24, 20);
    fill(hair);
    arc(x, y - 45, 24, 15, PI, TWO_PI);
  } else if (sleepPosition === 1) {
    // side-sleeping on shoulder 
    fill(pajamaMain);
    rect(x - 18, y - 32, 36, 50, 8);

    // subtle side profile shaping
    fill(pajamaShade);
    rect(x - 16, y - 30, 14, 46, 6);

    // legs
    fill(pajamaShade);
    rect(x - 16, y + 16, 14, 18, 5);
    rect(x, y + 16, 14, 18, 5);

    // arm tucked under pillow side
    fill(skin);
    rect(x - 22, y - 20, 7, 18, 4);

    // head turned to side (profile)
    fill(skin);
    ellipse(x - 6, y - 42, 21, 18);
    fill(hair);
    arc(x - 7, y - 45, 21, 13, PI, TWO_PI);

    // pajama neckline cuff
    fill(cuff);
    rect(x - 8, y - 12, 14, 5, 2);
  } else {
    fill(pajamaShade);
    rect(x - 22, y - 34, 44, 54, 9);
    fill(pajamaMain);
    rect(x - 19, y + 16, 18, 18, 5);
    rect(x + 1, y + 16, 18, 18, 5);

    fill(skin);
    rect(x - 30, y - 22, 9, 22, 4);
    rect(x + 21, y - 22, 9, 22, 4);

    fill(skin);
    ellipse(x + 5, y - 44, 22, 19);
    fill(hair);
    arc(x + 5, y - 46, 22, 14, PI, TWO_PI);
  }
}

function drawBlanket() {
  if (blanketPosition === 0) return;

  // colors requested for blanket and fold details
  const blanketMain = color(176, 64, 41);
  const blanketFold = color(192, 83, 60);

  // slight shadow variations for fold contrast
  const foldShadowA = color(139, 57, 33, 180);
  const foldShadowB = color(132, 54, 31, 140);
  const foldShadowC = color(146, 62, 37, 120);

  // bed interior area where blanket appears
  const bedLeft = 337;
  const bedTop = 150;
  const bedWidth = 236;
  const bedBottom = 300;

  // 1 = blanket at legs, 2 = blanket up to shoulders
  const coverTopY = blanketPosition === 1 ? 210 : 195;

  noStroke();

  // main blanket body
  fill(blanketMain);
  rect(bedLeft, coverTopY, bedWidth, bedBottom - coverTopY, 0, 0, 10, 10);

  // folded top edge
  fill(blanketFold);
  rect(bedLeft, coverTopY, bedWidth, 14, 3, 3, 2, 2);

  // fold shadow lines with slight variation
  strokeWeight(1);
  stroke(foldShadowA);
  line(bedLeft, coverTopY + 14, bedLeft + bedWidth, coverTopY + 14);
  stroke(foldShadowB);
  line(bedLeft, coverTopY + 16, bedLeft + bedWidth, coverTopY + 16);
  stroke(foldShadowC);
  line(bedLeft, coverTopY + 18, bedLeft + bedWidth, coverTopY + 18);
  noStroke();
}

function drawUI() {

  let displayHour = floor(currentMinutes / 60) % 24;
  let displayMin = currentMinutes % 60;
  let formattedMin = displayMin < 10 ? "0" + displayMin : displayMin;

  // stats panel in lower-left 
  let panelX = 38;
  let panelY = GAME_H - 128;
  let panelW = 260;
  let panelH = 104;

  push();
  stroke(255, 255, 255, 130);
  strokeWeight(2);
  fill(0, 0, 0, 90);
  rect(panelX, panelY, panelW, panelH, 10);
  pop();

  fill(255);
  textSize(18);
  textAlign(LEFT, TOP);
  let baseX = panelX + 14;
  let baseY = panelY + 12;
  text(displayHour + ":" + formattedMin, baseX, baseY);
  text("Wake: 06:00", baseX, baseY + 30);
  text("Sleep Quality: " + sleepQuality, baseX, baseY + 60);

  if (gameOver) {
    
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

  // convert to game coordinates 
  let gx = (mouseX - offsetX) / scaleFactor;
  let gy = (mouseY - offsetY) / scaleFactor;

  if (thermostatActive) {
    // check clicks relative to popup
    if (gx < popup.x || gx > popup.x + popup.w || gy < popup.y || gy > popup.y + popup.h) {
      // clicked outside popup -> close
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
  let handled = false;
  for (let obj of objects) {
    if (isHovering(obj) && !handled) {
      if (obj.name === "thermostat") {
        thermostatActive = true;
        advanceTime(); // fixed 15 minutes for opening
        handled = true;
      }
      else if (obj.name === "chain") {
        lightOn = !lightOn;
        lightTransitionStart = millis();
        advanceTime();
        handled = true;
      }
      else if (obj.name === "window") {
        windowOpen = !windowOpen;
        advanceTime();
        handled = true;
      }
      else if (obj.name === "person") {
        sleepPosition = (sleepPosition + 1) % 3;
        advanceTime();
        handled = true;
      }
      else if (obj.name === "blanket") {
        blanketPosition = (blanketPosition + 1) % 3;
        advanceTime();
        handled = true;
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
  // never scale the game larger than its native resolution 
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
//Make blanket animations for amount% covered
//Adjust sleep quality

//Create more days, add weather effects, add sound effects, 
//Add more interactables which affects sleep quality in different ways (e.g. music, white noise, fan, etc.)

//Add dream minigames
//Minigames for all interactions, with different difficulty levels based on sleep quality
//Add more interactions (e.g. alarm clock, phone, etc.) and corresponding minigames