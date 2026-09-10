import { createScenery } from './scenery.js';

export function startJourney(THREE, source, returnFocus) {
  if (document.querySelector('.journey-flight')) return;
  const stage = document.createElement('div');
  stage.className = 'journey-flight';
  stage.setAttribute('aria-hidden', 'true');
  const origin = document.querySelector('.special-parachuter')?.getBoundingClientRect();
  const originalScroll = { x: scrollX, y: scrollY };
  const main = document.querySelector('.invitation');
  const mainRect = main.getBoundingClientRect();
  const originalMainStyle = main.getAttribute('style');
  const viewport = () => ({
    width: window.visualViewport?.width || document.documentElement.clientWidth,
    height: window.visualViewport?.height || innerHeight,
  });
  const initialViewport = viewport();
  const scroller = document.createElement('div');
  scroller.className = 'journey-scroll';
  const track = document.createElement('div');
  track.className = 'journey-track';
  main.before(scroller);
  scroller.append(track);
  track.append(main);

  const originalScrollBehavior = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = 'auto';
  // Keep the invitation exactly where it was while the actual document grows right.
  main.style.width = `${mainRect.width}px`;
  main.style.marginLeft = `${mainRect.left + scrollX}px`;
  main.style.marginRight = '0';
  document.body.append(stage);
  document.body.classList.add('journey-active');
  const originalViewportWidth = initialViewport.width;
  let viewWidth = initialViewport.width, viewHeight = initialViewport.height;
  let scale = Math.min(320, viewHeight * .4) / 700;
  let worldStart = viewWidth / scale + 600;
  const startX = (origin ? origin.x + origin.width / 2 : viewWidth * .35) / scale;
  const startY = (viewHeight - (origin ? origin.y + 70 * source.scale.x : viewHeight * .4)) / scale - 350;
  const startScale = source.scale.x / scale;
  track.style.width = `${viewWidth + 7200 * scale}px`;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = new THREE.Scene();

  const traveler = source.clone(true);
  traveler.traverse(object => {
    if (object.geometry) object.geometry = object.geometry.clone();
    if (object.material) object.material = object.material.clone();
  });
  scene.add(traveler);
  let renderer, resize, frame, previous;
  let elapsed = 0, closed = false;

  function dispose() {
    if (closed) return;
    closed = true;
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', resize);
    window.visualViewport?.removeEventListener('resize', resize);
    window.visualViewport?.removeEventListener('scroll', resize);
    window.removeEventListener('keydown', escape);
    const geometries = new Set(), materials = new Set();
    scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) materials.add(object.material);
    });
    geometries.forEach(item => item.dispose());
    materials.forEach(item => item.dispose());

    renderer?.dispose();
    renderer?.forceContextLoss();
    stage.remove();
    document.body.classList.remove('journey-active');
    scroller.before(main);
    scroller.remove();
    if (originalMainStyle === null) main.removeAttribute('style');
    else main.setAttribute('style', originalMainStyle);
    window.scrollTo(originalScroll.x, originalScroll.y);
    document.documentElement.style.scrollBehavior = originalScrollBehavior;
    returnFocus.focus({ preventScroll: true });
  }
  const escape = event => { if (event.key === 'Escape') dispose(); };
  window.addEventListener('keydown', escape);
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    stage.append(renderer.domElement);
    const camera = new THREE.OrthographicCamera(-600, 600, 350, -350, .1, 2000);
    camera.position.z = 1000;
    renderer.localClippingEnabled = true;
    const scenery = createScenery(THREE, reduced);
    scenery.root.position.x = worldStart;
    scene.add(scenery.root);
    traveler.visible = true;
    traveler.scale.setScalar(1.1);
    traveler.rotation.set(0, 0, 0);
    resize = () => {
      ({width: viewWidth, height: viewHeight} = viewport());
      stage.style.width = `${viewWidth}px`;
      stage.style.height = `${viewHeight}px`;
      stage.style.left = `${window.visualViewport?.offsetLeft || 0}px`;
      stage.style.top = `${window.visualViewport?.offsetTop || 0}px`;
      const previousStart = worldStart;
      scale = Math.min(320, viewHeight * .4) / 700;
      worldStart = originalViewportWidth / scale + 600;
      scene.children.filter(item => item !== traveler).forEach(item => { item.position.x += worldStart - previousStart; });
      track.style.width = `${(worldStart + 6600) * scale}px`;
      camera.left = -viewWidth / scale / 2; camera.right = viewWidth / scale / 2;
      camera.top = viewHeight / scale - 350; camera.bottom = -350;
      camera.updateProjectionMatrix();
      renderer.setSize(viewWidth, viewHeight, false);
    };
    window.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('scroll', resize);
    resize();
    const body = traveler.children[1];
    const arms = [2, 3, 6, 7].map(i => ({ mesh: body.children[i], position: body.children[i].position.clone(), quaternion: body.children[i].quaternion.clone(), length: body.children[i].scale.y }));
    const armEnds = [[0,-10,-9,-17],[-9,-17,-12,-24],[0,-10,10,-15],[10,-15,20,-10]];
    const smooth = value => value * value * (3 - 2 * value);
    function animate(now) {
      const dt = previous === undefined ? 0 : Math.min((now - previous) / 1000, .1);
      previous = now;
      if (!document.hidden) elapsed += dt;
      const travel = Math.min(1, Math.max(0, elapsed / 36));
      const landing = smooth(Math.min(1, Math.max(0, (elapsed - 36) / 4)));
      const walk = smooth(Math.min(1, Math.max(0, (elapsed - 40) / 3)));
      const flightEnd = worldStart + 6000 - 290;
      const flightX = startX + (flightEnd - startX) * smooth(travel);
      const x = flightX + walk * 440;
      const entry = smooth(Math.min(1, elapsed / 3));
      const standingY = scenery.ground + 70 * 1.6 - 5;
      traveler.position.set(x, startY + (360 - startY) * entry - landing * (360 - standingY) + (reduced ? 0 : Math.sin(elapsed * 1.7) * 8 * entry * (1 - landing)), 30);
      // Keep horizontal travel inside the page so mobile layout viewports never expand.
      let targetScroll = Math.max(0, x * scale - viewWidth * .35);
      if (reduced) targetScroll = Math.floor(targetScroll / viewWidth) * viewWidth;
      const returnProgress = smooth(Math.min(1, Math.max(0, (elapsed - 45) / 3)));
      targetScroll *= 1 - returnProgress;
      scroller.scrollLeft = targetScroll;
      camera.position.x = (scroller.scrollLeft + viewWidth / 2) / scale;
      scenery.update(elapsed, traveler.position.x - worldStart);
      traveler.rotation.z = reduced ? 0 : (.08 + Math.sin(elapsed * 1.4) * .06) * (1 - landing);
      traveler.scale.setScalar(startScale + (1.1 - startScale) * entry + landing * .5);
      traveler.children[0].scale.setScalar(Math.max(.001, 1 - Math.max(0, (landing - .8) / .2)));
      [4,5,8,9].forEach(i => { body.children[i].visible = landing < .94; });
      body.children.filter(object => object.isGroup).forEach((leg, i) => {
        leg.rotation.z = reduced ? 0 : Math.sin(elapsed * 3 + i * Math.PI) * .18 * (1 - landing + (walk > 0 && walk < 1 ? .7 : 0));
      });
      const lowerArms = Math.max(0, (landing - .8) / .2);
      arms.forEach((arm, i) => {
        const [ax,ay,bx,by] = armEnds[i];
        const a = new THREE.Vector3(ax,ay,0), b = new THREE.Vector3(bx,by,0), delta = b.clone().sub(a);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());
        arm.mesh.position.copy(arm.position).lerp(a.add(b).multiplyScalar(.5), lowerArms);
        arm.mesh.quaternion.copy(arm.quaternion).slerp(q, lowerArms);
        arm.mesh.scale.y = arm.length + (delta.length() - arm.length) * lowerArms;
      });
      // Hold the reunion, pan home, and restore the invitation's original width.
      if (elapsed >= 48) { dispose(); return; }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
  } catch (error) {
    dispose();
    console.warn('The journey could not start.', error);
  }
}
