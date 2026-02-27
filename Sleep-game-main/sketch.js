
// Time and game state 
let currentMinutes = 20 * 60; // 20:00
let wakeUpTime = 6 * 60;      // 06:00
let gameOver = false;

// Sleep Parameters 
let temperature = 20; // 10 - 30
let blanketState = 1; // 0 = off, 1 = half, 2 = full
let lightOn = true;
let windowOpen = false;
let sleepPosition = 0; // 0 = back, 1 = side, 2 = stomach

let sleepQuality = 100;

// Interactive Objects 
let objects = [];

function setup() {
  createCanvas(900, 600);

  objects = [
    { name: "thermostatDown", x: 50, y: 100, w: 40, h: 40 },
    { name: "thermostatUp", x: 100, y: 100, w: 40, h: 40 },
    { name: "blanket", x: 300, y: 250, w: 300, h: 150 },
    { name: "light", x: 750, y: 50, w: 60, h: 60 },
    { name: "window", x: 700, y: 150, w: 150, h: 120 },
    { name: "bed", x: 300, y: 200, w: 300, h: 200 }
  ];
}

function draw() {
  drawRoom();
  drawUI();
  if (!gameOver) calculateSleepQuality();
}



// Drawing functions

function drawRoom() {

  // Light affects room color
  if (lightOn) {
    background(180, 170, 150);
  } else {
    background(40, 40, 70);
  }

  // Bed
  fill(120, 70, 40);
  rect(300, 200, 300, 200);

  // Mattress
  fill(220);
  rect(320, 220, 260, 160);

  // Person
  drawPerson();

  // Blanket
  drawBlanket();

  // Thermostat
  fill(100);
  rect(50, 100, 90, 40);
  fill(255);
  textSize(14);
  textAlign(CENTER, CENTER);
  text(temperature + "°C", 95, 120);

  // Light switch
  fill(lightOn ? "yellow" : "gray");
  ellipse(780, 80, 60);

  // Window
  fill(windowOpen ? "skyblue" : "darkblue");
  rect(700, 150, 150, 120);

  highlightHover();
}

function drawPerson() {

  push();
  translate(450, 300);

  fill(255, 220, 200);

  if (sleepPosition === 0) {
    // Back
    ellipse(0, 0, 40, 60);
  } else if (sleepPosition === 1) {
    // Side
    ellipse(0, 0, 60, 40);
  } else {
    // Stomach
    rectMode(CENTER);
    rect(0, 0, 40, 60);
  }

  pop();
}

function drawBlanket() {

  if (blanketState === 0) return;

  fill(100, 150, 255);

  if (blanketState === 1) {
    rect(320, 300, 260, 80);
  } else {
    rect(320, 240, 260, 140);
  }
}

function drawUI() {

  fill(255);
  textSize(18);
  textAlign(RIGHT);

  let displayHour = floor(currentMinutes / 60) % 24;
  let displayMin = currentMinutes % 60;
  let formattedMin = displayMin < 10 ? "0" + displayMin : displayMin;

  text(displayHour + ":" + formattedMin, width - 40, 40);
  text("Wake: 06:00", width - 40, 70);
  text("Sleep Quality: " + sleepQuality, width - 40, 100);

  if (currentMinutes >= 24 * 60 + wakeUpTime) {
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

      if (obj.name === "blanket") {
        blanketState = (blanketState + 1) % 3;
      }

      if (obj.name === "light") {
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

  // Window open slight bonus
  if (windowOpen) sleepQuality += 5;

  // Blanket logic
  if (temperature < 17 && blanketState === 0) sleepQuality -= 15;
  if (temperature > 23 && blanketState === 2) sleepQuality -= 15;

  // Position bonus
  if (sleepPosition === 1) sleepQuality += 5;

  sleepQuality = constrain(sleepQuality, 0, 100);
}