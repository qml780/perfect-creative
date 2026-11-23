import {
  ACESFilmicToneMapping, BoxGeometry, CanvasTexture, Color, CylinderGeometry, DirectionalLight,
  EdgesGeometry, ExtrudeGeometry, Group, HemisphereLight, LineBasicMaterial,
  LineSegments, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Path,
  MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, PMREMGenerator, Scene, Shape,
  Vector3, WebGLRenderer
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

function roundedShape(width, height, radius = .012) {
  const shape = new Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function panelGeometry(shape, thickness = .012) {
  return new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .0015, bevelThickness: .0015, curveSegments: 12 });
}

function createLectern() {
  const model = new Group();
  const material = new MeshPhysicalMaterial({ color: 0xeef7ff, roughness: .06, transmission: .2, transparent:true, opacity:.38, depthWrite:false, thickness: .014, ior: 1.49, metalness: 0, clearcoat: 1, envMapIntensity: .9 });
  const edges = new LineBasicMaterial({ color: 0x7f96a9, transparent: true, opacity: .52 });
  const steel = new MeshStandardMaterial({ color: 0xaeb8c4, metalness: 1, roughness: .25 });
  const parts = [];

  function part(geometry, position, rotation, offset) {
    const group = new Group();
    const mesh = new Mesh(geometry, material);
    mesh.rotation.set(...rotation);
    mesh.add(new LineSegments(new EdgesGeometry(geometry, 35), edges));
    group.add(mesh);
    group.position.set(...position);
    model.add(group);
    parts.push({ group, origin: group.position.clone(), offset: new Vector3(...offset) });
    return group;
  }

  part(panelGeometry(roundedShape(.45, .35)), [0,.035,0], [-Math.PI/2,0,0], [0,-.05,0]);
  const front = new Shape();
  front.moveTo(-.125,0);
  front.lineTo(.125,0);
  front.lineTo(.18,.965);
  front.lineTo(-.18,.965);
  front.closePath();
  const face = part(panelGeometry(front), [0,.055,.105], [0,0,0], [0,0,.29]);
  const side = new Shape();
  side.moveTo(-.12,0);
  side.lineTo(.115,0);
  side.lineTo(.16,.965);
  side.lineTo(-.16,1.025);
  side.closePath();
  for (const [bottom, height] of [[.12,.08],[.31,.085],[.5,.1],[.72,.145]]) {
    const hole = new Path();
    hole.moveTo(-.07,bottom);
    hole.lineTo(-.07,bottom+height);
    hole.lineTo(-.035,bottom+height);
    hole.lineTo(-.035,bottom);
    hole.closePath();
    side.holes.push(hole);
  }
  const left = part(panelGeometry(side), [-.13,.055,0], [0,-Math.PI/2,0], [-.28,0,0]);
  const right = part(panelGeometry(side), [.142,.055,0], [0,-Math.PI/2,0], [.28,0,0]);
  const shelf = part(panelGeometry(roundedShape(.255,.245,.006)), [0,.625,-.02], [-Math.PI/2,0,0], [0,.2,-.23]);
  const top = part(panelGeometry(roundedShape(.6,.42,.018)), [0,1.05,0], [-Math.PI/2+.14,0,0], [0,.4,0]);
  const lip = new Mesh(new BoxGeometry(.55,.018,.012), material);
  lip.position.set(0,-.195,.012);
  top.children[0].add(lip);
  lip.add(new LineSegments(new EdgesGeometry(lip.geometry),edges));
  const boltGeometry = new CylinderGeometry(.0065,.0065,.018,16);
  function bolt(parent, x, y, z, axis = 'z') {
    const mesh = new Mesh(boltGeometry, steel);
    mesh.position.set(x,y,z);
    mesh.rotation[axis === 'z' ? 'x' : 'z'] = Math.PI/2;
    parent.add(mesh);
  }
  for (const x of [-.107,.107]) for (const y of [.075,.9]) bolt(face,x,y,.019);
  for (const group of [left,right]) for (const y of [.065,.89]) bolt(group,0,y,.065,'x');
  for (const x of [-.11,.11]) bolt(shelf,x,0,.05);
  const footMaterial = new MeshStandardMaterial({ color:0x717b88,roughness:.7 });
  for (const x of [-.18,.18]) for (const z of [-.12,.12]) {
    const foot = new Mesh(new CylinderGeometry(.013,.013,.012,20),footMaterial);
    foot.position.set(x,.025,z);
    model.add(foot);
  }
  return { model, material, edges, parts };
}

export async function mountViewer(root) {
  const host = root.querySelector('[data-viewer-canvas]');
  const poster = root.querySelector('[data-viewer-poster]');
  const status = root.querySelector('[data-viewer-status]');
  const renderer = new WebGLRenderer({ alpha:false, antialias:true, powerPreference:'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const scene = new Scene();
  scene.background = new Color(0x353f50);
  const camera = new PerspectiveCamera(34,1,.01,20);
  camera.position.set(1.45,1.25,2);
  const controls = new OrbitControls(camera,renderer.domElement);
  controls.target.set(0,.59,0);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.minDistance = 1.15;
  controls.maxDistance = 4.2;
  controls.minPolarAngle = .18;
  controls.maxPolarAngle = Math.PI/2-.025;
  const environment = new RoomEnvironment();
  const generator = new PMREMGenerator(renderer);
  const envTarget = generator.fromScene(environment,.04);
  scene.environment = envTarget.texture;
  environment.dispose();
  generator.dispose();
  scene.add(new HemisphereLight(0xffffff,0x7b8ca3,2.2));
  const key = new DirectionalLight(0xffffff,3.2);
  key.position.set(2,4,3);
  scene.add(key);
  const lectern = createLectern();
  scene.add(lectern.model);
  const shadowCanvas=document.createElement('canvas');
  shadowCanvas.width=shadowCanvas.height=128;
  const context=shadowCanvas.getContext('2d');
  const gradient=context.createRadialGradient(64,64,10,64,64,63);
  gradient.addColorStop(0,'rgba(24,34,50,.25)');
  gradient.addColorStop(1,'rgba(24,34,50,0)');
  context.fillStyle=gradient;
  context.fillRect(0,0,128,128);
  const shadowTexture=new CanvasTexture(shadowCanvas);
  const shadow=new Mesh(new PlaneGeometry(.85,.65),new MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;
  shadow.position.y=-.052;
  scene.add(shadow);

  let frame = 0;
  let visible = true;
  let active = true;
  let cameraGoal = null;
  let explode = 0;
  let explodeGoal = 0;
  let lastTime = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const initialPosition = camera.position.clone();
  const initialTarget = controls.target.clone();
  const range = root.querySelector('[data-viewer-explode]');

  function requestRender() {
    if (!frame && active && visible && !document.hidden) frame = requestAnimationFrame(render);
  }
  function render(time) {
    frame = 0;
    const amount = 1-Math.exp(-Math.min((time-lastTime)/1000,.05)*12);
    lastTime = time;
    if (cameraGoal) {
      camera.position.lerp(cameraGoal.position,amount);
      controls.target.lerp(cameraGoal.target,amount);
      if (camera.position.distanceTo(cameraGoal.position)<.001 && controls.target.distanceTo(cameraGoal.target)<.001) cameraGoal=null;
    }
    explode = reduced.matches ? explodeGoal : explode+(explodeGoal-explode)*amount;
    if (Math.abs(explode-explodeGoal)<.001) explode=explodeGoal;
    for (const part of lectern.parts) part.group.position.copy(part.origin).addScaledVector(part.offset,explode);
    const moved = controls.update();
    renderer.render(scene,camera);
    root.dataset.camera = camera.position.toArray().map(value=>value.toFixed(3)).join(',');
    root.dataset.exploded = explode.toFixed(3);
    if (moved || cameraGoal || explode!==explodeGoal) requestRender();
  }
  function moveCamera(position,target = initialTarget) {
    if (reduced.matches) { camera.position.copy(position); controls.target.copy(target); cameraGoal=null; }
    else cameraGoal={position:position.clone(),target:target.clone()};
    lastTime=performance.now();
    requestRender();
  }
  function changeFinish(finish) {
    const properties = {
      clear: {color:0xeef7ff,transmission:.2,transparent:true,opacity:.38,depthWrite:false,roughness:.06,thickness:.014},
      frosted: {color:0xf4f7fa,transmission:.1,transparent:true,opacity:.72,depthWrite:false,roughness:.46,thickness:.025},
      white: {color:0xf5f5f4,transmission:0,transparent:false,opacity:1,depthWrite:true,roughness:.24,thickness:.012},
      black: {color:0x101317,transmission:0,transparent:false,opacity:1,depthWrite:true,roughness:.18,thickness:.012}
    }[finish];
    if (!properties) return;
    const {color,...surface}=properties;
    lectern.material.color.setHex(color);
    Object.assign(lectern.material,surface);
    lectern.material.needsUpdate=true;
    lectern.edges.color.setHex(finish==='black'?0x8795a6:0xadc1d1);
    lectern.edges.opacity=finish==='white'?.25:.6;
    root.dataset.finish=finish;
    root.querySelectorAll('[data-viewer-finish]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.viewerFinish===finish)));
    requestRender();
  }
  controls.addEventListener('change',requestRender);
  controls.addEventListener('start',()=>{cameraGoal=null;});
  host.addEventListener('keydown',event=>{
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(event.key)) return;
    event.preventDefault();
    cameraGoal=null;
    const offset=camera.position.clone().sub(controls.target);
    if (['+','-','='].includes(event.key)) {
      offset.setLength(Math.max(controls.minDistance,Math.min(controls.maxDistance,offset.length()*(event.key==='-'?1.15:.87))));
    } else {
      const yaw=(event.key==='ArrowLeft'?.15:event.key==='ArrowRight'?-.15:0);
      offset.applyAxisAngle(new Vector3(0,1,0),yaw);
      if (event.key==='ArrowUp'||event.key==='ArrowDown') offset.y+=event.key==='ArrowUp'?.12:-.12;
    }
    moveCamera(controls.target.clone().add(offset),controls.target);
  });
  // Preserve page scrolling with the wheel and single-finger vertical gestures.
  renderer.domElement.style.touchAction='pan-y';
  renderer.domElement.addEventListener('wheel',event=>event.stopImmediatePropagation(),{passive:true,capture:true});
  root.querySelectorAll('[data-viewer-finish]').forEach(button=>button.addEventListener('click',()=>changeFinish(button.dataset.viewerFinish)));
  range.addEventListener('input',()=>{
    explodeGoal=Number(range.value)/100;
    lastTime=performance.now();
    if (explodeGoal>.1 && camera.position.distanceTo(controls.target)<2.7) moveCamera(initialPosition.clone().multiplyScalar(1.35),new Vector3(0,.74,0));
    requestRender();
  });
  root.querySelectorAll('[data-viewer-zoom]').forEach(button=>button.addEventListener('click',()=>{
    const offset=camera.position.clone().sub(controls.target);
    offset.setLength(Math.max(controls.minDistance,Math.min(controls.maxDistance,offset.length()*(button.dataset.viewerZoom==='in'?.82:1.22))));
    moveCamera(controls.target.clone().add(offset),controls.target);
  }));
  root.querySelectorAll('[data-viewer-view]').forEach(button=>button.addEventListener('click',()=>{
    const view = {
      front:[new Vector3(0,.85,2.65),initialTarget],
      back:[new Vector3(0,1.05,-2.65),initialTarget],
      top:[new Vector3(.9,1.85,1.45),new Vector3(0,.85,0)]
    }[button.dataset.viewerView];
    moveCamera(...view);
  }));
  root.querySelector('[data-viewer-reset]').addEventListener('click',()=>{
    explodeGoal=0;
    range.value='0';
    moveCamera(initialPosition,initialTarget);
  });
  const resize = new ResizeObserver(()=>{
    if (!active) return;
    const {width,height}=host.getBoundingClientRect();
    if (!width||!height) return;
    renderer.setSize(width,height);
    camera.aspect=width/height;
    camera.updateProjectionMatrix();
    requestRender();
  });
  resize.observe(host);
  const viewport = new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;
    requestRender();
  });
  viewport.observe(root);
  const visibility = ()=>requestRender();
  document.addEventListener('visibilitychange',visibility);
  renderer.domElement.addEventListener('webglcontextlost',event=>{
    event.preventDefault();
    active=false;
    poster.hidden=false;
    root.dataset.viewerState='unavailable';
    status.textContent=root.dataset.lang==='zh'?'3D 显示已暂停，请刷新页面重试。':'3D rendering stopped. Refresh the page to try again.';
    root.querySelectorAll('.viewer-settings button, .viewer-tools button, .viewer-settings input').forEach(control=>control.disabled=true);
  });
  host.replaceChildren(renderer.domElement);
  host.style.touchAction='pan-y';
  changeFinish(root.dataset.finish||'clear');
  const {width,height}=host.getBoundingClientRect();
  renderer.setSize(width,height);
  camera.aspect=width/height;
  camera.updateProjectionMatrix();
  controls.update();
  renderer.render(scene,camera);
  poster.hidden=true;
  root.dataset.viewerState='ready';
  root.querySelectorAll('.viewer-settings button, .viewer-tools button, .viewer-settings input').forEach(control=>control.disabled=false);
  const dispose=()=>{
    active=false;
    cancelAnimationFrame(frame);
    resize.disconnect();
    viewport.disconnect();
    controls.dispose();
    document.removeEventListener('visibilitychange',visibility);
    scene.traverse(object=>{
      object.geometry?.dispose();
      if (object.material?.dispose) object.material.dispose();
    });
    envTarget.dispose();
    shadowTexture.dispose();
    renderer.dispose();
  };
  addEventListener('pagehide',event=>{if(!event.persisted) dispose();});
  requestRender();
}
