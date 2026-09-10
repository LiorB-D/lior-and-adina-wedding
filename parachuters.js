import { startJourney } from './journey.js';

const button = document.querySelector('.footer-heart');
const sky = document.querySelector('.parachute-sky');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let active = false;

button.addEventListener('click', async () => {
  if (active) return;
  active = true;
  let renderer;
  let scene;
  let frame;
  let resize;
  let sizeObserver;
  let specialButton;
  const dispose = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', resize);
    sizeObserver?.disconnect();
    specialButton?.remove();
    const geometries = new Set();
    const materials = new Set();
    scene?.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) materials.add(object.material);
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    renderer?.dispose();
    renderer?.forceContextLoss();
    sky.replaceChildren();
    sky.style.opacity = '';
    active = false;
  };

  try {
    // Bundled into a classic script so the animation also works over file://.
    const THREE = await import('./vendor/three.module.js');
    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    sky.append(renderer.domElement);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000);
    camera.position.z = 1000;
    let width;
    let height;
    resize = () => {
      width = sky.clientWidth;
      height = sky.clientHeight;
      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();
    window.addEventListener('resize', resize);
    // The sky covers the document, so scrolling moves through the scene.
    sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(sky);

    const ink = new THREE.MeshBasicMaterial({ color: 0x655469 });
    const rope = new THREE.MeshBasicMaterial({ color: 0x9a8896 });
    const sphere = new THREE.CircleGeometry(5, 24);
    const cylinder = new THREE.CylinderGeometry(1, 1, 1, 6);
    const up = new THREE.Vector3(0, 1, 0);
    function rod(parent, a, b, radius, material = ink) {
      const start = new THREE.Vector3(...a);
      const end = new THREE.Vector3(...b);
      const delta = end.clone().sub(start);
      const mesh = new THREE.Mesh(cylinder, material);
      mesh.position.copy(start.add(end).multiplyScalar(0.5));
      mesh.scale.set(radius, delta.length(), radius);
      mesh.quaternion.setFromUnitVectors(up, delta.normalize());
      parent.add(mesh);
    }
    const shape = new THREE.Shape();
    shape.moveTo(0, -20);
    shape.bezierCurveTo(-9, -10, -31, 4, -30, 17);
    shape.bezierCurveTo(-29, 34, -9, 37, 0, 22);
    shape.bezierCurveTo(9, 37, 29, 34, 30, 17);
    shape.bezierCurveTo(31, 4, 9, -10, 0, -20);
    const canopyGeometry = new THREE.ShapeGeometry(shape, 24);
    const reduced = motion.matches;
    const count = reduced ? 6 : width < 600 ? 12 : 18;
    const specialIndex = Math.floor(Math.random() * count);
    const parachuters = [];
    for (let i = 0; i < count; i++) {
      const group = new THREE.Group();
      const canopy = new THREE.Mesh(canopyGeometry, new THREE.MeshBasicMaterial({
        color: i === specialIndex
          ? 0x80334c
          : new THREE.Color().setHSL(0.93 + (i / count) * 0.055, 0.62, 0.55 + (i / count) * 0.17),
      }));
      canopy.position.set(0, 32, 2);
      group.add(canopy);
      const body = new THREE.Group();
      body.position.y = -23;
      group.add(body);
      const head = new THREE.Mesh(sphere, ink);
      body.add(head);
      rod(body, [0, -5, 0], [0, -24, 0], 1.4);
      for (const side of [-1, 1]) {
        rod(body, [0, -10, 0], [side * 10, -9, 0], 1.2);
        rod(body, [side * 10, -9, 0], [side * 15, 7, 0], 1.2);
        rod(body, [side * 15, 7, 0], [side * 25, 66, 0], 0.45, rope);
        rod(body, [side * 15, 7, 0], [side * 8, 39, 0], 0.45, rope);
      }
      const legs = [-1, 1].map(side => {
        const leg = new THREE.Group();
        leg.position.y = -24;
        rod(leg, [0, 0, 0], [side * 8, -12, 0], 1.3);
        rod(leg, [side * 8, -12, 0], [side * 11, -23, 0], 1.3);
        rod(leg, [side * 11, -23, 0], [side * 15, -23, 0], 1.3);
        body.add(leg);
        return leg;
      });
      group.scale.setScalar(0.7 + Math.random() * 0.4);
      scene.add(group);
      parachuters.push({ group, canopy, legs, body,
        lane: (i + 0.5) / count, phase: Math.random() * Math.PI * 2,
        delay: Math.random() * 2, duration: 8 + Math.random() * 4,
      });
    }
    const start = performance.now();
    specialButton = document.createElement('button');
    specialButton.className = 'special-parachuter';
    specialButton.setAttribute('aria-label', 'Follow the maroon parachuter on an adventure');
    specialButton.hidden = true;
    document.body.append(specialButton);
    specialButton.addEventListener('click', () => {
      // The journey copies the meshes before the falling scene is released.
      startJourney(THREE, parachuters[specialIndex].group, button);
      dispose();
    });
    function animate(now) {
      const elapsed = (now - start) / 1000;
      let remaining = false;
      for (const p of parachuters) {
        const age = elapsed - p.delay;
        const progress = reduced ? 0.45 : age / p.duration;
        p.group.visible = reduced || (age >= 0 && progress <= 1);
        if (reduced ? elapsed < 3 : progress <= 1) remaining = true;
        const t = reduced ? p.phase : age * 1.6 + p.phase;
        p.group.position.set(
          (p.lane - 0.5) * Math.max(0, width - 110) + Math.sin(t) * 16,
          height / 2 + 100 - progress * (height + 220),
          Math.sin(p.phase) * 30,
        );
        p.group.rotation.z = Math.sin(t) * 0.13;
        // Keep the silhouettes facing the screen, with motion in the drawing plane.
        p.canopy.scale.x = 1 + Math.sin(t * 0.8) * 0.025;
        p.legs.forEach((leg, index) => {
          leg.rotation.z = Math.sin(t * 2 + index * Math.PI) * 0.22;
        });
      }
      if (reduced) sky.style.opacity = String(Math.min(elapsed * 3, 1, Math.max(0, (3 - elapsed) * 2)));
      const special = parachuters[specialIndex].group;
      const scale = special.scale.x;
      const specialTop = height / 2 - special.position.y - 70 * scale;
      specialButton.hidden = !special.visible || specialTop < 0 || specialTop + 145 * scale > height;
      specialButton.style.left = `${width / 2 + special.position.x - 42 * scale}px`;
      specialButton.style.top = `${height / 2 - special.position.y - 70 * scale}px`;
      specialButton.style.width = `${84 * scale}px`;
      specialButton.style.height = `${145 * scale}px`;
      if (!remaining) return dispose();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
  } catch (error) {
    dispose();
    console.warn('The heart parachuters could not start.', error);
  }
});
