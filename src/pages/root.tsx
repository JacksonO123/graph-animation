import { onPageMount } from '@jacksonotto/lampjs';
import { Color, SceneCollection, Simulation, Vector, distance, frameLoop } from 'simulationjs';
import { Graph, Traveler, generateLines, generatePoints, pointsToCircles } from '../utils/utils';
import './root.css';

const Root = () => {
  const graph = new Graph();
  const cutoff = 260;

  const drawPointColors = false;

  onPageMount(() => {
    const canvas = new Simulation('canvas');
    canvas.fitElement();
    canvas.start();

    const circleCollection = new SceneCollection('circles');
    const lineCollection = new SceneCollection('lines');
    canvas.add(lineCollection);
    canvas.add(circleCollection);

    const points = generatePoints(50, canvas.width, canvas.height);
    const circles = pointsToCircles(points, canvas.width, canvas.height);

    addEventListener('resize', () => {
      circles.forEach((circle) => {
        circle.width = canvas.width;
        circle.height = canvas.height;
      });
    });

    const removedTravelers: Traveler[] = [];
    const travelers: Traveler[] = [];
    const frameRemoveQueue: number[] = [];
    const reachedSetFrames: Set<number>[] = [];

    const attemptRemoveFrame = (frame: number) => {
      for (let i = 0; i < travelers.length; i++) {
        if (travelers[i].frame === frame) return;
        if (travelers[i].frame > frame) travelers[i].frame--;
      }

      reachedSetFrames.splice(frame, 1);
    };

    frameLoop(() => {
      circles.forEach((circle) => circle.step());

      graph.update(points, cutoff);

      lineCollection.empty();
      const lines = generateLines(points, cutoff);
      lines.forEach((line) => lineCollection.add(line));

      travelers.forEach((traveler) => {
        traveler.draw(canvas.ctx as CanvasRenderingContext2D);

        const remove = traveler.update();

        if (remove === 'terminated') return;

        if (remove === 'stop') {
          if (traveler.destId) {
            animateGraph(traveler.destId, traveler.frame);
          }

          removedTravelers.unshift(traveler);
          setTimeout(() => {
            for (let i = 0; i < travelers.length; i++) {
              if (travelers[i] === traveler) {
                travelers.splice(i, 1);
                i--;
                if (traveler.frame in frameRemoveQueue) {
                  attemptRemoveFrame(traveler.frame);
                }
              }
            }
            removedTravelers.pop();
          }, 250);
        }
      });
    })();

    const getValidConnections = (id: number, frame: number) => {
      const connections = graph.getConnections(id);
      return connections.filter((item) => !reachedSetFrames[frame].has(item));
    };

    const animateGraph = (circleId: number, frame: number) => {
      if (!reachedSetFrames[frame]) return;

      let complete = true;
      let frameTravelers = 0;
      for (let i = 0; i < travelers.length; i++) {
        if (travelers[i].frame === frame) {
          frameTravelers++;

          if (travelers[i].destId) {
            const connections = getValidConnections(travelers[i].destId as number, frame);
            if (connections.length > 0) complete = false;
          }
        }
      }

      if (complete && frameTravelers > 0) {
        frameRemoveQueue.push(frame);
        return;
      }

      const connections = getValidConnections(circleId, frame);

      let circlePos: Vector | null = null;
      for (let i = 0; i < circles.length; i++) {
        if (circles[i].graphId === circleId) {
          circlePos = circles[i].pos;
        }
      }

      if (!circlePos) return;

      for (let i = 0; i < circles.length; i++) {
        for (let j = 0; j < connections.length; j++) {
          if (circles[i].graphId === connections[j]) {
            if (drawPointColors) {
              circles[i].fill(new Color(0, 255, 0));
            }
            reachedSetFrames[frame].add(circles[i].graphId);
            travelers.push(new Traveler(circlePos, circles[i].pos, 2, cutoff, circles[i].graphId, frame));
            break;
          }
        }
      }
    };

    canvas.on('click', (e: MouseEvent) => {
      circles.forEach((circle) => circle.fill(new Color(0, 0, 0)));

      let pos = new Vector(e.clientX, e.clientY);
      let idx = -1;

      for (let i = 0; i < circles.length; i++) {
        if (idx < 0) {
          idx = i;
          continue;
        }

        if (distance(circles[i].pos, pos) < distance(circles[idx].pos, pos)) {
          idx = i;
        }
      }

      if (drawPointColors) {
        circles[idx].fill(new Color(255, 0, 0));
      }

      reachedSetFrames.push(new Set());
      animateGraph(circles[idx].graphId, reachedSetFrames.length - 1);
    });

    circles.forEach((circle) => circleCollection.add(circle));
  });

  return <canvas id="canvas" />;
};

export default Root;
