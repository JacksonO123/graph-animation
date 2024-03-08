import { Circle, Color, Line, Vector, distance, randInt } from 'simulationjs';

export class MovingCircle extends Circle {
  private dir: number;
  private toDir: number;
  width: number;
  height: number;
  graphId: number;
  private readonly buffer = 80;
  constructor(pos: InfoPoint, radius: number, width: number, height: number, color?: Color) {
    super(pos, radius, color);
    this.dir = Math.floor(Math.random() * 360);
    this.toDir = Math.floor(Math.random() * 360) - 180;
    this.width = width;
    this.height = height;
    this.graphId = pos.id;
  }
  step() {
    const speed = 0.42;
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
  id: number;
  constructor(x: number, y: number, id: number) {
    super(x, y);
    this.id = id;
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
          connections.push(points[j].id);
        }
      }

      this.graph[point.id] = connections;
    });
  }
}

type TravelerStatus = 'continue' | 'stop' | 'terminated';

export class Traveler extends Circle {
  private readonly from: Vector;
  private readonly to: Vector;
  private readonly cutoff: number;
  private readonly speed: number;
  private frameCount: number;
  destId: number | null;
  private terminated: boolean;
  frame: number;
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
  }
  isDone() {
    return distance(this.pos, this.to) <= this.speed;
  }
  update(): TravelerStatus {
    const vec = new Vector(this.to.x - this.from.x, this.to.y - this.from.y);
    vec
      .normalize()
      .multiply(this.speed * this.frameCount)
      .add(this.from);

    if (this.terminated) {
      if (this.destId !== null) {
        this.moveTo(this.to);
      } else {
        this.moveTo(vec);
      }

      return 'terminated';
    }

    if (this.isDone()) {
      this.terminated = true;
      this.fill(new Color(this.color.r, this.color.g, this.color.b, 0), 0.25);
      return 'stop';
    }

    if (distance(this.to, this.from) > this.cutoff) {
      this.setRadius(0, 0.1);
      this.terminated = true;
      this.destId = null;
      return 'stop';
    }

    this.moveTo(vec);

    this.frameCount++;

    return 'continue';
  }
}
