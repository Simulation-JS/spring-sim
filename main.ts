import { Simulation, Circle, Vector, Line, Color, frameLoop, distance } from 'simulationjs';

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

const g = 9.8;
const fps = 60;
const springLength = 80;
const springConstant = 3;
const forceDampen = 20;
let currentDragging = 0;

const circles = generatePoints(new Vector(800, 250), 12, 0.5);
for (let i = 0; i < circles.length; i++) canvas.add(circles[i]);

let dragging = false;
canvas.on('mousedown', (e: MouseEvent) => {
  dragging = true;
  const p = new Vector(e.offsetX * canvas.ratio, e.offsetY * canvas.ratio);
  for (let i = 0; i < circles.length; i++) {
    if (distance(circles[i].pos, p) < distance(circles[currentDragging].pos, p)) {
      currentDragging = i;
    }
  }
  circles[currentDragging].velocity = new Vector(0, 0);
});

canvas.on('mouseup', (e: MouseEvent) => {
  dragging = false;
  const p = new Vector(e.offsetX * canvas.ratio, e.offsetY * canvas.ratio);
  const diff = p.sub(mousePos);
  circles[currentDragging].velocity = diff.multiply(2);
  currentDragging = 0;
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

let prev = Date.now();
frameLoop(() => {
  accelerateCircles(circles);
  for (let i = 0; i < circles.length; i++) {
    circles[i].move(circles[i].velocity);
  }
  drawLines(circles);
})();

function getForceBelow(index: number) {
  // add more stuff
  const weight = circles[index].mass * g;
  if (index < circles.length - 1) {
    return springForceCircles(circles[index + 1], circles[index]).appendY(weight);
  }
  return new Vector(0, weight);
}

function springForceCircles(c1: PhysicsCircle, c2: PhysicsCircle) {
  const diff = new Vector(c1.pos.x - c2.pos.x, c1.pos.y - c2.pos.y);
  const force = new Vector(springConstant * diff.x, springConstant * (diff.y - springLength));
  return force;
}

function getForceAbove(index: number) {
  return springForceCircles(circles[index], circles[index - 1]);
}

function clamp(val: number, min: number, max: number) {
  return Math.max(Math.min(val, max), min);
}

function accelerateCircles(circles: PhysicsCircle[]) {
  const now = Date.now();
  const dx = clamp(now - prev, 0, 17);
  prev = now;
  for (let i = 0; i < circles.length; i++) {
    if (i === 0 || i == currentDragging) continue;
    const forceBelow = getForceBelow(i);
    const forceAbove = getForceAbove(i);
    const friction = 0.97;
    const force = new Vector(forceBelow.x - forceAbove.x, forceBelow.y - forceAbove.y);
    force.divide(forceDampen);
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

function generatePoints(pos: Vector, num: number, mass: number) {
  let res: PhysicsCircle[] = [];
  const radius = 10;
  const gap = 160;
  for (let i = 0; i < num; i++) {
    res.push(new PhysicsCircle(mass, new Vector(pos.x, i * gap + pos.y), radius));
  }
  return res;
}
