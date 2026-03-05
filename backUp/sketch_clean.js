// SLEEP QUALITY CONFIG - Easily adjustable game parameters

const SLEEP_QUALITY_CONFIG = {
  baseQuality: 60,
  timing: {
    startTime: 20 * 60,
    wakeUpTime: 6 * 60
  },
  temperature: {
    idealTemp: 17.5,
    penaltyPerDegree: 4
  },
  light: {
    penalty: 20
  },
  blinds: {
    open: -10,
    closed: 10
  },
  sleepPosition: {
    side: -5,
    back: 5,
    stomach: -5
  },
  blanket: {
    under: -10,
    legs: 10,
    shoulders: 20
  }
};


// Game constants

const GAME_W = 900;
const GAME_H = 600;
const LIGHT_TRANSITION_DURATION = 1000;
const TIME_ADVANCE_PER_INTERACTION = 15;

// Game state variables

let currentMinutes = SLEEP_QUALITY_CONFIG.timing.startTime;
let wakeUpTime = SLEEP_QUALITY_CONFIG.timing.wakeUpTime;
let gameOver = false;

// Sleep parameter variables
let temperature = 30.0;
let lightOn = true;
let windowOpen = false;
let blindFrac = 0;
let sleepPosition = 0;
let blanketPosition = 0;
let sleepQuality = 100;

// Ui state variables
let thermostatActive = false;
let popup = { x: 0, y: 0, w: 0, h: 0 };
let popupArrows = [];

let lightAlpha = 0;
let lightTargetAlpha = 0;
let lightTransitionStart = 0;

let objects = [];
let sleepButton;
let restartButton;

// Display & Canvas variables 
let scaleFactor = 1;
let offsetX = 0;
let offsetY = 0;
let patternGraphics;

// Assets

let customFont;
let roomImg;
let thermostatUpImg;
let thermostatDownImg;
let personBackImg;
let personSideImg;
let personStomachImg;

// Preload

function preload() {
  customFont = loadFont('assets/VT323-Regular.ttf');
  roomImg = loadImage('assets/room.png');
  thermostatUpImg = loadImage('assets/thermostat_up.png');
  thermostatDownImg = loadImage('assets/thermostat_down.png');
  personBackImg = loadImage('assets/person_back.png');
  personSideImg = loadImage('assets/person_side.png');
  personStomachImg = loadImage('assets/person_stomach.png');
}

// Setup


function setup() {
  createCanvas(windowWidth, windowHeight);
  updateScaling();
  textFont(customFont);

  patternGraphics = createGraphics(width, height);
  generatePattern(patternGraphics);

  setupButtons();
  setupInteractiveObjects();
}

function setupButtons() {
  sleepButton = createButton('Sleep');
  sleepButton.mousePressed(goSleep);
  sleepButton.style('font-family', 'VT323');
  sleepButton.style('font-size', '14px');

  restartButton = createButton('Restart');
  restartButton.mousePressed(() => window.location.reload());
  restartButton.style('font-family', 'VT323');
  restartButton.style('font-size', '14px');

  updateButtonPositions();
}

function setupInteractiveObjects() {
  objects = [
    { name: "thermostat", x: 576, y: 36, w: 90, h: 40 },
    { name: "chain", x: 360, y: 30, w: 180, h: 84 },
    { name: "window", x: 691, y: 40, w: 164, h: 64 },
    { name: "person", x: 410, y: 180, w: 80, h: 60 },
    { name: "blanket", x: 352, y: 210, w: 196, h: 108 }
  ];
}

// Main loop

function draw() {
  drawBackground();

  push();
  translate(offsetX, offsetY);
  scale(scaleFactor);

  drawRoom();
  drawUI();
  if (!gameOver) calculateSleepQuality();

  pop();

  updateButtonPositions();
}

function drawBackground() {
  if (patternGraphics) {
    image(patternGraphics, 0, 0);
  } else {
    background(220);
  }
}

// Draw room & Environment

function drawRoom() {
  image(roomImg, 0, 0, GAME_W, GAME_H);

  drawLightOverlay();
  drawPerson();
  drawBlanket();
  drawBlinds();
  drawThermostat();

  if (thermostatActive) drawThermostatPopup();
  highlightHover();
}

function drawLightOverlay() {
  lightTargetAlpha = lightOn ? 0 : 150;

  let elapsed = millis() - lightTransitionStart;
  if (elapsed < LIGHT_TRANSITION_DURATION) {
    let t = elapsed / LIGHT_TRANSITION_DURATION;
    lightAlpha = lerp(lightAlpha, lightTargetAlpha, t);
  } else {
    lightAlpha = lightTargetAlpha;
  }

  if (lightAlpha > 1) {
    fill(0, 0, 0, lightAlpha);
    rect(0, 0, GAME_W, GAME_H);
  }
}

function drawBlinds() {
  blindFrac = lerp(blindFrac, windowOpen ? 0 : 0.45, 0.1);

  if (blindFrac <= 0.001) return;

  const wx = 691, wy = 40, ww = 164, wh = 64;
  const extraTop = wh * 0.20;
  const extraBottom = wh * 0.15 + 5;
  const drawY = wy - extraTop;
  const drawH = wh + extraTop + extraBottom;
  const baseBlindW = ww * blindFrac;
  const slatCount = 4;

  // Left blind
  const leftExtra = ww * 0.05;
  const leftX = wx - leftExtra;
  const leftW = baseBlindW + leftExtra;

  fill(0, 0, 180);
  rect(leftX, drawY, leftW, drawH);
  drawBlindsSlats(leftX, drawY, leftW, drawH, slatCount);

  // Right blind
  const rightExtra = ww * 0.05;
  const rightX = wx + ww - baseBlindW;
  const rightW = baseBlindW + rightExtra;

  fill(0, 0, 180);
  rect(rightX, drawY, rightW, drawH);
  drawBlindsSlats(rightX, drawY, rightW, drawH, slatCount);
}

function drawBlindsSlats(x, y, w, h, count) {
  stroke(120, 120, 200);
  for (let i = 1; i <= count; i++) {
    let xpos = x + (i * w) / (count + 1);
    line(xpos, y, xpos, y + h);
  }
  noStroke();
}

function drawThermostat() {
  const tx = 576, ty = 36, tw = 90, th = 40;
  const c = roomImg.get(tx + tw / 2, ty + th / 2);

  push();
  noStroke();
  fill(0, 0, 0, 50);
  rect(tx + 2, ty + 2, tw, th, 6);
  pop();

  push();
  noStroke();
  fill(red(c), green(c), blue(c), 200);
  rect(tx, ty, tw, th, 6);
  pop();

  push();
  noStroke();
  fill(180);
  ellipse(tx + 10, ty + th / 2, 24, 24);
  fill(150, 0, 0);
  ellipse(tx + 10, ty + th / 2, 8, 8);
  pop();

  fill(220);
  textSize(14);
  textAlign(LEFT, CENTER);
  let dispTemp = (temperature % 1 === 0) ? temperature.toString() : temperature.toFixed(1);
  text(dispTemp + "°C", tx + 35, ty + th / 2);
}

// Draw character & Environment

function drawPerson() {
  const x = 450, y = 230;
  const skin = color(230, 195, 165);
  const hair = color(55, 35, 25);
  const pajamaMain = color(70, 105, 165);
  const pajamaShade = color(55, 88, 145);
  const cuff = color(230, 235, 245);

  noStroke();

  if (sleepPosition === 0) drawPersonBack(x, y, pajamaMain, pajamaShade, skin, cuff, hair);
  else if (sleepPosition === 1) drawPersonSide(x, y, pajamaMain, pajamaShade, skin, cuff, hair);
  else drawPersonStomach(x, y, pajamaShade, pajamaMain, skin, cuff, hair);
}

function drawPersonBack(x, y, pMain, pShade, skin, cuff, hair) {
  fill(pMain);
  rect(x - 20, y - 32, 40, 50, 8);
  fill(pShade);
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
}

function drawPersonSide(x, y, pMain, pShade, skin, cuff, hair) {
  fill(pMain);
  rect(x - 18, y - 32, 36, 50, 8);
  fill(pShade);
  rect(x - 16, y - 30, 14, 46, 6);
  rect(x - 16, y + 16, 14, 18, 5);
  rect(x, y + 16, 14, 18, 5);
  fill(skin);
  rect(x - 22, y - 20, 7, 18, 4);
  ellipse(x - 6, y - 42, 21, 18);
  fill(cuff);
  rect(x - 8, y - 12, 14, 5, 2);
  fill(hair);
  arc(x - 7, y - 45, 21, 13, PI, TWO_PI);
}

function drawPersonStomach(x, y, pShade, pMain, skin, cuff, hair) {
  fill(pShade);
  rect(x - 22, y - 34, 44, 54, 9);
  fill(pMain);
  rect(x - 19, y + 16, 18, 18, 5);
  rect(x + 1, y + 16, 18, 18, 5);
  fill(skin);
  rect(x - 30, y - 22, 9, 22, 4);
  rect(x + 21, y - 22, 9, 22, 4);
  ellipse(x + 5, y - 44, 22, 19);
  fill(hair);
  arc(x + 5, y - 46, 22, 14, PI, TWO_PI);
}

function drawBlanket() {
  if (blanketPosition === 0) return;

  const blanketMain = color(176, 64, 41);
  const blanketFold = color(192, 83, 60);
  const foldShadowA = color(139, 57, 33, 180);
  const foldShadowB = color(132, 54, 31, 140);
  const foldShadowC = color(146, 62, 37, 120);

  const bedLeft = 337;
  const bedWidth = 236;
  const bedBottom = 300;
  const coverTopY = blanketPosition === 1 ? 210 : 195;

  noStroke();
  fill(blanketMain);
  rect(bedLeft, coverTopY, bedWidth, bedBottom - coverTopY, 0, 0, 10, 10);

  fill(blanketFold);
  rect(bedLeft, coverTopY, bedWidth, 14, 3, 3, 2, 2);

  strokeWeight(1);
  stroke(foldShadowA);
  line(bedLeft, coverTopY + 14, bedLeft + bedWidth, coverTopY + 14);
  stroke(foldShadowB);
  line(bedLeft, coverTopY + 16, bedLeft + bedWidth, coverTopY + 16);
  stroke(foldShadowC);
  line(bedLeft, coverTopY + 18, bedLeft + bedWidth, coverTopY + 18);
  noStroke();
}

// Draw UI & HUD
function drawUI() {
  const displayHour = floor(currentMinutes / 60) % 24;
  const displayMin = currentMinutes % 60;
  const formattedMin = displayMin < 10 ? "0" + displayMin : displayMin;

  drawStatsPanel(displayHour, formattedMin);

  if (gameOver) drawGameOverScreen();
  else if (currentMinutes >= 24 * 60 + wakeUpTime) endGame();
}

function drawStatsPanel(hour, min) {
  const panelX = 38;
  const panelY = GAME_H - 128;
  const panelW = 260;
  const panelH = 104;

  push();
  stroke(255, 255, 255, 130);
  strokeWeight(2);
  fill(0, 0, 0, 90);
  rect(panelX, panelY, panelW, panelH, 10);
  pop();

  fill(255);
  textSize(18);
  textAlign(LEFT, TOP);
  const baseX = panelX + 14;
  const baseY = panelY + 12;

  text(hour + ":" + min, baseX, baseY);
  text("Wake: 06:00", baseX, baseY + 30);
  text("Sleep Quality: " + sleepQuality, baseX, baseY + 60);
}

function drawGameOverScreen() {
  textSize(40);
  textAlign(CENTER, CENTER);
  text("Morning!\nFinal Sleep Quality: " + sleepQuality, GAME_W / 2, GAME_H / 2);
  noLoop();
}

function drawThermostatPopup() {
  const pw = 300, ph = 180;
  popup.w = pw;
  popup.h = ph;
  popup.x = (GAME_W - pw) / 2;
  popup.y = (GAME_H - ph) / 2;

  fill(50, 220);
  rect(popup.x, popup.y, pw, ph, 10);

  fill(255);
  textSize(18);
  textAlign(CENTER, TOP);
  text("Thermostat", popup.x + pw / 2, popup.y + 10);

  textSize(24);
  textAlign(CENTER, CENTER);
  let dispTemp = (temperature % 1 === 0) ? temperature.toString() : temperature.toFixed(1);
  text(dispTemp + "°C", popup.x + pw / 2 - 10, popup.y + ph / 2 - 10);

  drawThermostatArrows();
}

function drawThermostatArrows() {
  const aw = 40, ah = 40;
  const ax = popup.x + popup.w / 2 - aw - 10;
  const dx = popup.x + popup.w / 2 + 10;
  const ay = popup.y + popup.h - ah - 20;

  popupArrows = [
    { name: 'down', x: ax, y: ay, w: aw, h: ah },
    { name: 'up', x: dx, y: ay, w: aw, h: ah }
  ];

  tint(255);
  image(thermostatDownImg, ax, ay, aw, ah);
  image(thermostatUpImg, dx, ay, aw, ah);
  noTint();
}

function highlightHover() {
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

// Input handling

function mousePressed() {
  if (gameOver) return;

  const gx = (mouseX - offsetX) / scaleFactor;
  const gy = (mouseY - offsetY) / scaleFactor;

  if (thermostatActive) {
    handleThermostatInput(gx, gy);
  } else {
    handleObjectInteraction(gx, gy);
  }
}

function handleThermostatInput(gx, gy) {
  if (gx < popup.x || gx > popup.x + popup.w || gy < popup.y || gy > popup.y + popup.h) {
    thermostatActive = false;
    return;
  }

  for (let arrow of popupArrows) {
    if (gx > arrow.x && gx < arrow.x + arrow.w && gy > arrow.y && gy < arrow.y + arrow.h) {
      if (arrow.name === 'up') temperature = min(30, temperature + 0.5);
      else if (arrow.name === 'down') temperature = max(10, temperature - 0.5);
      return;
    }
  }
}

function handleObjectInteraction(gx, gy) {
  for (let obj of objects) {
    if (isHovering(obj)) {
      switch (obj.name) {
        case "thermostat":
          thermostatActive = true;
          advanceTime();
          break;
        case "chain":
          lightOn = !lightOn;
          lightTransitionStart = millis();
          advanceTime();
          break;
        case "window":
          windowOpen = !windowOpen;
          advanceTime();
          break;
        case "person":
          sleepPosition = (sleepPosition + 1) % 3;
          advanceTime();
          break;
        case "blanket":
          blanketPosition = (blanketPosition + 1) % 3;
          advanceTime();
          break;
      }
      return;
    }
  }
}

function isHovering(obj) {
  const gx = (mouseX - offsetX) / scaleFactor;
  const gy = (mouseY - offsetY) / scaleFactor;
  return gx > obj.x && gx < obj.x + obj.w && gy > obj.y && gy < obj.y + obj.h;
}

// Main mechanics

function advanceTime() {
  currentMinutes += TIME_ADVANCE_PER_INTERACTION;
}

function goSleep() {
  currentMinutes = 24 * 60 + wakeUpTime;
  gameOver = true;
  if (sleepButton) sleepButton.attribute('disabled', '');
}

function endGame() {
  gameOver = true;
}

function calculateSleepQuality() {
  sleepQuality = SLEEP_QUALITY_CONFIG.baseQuality;

  // Temperature
  const tempDifference = abs(SLEEP_QUALITY_CONFIG.temperature.idealTemp - temperature);
  sleepQuality -= tempDifference * SLEEP_QUALITY_CONFIG.temperature.penaltyPerDegree;

  // Light & Blinds
  if (lightOn) sleepQuality -= SLEEP_QUALITY_CONFIG.light.penalty;
  sleepQuality += blindFrac < 0.2 ? SLEEP_QUALITY_CONFIG.blinds.open : SLEEP_QUALITY_CONFIG.blinds.closed;

  // Position Bonuses
  sleepQuality += [
    SLEEP_QUALITY_CONFIG.sleepPosition.back,
    SLEEP_QUALITY_CONFIG.sleepPosition.side,
    SLEEP_QUALITY_CONFIG.sleepPosition.stomach
  ][sleepPosition];

  // Blanket Bonuses
  sleepQuality += [
    SLEEP_QUALITY_CONFIG.blanket.under,
    SLEEP_QUALITY_CONFIG.blanket.legs,
    SLEEP_QUALITY_CONFIG.blanket.shoulders
  ][blanketPosition];

  sleepQuality = constrain(sleepQuality, 0, 100);
}

// Util & Display functions
function updateButtonPositions() {
  if (sleepButton) sleepButton.position(offsetX + 20 * scaleFactor, offsetY + 20 * scaleFactor);
  if (restartButton) restartButton.position(offsetX + 100 * scaleFactor, offsetY + 20 * scaleFactor);
}

function updateScaling() {
  scaleFactor = min(1, width / GAME_W, height / GAME_H);
  offsetX = (width - GAME_W * scaleFactor) / 2;
  offsetY = (height - GAME_H * scaleFactor) / 2;
}

function generatePattern(g) {
  const tile = 16;
  for (let y = 0; y < g.height; y += tile) {
    for (let x = 0; x < g.width; x += tile) {
      if (((x / tile) + (y / tile)) % 2 === 0) {
        g.fill(150, 100, 50);
      } else {
        g.fill(120, 80, 40);
      }
      g.noStroke();
      g.rect(x, y, tile, tile);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateScaling();
  if (patternGraphics) {
    patternGraphics.resizeCanvas(width, height);
    generatePattern(patternGraphics);
  }
}


// TODO:


// Add more interactables which affect sleep quality (e.g. music, white noise, fan, etc.)
// #1: Create multiple days of gameplay
// Add weather effects
// #2: Add sound effects
// Add dream minigames
// Minigames for all interactions with different difficulty levels based on sleep quality
// Add more interactions (e.g. alarm clock, phone, etc.) + corresponding minigames
