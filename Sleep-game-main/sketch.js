
// Time and game state 
let currentMinutes = 20 * 60; // 20:00
let wakeUpTime = 6 * 60;      // 06:00
let gameOver = false;
let sleepButton; // button to end game early
let restartButton; // reloads page to start over

// Sleep Parameters 
let temperature = 20; // 10 - 30
let lightOn = true;
let windowOpen = false;
let blindFrac = 0; // 0 = fully open, ~0.45 = each blind covers 45%
let sleepPosition = 0; // 0 = back, 1 = side, 2 = stomach

let sleepQuality = 100;

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

function setup() {
  createCanvas(900, 600);

  // create the "sleep" button; clicking it ends the game immediately
  sleepButton = createButton('Sleep');
  sleepButton.position(20, 20);
  sleepButton.mousePressed(goSleep);

  // restart button reloads the page, resetting the entire sketch
  restartButton = createButton('Restart');
  restartButton.position(100, 20);
  restartButton.mousePressed(() => {
    // simple page refresh
    window.location.reload();
  });

  objects = [
    // thermostat moved between chain and window
    // thermostat moved higher and slightly left
    // thermostat shifted right 5% and down 10%
    { name: "thermostatDown", x: 576, y: 36, w: 40, h: 40 },
    { name: "thermostatUp",   x: 626, y: 36, w: 40, h: 40 },
    // light chain over bed is now the switch
    // light chain switch: wider (~80%) and shorter (~30%), shifted up and centered
    { name: "chain", x: 360, y: 30, w: 180, h: 84 },
    // window painting hitbox moved upward about 60% of its height
    { name: "window", x: 691, y: 40, w: 164, h: 64 },
    // bed hitbox updated for 90° rotation (vertical orientation)
    { name: "bed", x: 350, y: 150, w: 200, h: 300 }
  ];
}

function draw() {
  drawRoom();
  drawUI();
  if (!gameOver) calculateSleepQuality();
}



// Drawing functions

function drawRoom() {

  // draw combined room background
  image(roomImg, 0, 0, width, height);

  // optionally darken if light off
  if (!lightOn) {
    fill(0, 0, 0, 150);
    rect(0, 0, width, height);
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


  // Thermostat container (full size)
  fill(100);
  rect(576, 36, 90, 40);
  // arrows inside thermostat
  image(thermostatDownImg, 576, 36, 40, 40);
  image(thermostatUpImg,   626, 36, 40, 40);
  fill(255);
  textSize(14);
  textAlign(CENTER, CENTER);
  text(temperature + "°C", 621, 56);


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

  // draw at bottom-left corner
  let baseX = 40;
  let baseY = height - 80;
  text(displayHour + ":" + formattedMin, baseX, baseY);
  text("Wake: 06:00", baseX, baseY + 30);
  text("Sleep Quality: " + sleepQuality, baseX, baseY + 60);

  if (gameOver) {
    // if gameOver was triggered by the button we may not have advanced time
    textSize(40);
    textAlign(CENTER, CENTER);
    text("Morning!\nFinal Sleep Quality: " + sleepQuality, width/2, height/2);
    noLoop();
  } else if (currentMinutes >= 24 * 60 + wakeUpTime) {
    gameOver = true;
    textSize(40);
    textAlign(CENTER, CENTER);
    text("Morning!\nFinal Sleep Quality: " + sleepQuality, width/2, height/2);
    noLoop();
  }
}


// Interaction logic


function mousePressed() {
  if (gameOver) return;

  for (let obj of objects) {
    if (isHovering(obj)) {

      if (obj.name === "thermostatUp") {
        temperature = min(30, temperature + 1);
      }

      if (obj.name === "thermostatDown") {
        temperature = max(10, temperature - 1);
      }

          if (obj.name === "chain") {
        lightOn = !lightOn;
      }

      if (obj.name === "window") {
        windowOpen = !windowOpen;
      }

      if (obj.name === "bed") {
        sleepPosition = (sleepPosition + 1) % 3;
      }

      advanceTime();
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


// Highlight objects on hover


function highlightHover() {
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
  return mouseX > obj.x &&
         mouseX < obj.x + obj.w &&
         mouseY > obj.y &&
         mouseY < obj.y + obj.h;
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