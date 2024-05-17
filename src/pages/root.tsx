import { onPageMount } from '@jacksonotto/lampjs';
import { Color, SceneCollection, Simulation, Vector, distance, frameLoop } from 'simulationjs';
import { Graph, Traveler, generateLines, generatePoints, pointsToCircles } from '../utils/utils';
import './root.css';
import { CUTOFF, TRAVELER_STOP_TIME, TravelerStatus } from '@/utils/constants';

const Root = () => {
  const graph = new Graph();
  const travelerSpeed = 6;

  const drawPointColors = false;
  // const drawPointColors = true;

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
        circle.setWidth(canvas.width);
        circle.setHeight(canvas.height);
      });
    });

    const travelers: Traveler[] = [];
    const removedTravelers: Traveler[] = [];
    const frameRemoveQueue: number[] = [];
    const reachedSetFrames: Set<number>[] = [];
    const fps60Delay = 1000 / 60;

    const attemptRemoveFrame = (frame: number) => {
      for (let i = 0; i < travelers.length; i++) {
        if (travelers[i].getFrame() === frame) return;
      }

      for (let i = 0; i < travelers.length; i++) {
        const frame = travelers[i].getFrame();
        if (frame > frame) travelers[i].setFrame(frame - 1);
      }

      reachedSetFrames.splice(frame, 1);
    };

    const getValidConnections = (id: number, frame: number) => {
      const connections = graph.getConnections(id);
      return connections.filter((item) => !reachedSetFrames[frame].has(item));
    };

    const getCirclePos = (id: number) => {
      for (let i = 0; i < circles.length; i++) {
        if (circles[i].getGraphId() === id) return circles[i].pos;
      }

      return null;
    };

    const addTraveler = (id: number, frame: number) => {
      const connections = getValidConnections(id, frame);

      const circlePos = getCirclePos(id);
      if (!circlePos) return;

      for (let i = 0; i < circles.length; i++) {
        for (let j = 0; j < connections.length; j++) {
          if (circles[i].getGraphId() === connections[j]) {
            if (drawPointColors) {
              circles[i].fill(new Color(0, 255, 0));
            }

            reachedSetFrames[frame].add(circles[i].getGraphId());
            travelers.push(
              new Traveler(circlePos, circles[i].pos, travelerSpeed, CUTOFF, circles[i].getGraphId(), frame)
            );

            break;
          }
        }
      }
    };

    const animateGraph = (circleId: number, frame: number) => {
      if (!reachedSetFrames[frame]) return;

      let complete = true;
      let frameTravelers = 0;
      for (let i = 0; i < travelers.length; i++) {
        if (travelers[i].getFrame() === frame) {
          frameTravelers++;

          if (travelers[i].hasDestination()) {
            const connections = getValidConnections(travelers[i].getDestId() as number, frame);
            if (connections.length > 0) complete = false;
          }
        }
      }

      if (complete && frameTravelers > 0) {
        frameRemoveQueue.push(frame);
        return;
      }

      addTraveler(circleId, frame);
    };

    const removeTraveler = (traveler: Traveler) => {
      removedTravelers.unshift(traveler);

      setTimeout(() => {
        for (let i = 0; i < travelers.length; i++) {
          if (travelers[i] === traveler) {
            travelers.splice(i, 1);
            i--;

            // if this traveler's frame is queued for remove
            // attempt to remove it because this could be
            // the last traveler in the frame
            const frame = traveler.getFrame();
            if (frame in frameRemoveQueue) {
              attemptRemoveFrame(frame);
            }
          }
        }
        removedTravelers.pop();
      }, TRAVELER_STOP_TIME);
    };

    frameLoop((d) => {
      const scale = (d || 1) / fps60Delay;

      circles.forEach((circle) => circle.step(scale));
      graph.update(points, CUTOFF);

      lineCollection.empty();
      const lines = generateLines(points, CUTOFF);
      lines.forEach((line) => lineCollection.add(line));

      travelers.forEach((traveler) => {
        traveler.draw(canvas.ctx as CanvasRenderingContext2D);

        const status = traveler.update(scale);

        if (status === TravelerStatus.Stopping) return;

        if (status === TravelerStatus.Complete) {
          if (traveler.hasDestination()) animateGraph(traveler.getDestId() as number, traveler.getFrame());
          removeTraveler(traveler);
        }
      });
    })();

    canvas.on('click', (e: MouseEvent) => {
      circles.forEach((circle) => circle.fill(new Color(0, 0, 0)));

      let pos = new Vector(e.clientX, e.clientY);
      let idx = 0;

      for (let i = 1; i < circles.length; i++) {
        if (distance(circles[i].pos, pos) < distance(circles[idx].pos, pos)) {
          idx = i;
        }
      }

      if (drawPointColors) {
        circles[idx].fill(new Color(255, 0, 0));
      }

      const newFrame: Set<number> = new Set();
      const id = circles[idx].getGraphId();
      newFrame.add(id);
      reachedSetFrames.push(newFrame);

      animateGraph(id, reachedSetFrames.length - 1);
    });

    circles.forEach((circle) => circleCollection.add(circle));
  });

  return (
    <div class="root">
      <div class="info">
        <span>Jackson Otto</span>
        <br />
        <div>Click anywhere</div>
      </div>
      <canvas id="canvas" />
    </div>
  );
};

export default Root;
