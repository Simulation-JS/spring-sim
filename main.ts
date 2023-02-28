import { Simulation, Circle, Vector, Line, Color, frameLoop, distance } from 'simulationjs';
import { v4 as uuid } from 'uuid';

const canvas = new Simulation('canvas');
canvas.fitElement();

class PhysicsCircle extends Circle {
  mass: number;
  velocity = new Vector(0, 0);
  constructor(mass: number, ...args: ConstructorParameters<typeof Circle>) {
    super(...args);
    this.mass = mass;
  }
}

const fps = 60;
const forceDampen = 12;
const circleGap = 120;
const circleRadius = 6;
const circleMass = 0.5;
const g = 9.8;
let springLength = 80;
let springConstant = 4;
let currentDragging = 0;
let stationaryPoints = new Set([0]);
let numCircles = 10;

const updateFunctions = {
  updateSpringConstant: (val: string) => {
    springConstant = +val;
  },
  updateSpringLength: (val: string) => {
    springLength = +val;
  },
  resetCircles: () => {
    stationaryPoints = new Set([0]);
    canvas.empty();
    circles = generatePoints(new Vector(800, 250), numCircles);
  },
  updateNumCircles: (val: string) => {
    let num = +val;
    while (num > numCircles) {
      const circle = new PhysicsCircle(circleMass, circles[circles.length - 1].pos.clone(), circleRadius);
      circles.push(circle);
      numCircles++;
    }
    if (num < numCircles) {
      numCircles = num;
      const removed = circles.splice(numCircles);
    }
  }
};

const defaultValues = {
  k: springConstant,
  length: springLength,
  numCircles
};

applyDefaultValues(defaultValues);
applyFunctionsToWindow(updateFunctions);

function applyFunctionsToWindow<T extends { [key: string]: Function }>(funcs: T) {
  Object.keys(funcs).forEach((func) => {
    (window as any)[func] = funcs[func];
  });
}

function applyDefaultValues<T extends { [key: string]: number }>(vals: T) {
  Object.keys(vals).forEach((val) => {
    (document.getElementById(val) as HTMLInputElement).value = vals[val] + '';
  });
}

let circles = generatePoints(new Vector(800, 250), numCircles);

let dragging = false;
canvas.on('mousedown', (e: MouseEvent) => {
  const p = new Vector(e.offsetX * canvas.ratio, e.offsetY * canvas.ratio);
  currentDragging = getClosestPointIndex(p);
  if (pressingShift) {
    if (currentDragging === 0) return;
    if (stationaryPoints.has(currentDragging)) {
      stationaryPoints.delete(currentDragging);
      currentDragging = 0;
    } else {
      circles[currentDragging].velocity = new Vector(0, 0);
      stationaryPoints.add(currentDragging);
    }
    return;
  }
  dragging = true;
  circles[currentDragging].velocity = new Vector(0, 0);
});

canvas.on('mouseup', (e: MouseEvent) => {
  if (dragging) {
    dragging = false;
    const p = new Vector(e.offsetX * canvas.ratio, e.offsetY * canvas.ratio);
    const diff = p.sub(mousePos);
    circles[currentDragging].velocity = diff.multiply(2);
    currentDragging = 0;
  }
});

let mousePos = new Vector(0, 0);
canvas.on('mousemove', (e: MouseEvent) => {
  const p = new Vector(e.offsetX * canvas.ratio, e.offsetY * canvas.ratio);
  if (dragging) {
    const diff = p.clone().sub(mousePos);
    circles[currentDragging].move(diff);
  }
  mousePos = p;
});

let pressingShift = false;
window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Shift') pressingShift = true;
});

window.addEventListener('keyup', (e: KeyboardEvent) => {
  if (e.key === 'Shift') pressingShift = false;
});

let prev = Date.now();
frameLoop(() => {
  accelerateCircles(circles);
  circles.forEach((circle) => {
    circle.move(circle.velocity);
  });
  drawLines(circles);
  drawCircles(circles);
})();

function drawCircles(circles: PhysicsCircle[]) {
  circles.forEach((circle) => {
    if (!canvas.ctx) return;
    circle.draw(canvas.ctx);
  });
}

function getClosestPointIndex(p: Vector) {
  let res = 0;
  for (let i = 0; i < circles.length; i++) {
    if (distance(circles[i].pos, p) < distance(circles[res].pos, p)) {
      res = i;
    }
  }
  return res;
}

function springForceCircles(c1: PhysicsCircle, c2: PhysicsCircle) {
  const diff = new Vector(c1.pos.x - c2.pos.x, c1.pos.y - c2.pos.y);
  const force = new Vector(springConstant * diff.x, springConstant * (diff.y - springLength));
  return force;
}

function clamp(val: number, min: number, max: number) {
  return Math.max(Math.min(val, max), min);
}

function accelerateCircles(circles: PhysicsCircle[]) {
  const now = Date.now();
  const dx = clamp(now - prev, 0, 17);
  prev = now;
  for (let i = 0; i < circles.length; i++) {
    if (stationaryPoints.has(i) || i == currentDragging) continue;
    const weight = circles[i].mass * g;
    const forceBelow =
      i < circles.length - 1 ? springForceCircles(circles[i + 1], circles[i]) : new Vector(0, 0);
    const forceAbove = springForceCircles(circles[i], circles[i - 1]);
    const friction = 0.98;
    const force = new Vector(forceBelow.x - forceAbove.x, forceBelow.y - forceAbove.y);
    force.divide(forceDampen);
    force.appendY(weight);
    const accY = force.y / circles[i].mass / fps;
    const accX = force.x / circles[i].mass / fps;
    let vfy = circles[i].velocity.y + accY * dx;
    let vfx = circles[i].velocity.x + accX * dx;
    vfy *= friction;
    vfx *= friction;
    circles[i].velocity.y = vfy;
    circles[i].velocity.x = vfx;
  }
}

function drawLines(circles: PhysicsCircle[]) {
  for (let i = 0; i < circles.length - 1; i++) {
    const line = new Line(circles[i].pos, circles[i + 1].pos, new Color(0, 0, 0), 4);
    if (!canvas.ctx) continue;
    line.draw(canvas.ctx);
  }
}

function generatePoints(pos: Vector, num: number) {
  let res: PhysicsCircle[] = [];
  for (let i = 0; i < num; i++) {
    res.push(new PhysicsCircle(circleMass, new Vector(pos.x, i * circleGap + pos.y), circleRadius));
  }
  return res;
}
