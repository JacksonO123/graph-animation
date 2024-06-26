import { Circle, Color, Line, Vector, distance, randInt } from 'simulationjs';
import { TRAVELER_STOP_TIME, TravelerStatus } from './constants';

export class MovingCircle extends Circle {
  private dir: number;
  private toDir: number;
  private width: number;
  private height: number;
  private graphId: number;
  private readonly buffer = 80;

  constructor(pos: InfoPoint, radius: number, width: number, height: number, color?: Color) {
    super(pos, radius, color);
    this.dir = Math.floor(Math.random() * 360);
    this.toDir = Math.floor(Math.random() * 360) - 180;
    this.width = width;
    this.height = height;
    this.graphId = pos.getId();
  }

  getWidth() {
    return this.width;
  }

  setWidth(width: number) {
    this.width = width;
  }

  getHeight() {
    return this.height;
  }

  setHeight(height: number) {
    this.height = height;
  }

  getGraphId() {
    return this.graphId;
  }

  step(scale: number) {
    const speed = 0.6 * scale;
    const vec = new Vector(speed, 0);
    vec.rotate(this.dir);
    this.pos.add(vec);

    if (this.pos.x < -this.radius - this.buffer) {
      this.pos.x = this.width + this.radius + this.buffer;
    } else if (this.pos.x > this.width + this.radius + this.buffer) {
      this.pos.x = -this.radius - this.buffer;
    }

    if (this.pos.y < -this.radius - this.buffer) {
      this.pos.y = this.height + this.radius + this.buffer;
    } else if (this.pos.y > this.height + this.radius + this.buffer) {
      this.pos.y = -this.radius - this.buffer;
    }

    const rotationDampen = 0.001;

    if (Math.abs(this.dir - this.toDir) > 0.5) {
      const amount = (this.toDir - this.dir) * rotationDampen;
      this.dir += amount;
    } else {
      this.toDir = Math.floor(Math.random() * 360);
    }
  }
}

export class InfoPoint extends Vector {
  private id: number;

  constructor(x: number, y: number, id: number) {
    super(x, y);
    this.id = id;
  }

  getId() {
    return this.id;
  }
}

export const generatePoints = (num: number, width: number, height: number) => {
  const res: InfoPoint[] = [];

  for (let i = 0; i < num; i++) {
    res.push(new InfoPoint(randInt(width), randInt(height), i));
  }

  return res;
};

export const pointsToCircles = (points: InfoPoint[], width: number, height: number) => {
  return points.map((point) => new MovingCircle(point, 3, width, height));
};

export const generateLines = (points: Vector[], cutoff: number) => {
  const lines: Line[] = [];

  for (let i = 0; i < points.length; i++) {
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      const dist = distance(points[i], points[j]);
      if (dist > cutoff) continue;

      lines.push(new Line(points[i], points[j], new Color(0, 0, 0, ((cutoff - dist) / cutoff) * 0.3), 2));
    }
  }

  return lines;
};

export class Graph {
  private graph: Record<number, number[]>;

  constructor() {
    this.graph = {};
  }

  getConnections(id: number) {
    return this.graph[id];
  }

  update(points: InfoPoint[], cutoff: number) {
    this.graph = {};

    points.forEach((point, i) => {
      const connections = [];

      for (let j = 0; j < points.length; j++) {
        if (i === j) continue;
        if (distance(point, points[j]) < cutoff) {
          connections.push(points[j].getId());
        }
      }

      this.graph[point.getId()] = connections;
    });
  }
}

export class Traveler extends Circle {
  private readonly from: Vector;
  private readonly to: Vector;
  private readonly cutoff: number;
  private readonly speed: number;
  private frameCount: number;
  // destId null after being cutoff (from & to too far, not moving)
  private destId: number | null;
  private terminated: boolean;
  private frame: number;
  private traveled: number;

  constructor(from: Vector, to: Vector, speed: number, cutoff: number, destId: number, frame: number) {
    super(from, 3, new Color(0, 123, 255));
    this.from = from;
    this.to = to;
    this.cutoff = cutoff;
    this.speed = speed;
    this.frameCount = 0;
    this.destId = destId;
    this.terminated = false;
    this.frame = frame;
    this.traveled = 0;
  }

  getFrame() {
    return this.frame;
  }

  setFrame(frame: number) {
    this.frame = frame;
  }

  getDestId() {
    return this.destId;
  }

  isDone() {
    return distance(this.pos, this.to) <= this.speed;
  }

  hasDestination() {
    return !!this.destId;
  }

  update(scale: number): TravelerStatus {
    const vec = new Vector(this.to.x - this.from.x, this.to.y - this.from.y);

    vec.normalize().multiply(this.traveled).add(this.from);

    this.traveled += this.speed * scale;

    if (this.terminated) {
      if (this.destId !== null) {
        this.moveTo(this.to);
      } else {
        this.moveTo(vec);
      }

      return TravelerStatus.Stopping;
    }

    if (this.isDone()) {
      this.terminated = true;
      this.fill(new Color(this.color.r, this.color.g, this.color.b, 0), TRAVELER_STOP_TIME / 1000);
      return TravelerStatus.Complete;
    }

    if (distance(this.to, this.from) > this.cutoff) {
      this.setRadius(0, 0.1);
      this.terminated = true;
      this.destId = null;
      return TravelerStatus.Complete;
    }

    this.moveTo(vec);

    this.frameCount++;

    return TravelerStatus.Active;
  }
}
