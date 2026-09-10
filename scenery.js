// Native Three.js geometry throughout; all positions share the same ground datum.
export function createScenery(THREE, reduced) {
  const root = new THREE.Group();
  const ground = -250;
  const ink = '#655469';
  const animated = [];
  const material = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, side: THREE.DoubleSide });
  function polygon(parent, points, color, z = 0) {
    const shape = new THREE.Shape();
    points.forEach(([x,y],i) => i ? shape.lineTo(x,y) : shape.moveTo(x,y));
    shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material(color));
    mesh.position.z = z; parent.add(mesh); return mesh;
  }
  function rect(parent, x, y, w, h, color, z = 0) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w,h), material(color));
    mesh.position.set(x+w/2,y+h/2,z);parent.add(mesh);return mesh;
  }
  function ellipse(parent,x,y,rx,ry,color,z=1) {
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(1,32),material(color));
    mesh.scale.set(rx,ry,1);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  function stroke(parent,points,color=ink,width=2,z=2) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x,y])=>new THREE.Vector3(x,y,z)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(2,points.length*8),width/2,5,false),material(color));
    parent.add(mesh);return mesh;
  }
  function group(x,y=ground,z=0) {const g=new THREE.Group();g.position.set(x,y,z);root.add(g);return g;}
  const wave = (x,t) => ground + Math.sin(x*.018-t*1.8)*5 + Math.sin(x*.043-t*2.7)*2;
  // Subdivided water: its actual surface vertices and foam move every frame.
  const waterGeometry = new THREE.PlaneGeometry(2550,100,240,1);
  const water = new THREE.Mesh(waterGeometry,material('#a8cfd8'));
  water.position.set(675,ground-50,-15);root.add(water);
  const waterPositions=waterGeometry.attributes.position;
  const foamGeometry=new THREE.BufferGeometry();
  const foamPositions=new Float32Array(241*3);
  foamGeometry.setAttribute('position',new THREE.BufferAttribute(foamPositions,3));
  const foam=new THREE.Line(foamGeometry,new THREE.LineBasicMaterial({color:'#e3f0ed',transparent:true,opacity:.8}));
  foam.position.z=-13;root.add(foam);
  const ripples=[];
  for(let i=0;i<34;i++) {
    const x=-570+(i*137)%2480,y=ground-20-(i%3)*23;
    const mesh=stroke(root,[[x,y],[x+20,y+2],[x+48,y]],'#d8e8e7',1.7,-12);
    ripples.push({mesh,x,phase:i*.73});
  }
  // A sloping beach meets the water, then a continuous green/sand/green ground strip.
  const grass=new THREE.Color('#bfd0ad'),sand=new THREE.Color('#ebca99');
  polygon(root,[[1760,-350],[1810,-310],[1870,-275],[1950,ground],[1950,-350]],'#ebca99',-10).name='beach';
  rect(root,1950,-350,4650,100,'#bfd0ad',-10).name='green-ground';
  const desert=rect(root,3020,-350,1080,100,'#ebca99',-9);
  // Narrow gradient strips blend terrain colors instead of cutting between scenes.
  for(const [x,a,b] of [[2880,grass,sand],[3960,sand,grass]]){
    const geo=new THREE.PlaneGeometry(280,100,1,1);const attr=geo.attributes.position;const rgb=[];
    for(let i=0;i<attr.count;i++){const c=a.clone().lerp(b,(attr.getX(i)+140)/280);rgb.push(c.r,c.g,c.b);}
    geo.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3));
    const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true}));mesh.position.set(x+140,-300,-8);root.add(mesh);
  }
  const shoreline=stroke(root,[[1765,-346],[1817,-309],[1877,-274],[1950,-249]],'#f2e4ca',8,-6);
  animated.push(t=>{shoreline.position.x=Math.sin(t*1.5)*4;shoreline.material.opacity=.65+Math.sin(t*1.5)*.2;shoreline.material.transparent=true;});
  const boats=[];
  const ship=group(0,ground,-5);
  polygon(ship,[[-360,65],[360,65],[284,0],[-280,0]],'#7f919d');
  polygon(ship,[[-240,67],[-195,139],[-35,139],[20,67]],'#a2b0b9',1);
  polygon(ship,[[-199,139],[-173,185],[-68,185],[-30,139]],'#bcc6cc',1);
  polygon(ship,[[-169,173],[-76,173],[-61,149],[-181,149]],'#536d7e',2);
  stroke(ship,[[-120,185],[-120,267]],ink,4);stroke(ship,[[-150,228],[-90,228]],ink,3);
  rect(ship,-14,68,56,30,'#92a1ad',2);stroke(ship,[[12,98],[53,116]],ink,5);
  ellipse(ship,180,68,58,6,'#dce3df',2);ellipse(ship,180,69,47,3,'#879ba6',3);
  stroke(ship,[[173,68],[173,72]],'#fff9eb',2,4);stroke(ship,[[185,68],[185,72]],'#fff9eb',2,4);stroke(ship,[[173,70],[185,70]],'#fff9eb',2,4);
  const flag=polygon(ship,[[0,16],[33,10],[33,-3],[0,0]],'#d69ea9',3);
  flag.name='lcs-flag';flag.position.set(-120,248,3);
  const flagRest=flag.geometry.attributes.position.array.slice();
  boats.push({g:ship,x:0,span:600});
  animated.push(t=>{
    const vertices=flag.geometry.attributes.position;
    for(let i=0;i<vertices.count;i++){
      const x=flagRest[i*3],y=flagRest[i*3+1];
      vertices.setY(i,y+Math.sin(t*3-x*.1)*(x/33)*2);
    }
    vertices.needsUpdate=true;
  });
  for(const [x,size,color] of [[850,1.05,'#8a9fa9'],[1170,.7,'#b28891'],[1510,1.25,'#778e9b']]) {
    const boat=group(x,ground,-4);boat.scale.setScalar(size);
    polygon(boat,[[-80,23],[86,23],[60,0],[-54,0]],color);
    stroke(boat,[[0,23],[0,205]],ink,2.5);
    const sail=polygon(boat,[[-7,198],[-7,38],[-76,38]],'#fff9ee',2);
    polygon(boat,[[7,186],[70,38],[7,38]],'#e9bdc5',2);
    polygon(boat,[[0,205],[27,197],[0,188]],'#c77c95',3);
    animated.push(t=>{sail.scale.x=1+Math.sin(t*2+x)*.035;});
    boats.push({g:boat,x,span:140*size});
  }
  // Washington: every foundation begins at local y=0 (the shared ground level).
  const memorial=group(2090); memorial.name="lincoln-memorial";
  rect(memorial,-126,0,252,10,'#d1c9b8');rect(memorial,-112,10,224,12,'#e8e1d1');rect(memorial,-96,22,192,65,'#dbd6c9');
  rect(memorial,-102,87,204,12,'#f0e9db');polygon(memorial,[[-102,99],[0,120],[102,99]],'#f7f0e0');
  for(let x=-86;x<90;x+=24)rect(memorial,x,23,10,60,'#fbf5e7',1);
  const monument=group(2390); monument.name="washington-monument";polygon(monument,[[-17,0],[-12,200],[0,230],[12,200],[17,0]],'#f5f0e3');polygon(monument,[[0,0],[0,230],[12,200],[17,0]],'#dad5c9',1);
  const capitol=group(2700); capitol.name="capitol";rect(capitol,-114,0,228,61,'#e8e4da');rect(capitol,-43,0,86,100,'#f5f0e4',1);
  ellipse(capitol,0,99,42,37,'#f5f0e4',1);rect(capitol,-44,91,88,12,'#d5d3c9',2);rect(capitol,-9,130,18,14,'#ede8df');stroke(capitol,[[0,144],[0,163]],'#aaa99e',3);
  for(let x=-103;x<110;x+=20)rect(capitol,x,15,7,26,'#a1afb3',3);
  // Walkers use articulated legs and arms, with feet on the Mall's ground.
  const walkers=[];
  for(let i=0;i<9;i++) {
    const person=group(1990+i*96,ground,9);
    ellipse(person,0,30,3.5,3.5,ink,1);
    stroke(person,[[0,26],[0,13]],i%2?'#a67991':'#728799',3);
    const limbs=[];
    for(const side of [-1,1]) {
      const leg=new THREE.Group();leg.position.y=13;person.add(leg);
      stroke(leg,[[0,0],[side*3,-7],[side*4,-13]],ink,1.5);limbs.push(leg);
      const arm=new THREE.Group();arm.position.y=24;person.add(arm);
      stroke(arm,[[0,0],[side*4,-5],[side*5,-10]],ink,1.3);limbs.push(arm);
    }
    walkers.push({person,limbs,offset:i*96,direction:i%2?1:-1});
  }
  // A continuous, deforming tube follows the head's path with a delayed tail.
  const worm=group(0,0,-5);worm.name='sandworm';worm.visible=false;
  const segments=80,sides=18;
  const wormGeometry=new THREE.BufferGeometry();
  const bodyPositions=new Float32Array((segments+1)*(sides+1)*3);
  const bodyColors=new Float32Array(bodyPositions.length);
  const indices=[];
  for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){
    const a=i*(sides+1)+j,b=a+sides+1;
    indices.push(a,b,a+1,b,b+1,a+1);
  }
  wormGeometry.setIndex(indices);
  wormGeometry.setAttribute('position',new THREE.BufferAttribute(bodyPositions,3).setUsage(THREE.DynamicDrawUsage));
  wormGeometry.setAttribute('color',new THREE.BufferAttribute(bodyColors,3));
  const bodyColor=new THREE.Color();
  for(let i=0;i<=segments;i++)for(let j=0;j<=sides;j++){
    const angle=j/sides*Math.PI*2;
    const ridge=i%4===0;
    bodyColor.set(ridge?'#886044':'#bf9265');
    bodyColor.multiplyScalar(.8+Math.sin(angle)*.15+Math.cos(angle)*.08);
    const offset=(i*(sides+1)+j)*3;
    bodyColors.set([bodyColor.r,bodyColor.g,bodyColor.b],offset);
  }
  const wormBody=new THREE.Mesh(wormGeometry,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}));
  wormBody.name='worm-body';wormBody.frustumCulled=false;worm.add(wormBody);
  const mouth=new THREE.Group();mouth.name='worm-mouth';worm.add(mouth);
  ellipse(mouth,0,0,56,60,'#c6a075',40);
  ellipse(mouth,0,0,46,50,'#634735',41);
  const throat=ellipse(mouth,0,0,29,34,'#30271f',42);
  for(let i=0;i<32;i++){
    const a=i/32*Math.PI*2;
    polygon(mouth,[[44*Math.cos(a),48*Math.sin(a)],[28*Math.cos(a+.035),30*Math.sin(a+.035)],[44*Math.cos(a+.1),48*Math.sin(a+.1)]],'#e9d2a8',43);
  }
  for(let i=0;i<22;i++){
    const a=i/22*Math.PI*2;
    polygon(mouth,[[29*Math.cos(a),33*Math.sin(a)],[21*Math.cos(a+.04),23*Math.sin(a+.04)],[29*Math.cos(a+.1),33*Math.sin(a+.1)]],'#b49a74',44);
  }
  // Head and tail pass through the same surface, without a foreground image mask.
  const sandPlane=new THREE.Plane(new THREE.Vector3(0,1,0),250);
  worm.traverse(o=>{if(o.material)o.material.clippingPlanes=[sandPlane];});
  function wormPath(p) {
    // A ballistic arch: fast emergence, a heavy crest, then a head-first dive.
    const y=p<0?ground-70+p*1068:p>1?ground-70-(p-1)*1068:ground-70+340*Math.sin(Math.PI*p);
    const dy=p<0?1068:p>1?-1068:340*Math.PI*Math.cos(Math.PI*p);
    return {x:3430+p*650,y,dx:650,dy};
  }
  const dust=[];
  for(let i=0;i<90;i++){
    const grain=ellipse(root,0,ground,1.5+(i%4)*.6,1.2+(i%3)*.4,i%2?'#c5a06e':'#dbc094',8);
    grain.name='sand-grain';grain.visible=false;grain.material.transparent=true;
    dust.push({grain,event:i<45?0:1,index:i%45});
  }
  const plumes=[];
  for(let i=0;i<12;i++){
    const puff=ellipse(root,0,ground+5,12,7,'#ddbc89',7);puff.material.transparent=true;puff.visible=false;
    plumes.push({puff,event:i<6?0:1,index:i%6});
  }
  // Small flocks glide through the world, with occasional asynchronous wingbeats.
  const flocks=[];
  for(const [flockIndex,baseX,baseY,direction] of [[0,100,440,1],[1,2100,530,-1],[2,4000,470,1],[3,5850,510,-1]]){
    const flock=group(baseX,baseY,-2);flock.name='bird-flock';
    const birds=[];
    for(let i=0;i<7;i++){
      const bird=new THREE.Group();bird.name='bird';
      const rank=Math.ceil(i/2),side=i%2?1:-1;
      bird.position.set(-rank*30*direction,rank*13*side,0);flock.add(bird);
      const body=ellipse(bird,0,0,4,1.7,'#77727f',1);
      const wings=[];
      for(const sign of [-1,1]){
        const wing=new THREE.Group();wing.position.x=sign;bird.add(wing);
        polygon(wing,[[0,0],[sign*7,4],[sign*16,1],[sign*9,0]],'#77727f',1);wings.push(wing);
      }
      bird.scale.setScalar(.65+(i%3)*.12);
      birds.push({bird,wings,baseY:bird.position.y,phase:i*.8+flockIndex});
    }
    flocks.push({flock,birds,baseX,baseY,direction});
  }
  // Manhattan buildings sit on y=0, with lively but restrained window glints.
  const heights=[90,150,117,207,135,165,248,143,194,128,280,157,217,110,179,140];
  const windows=[];
  heights.forEach((h,i)=>{const building=group(4280+i*66);building.name=`manhattan-building-${i}`;rect(building,0,0,52,h,i%2?'#8e94a8':'#a5a3b1');rect(building,43,0,9,h,'#858b9d',1);
    for(let y=12;y<h-8;y+=20)for(let x=8;x<46;x+=14)windows.push(rect(building,x,y,5,9,'#e8d7bb',2));
    if(i===6){rect(building,9,h,34,25,'#8d8c9f');rect(building,19,h+25,14,24,'#8d8c9f');stroke(building,[[26,h+49],[26,h+82]],'#79768a',3);}
    if(i===10){polygon(building,[[0,h],[26,h+38],[52,h]],'#b1bdc6',2);stroke(building,[[26,h+38],[26,h+89]],'#8995a8',2);}
  });
  // The bridge's piers, too, meet the ground rather than dangling above it.
  for(const x of [4460,5150]) {rect(root,x,ground,17,120,'#b5a494',5);rect(root,x+35,ground,17,120,'#b5a494',5);rect(root,x,ground+114,52,15,'#b5a494',5);}
  rect(root,4360,ground+30,1000,9,'#817985',6);
  const cable=[];for(let i=0;i<=30;i++){const x=4486+i*690/30;const y=ground+120-Math.sin(i/30*Math.PI)*75;cable.push([x,y]);if(i%2===0)stroke(root,[[x,y],[x,ground+39]],'#8d8490',1,6);}stroke(root,cable,'#807b89',2,6);
  // Four rooted posts and a genuinely deforming fabric canopy.
  const wedding=group(6000);
  for(const [x,h] of [[90,231],[267,231],[117,255],[293,255]]){const post=rect(wedding,x-2.5,0,5,h,'#a18b79',2);post.name='chuppah-post';}
  polygon(wedding,[[77,231],[108,255],[307,255],[282,231]],'#fff8ed',3);
  const clothGeo=new THREE.PlaneGeometry(205,17,30,3);
  const cloth=new THREE.Mesh(clothGeo,material('#fff8ed'));cloth.position.set(179.5,223,4);wedding.add(cloth);
  const clothOriginal=clothGeo.attributes.position.array.slice();
  const flowers=[];for(let i=0;i<18;i++)flowers.push(ellipse(wedding,88+i*11,231,6,5,i%3?'#e4b2bd':'#a7b792',5));
  // Bride: fitted white bodice, pink sash, flared skirt and a softly moving veil.
  const bride=new THREE.Group();bride.position.set(211,0,8);wedding.add(bride);
  const veil=polygon(bride,[[-10,99],[11,99],[23,49],[-24,49]],'#e5eef7',-1);veil.material.transparent=true;veil.material.opacity=.65;
  ellipse(bride,0,93,8,8,ink);ellipse(bride,-8,102,5,5,ink);stroke(bride,[[-11,100],[-5,103]],'#db6795',2);
  stroke(bride,[[0,85],[0,79]],ink,2.5);stroke(bride,[[-9,75],[-20,61],[-29,68]],ink,2.5);stroke(bride,[[9,75],[19,62],[29,67]],ink,2.5);
  polygon(bride,[[-10,79],[-4,82],[0,78],[4,82],[11,78],[9,68],[11,56],[25,2],[0,0],[-25,2],[-9,56],[-11,68]],'#afc9ef',2);
  polygon(bride,[[-8,78],[-4,80],[0,76],[4,80],[9,77],[7,68],[9,56],[23,3],[0,2],[-23,3],[-7,56],[-9,68]],'#fffdf8',3);
  stroke(bride,[[-10,57],[0,55],[10,57]],'#df5f92',3.5,4);
  for(const x of [-7,1,8])stroke(bride,[[x,49],[x*2.5,6]],'#d3e2f5',1.2,4);
  for(let i=0;i<6;i++)ellipse(bride,-29+Math.cos(i)*6,72+Math.sin(i)*5,4,4,i%2?'#e5a9bc':'#c985a0',5);
  const grasses=[];
  for(let i=0;i<70;i++){
    const x=5480+(i*137)%1080;const blade=stroke(root,[[0,0],[2,9]],'#91aa84',1.4,45);blade.position.set(x,ground,0);blade.name='field-grass';grasses.push(blade);
    if(i%3===0)ellipse(root,x+2,ground+11,2,2,'#dba1b3',46);
  }
  let breachStart=null;
  return { root, ground, boats, waterGeometry, clothGeo,
    update(time, travelerX) {
      const t=reduced?0:time;
      for(let i=0;i<waterPositions.count;i++){
        const x=waterPositions.getX(i)+675;
        if(i<241)waterPositions.setY(i,wave(x,t)-(ground-50));
      }
      waterPositions.needsUpdate=true;
      for(let i=0;i<=240;i++){const x=-600+i/240*2550;foamPositions[i*3]=x;foamPositions[i*3+1]=wave(x,t)+1;foamPositions[i*3+2]=0;}
      foamGeometry.attributes.position.needsUpdate=true;
      for(const {g,x,span} of boats){g.position.y=wave(x,t)-3;g.rotation.z=Math.atan2(wave(x+span/2,t)-wave(x-span/2,t),span)*1.5;}
      ripples.forEach(({mesh,phase})=>{mesh.position.x=Math.sin(t*1.5+phase)*12;mesh.position.y=Math.sin(t*2+phase)*2;});
      animated.forEach(fn=>fn(t));
      walkers.forEach(({person,limbs,offset,direction},i)=>{
        person.position.x=1990+((offset+t*12*direction)%880+880)%880;
        limbs.forEach((limb,j)=>{limb.rotation.z=Math.sin(t*4+i+(j<2?0:Math.PI))*(j%2?.3:.18);});
      });
      const cp=clothGeo.attributes.position;
      for(let i=0;i<cp.count;i++){const x=clothOriginal[i*3],y=clothOriginal[i*3+1];const edge=1-Math.pow(x/102.5,2);cp.setY(i,y-Math.cos(x/102.5*Math.PI/2)*7+Math.sin(x*.04+t*2)*edge*2.5);}
      cp.needsUpdate=true;
      veil.rotation.z=Math.sin(t*1.5)*.035;veil.scale.x=1+Math.sin(t*1.5)*.03;
      flowers.forEach((flower,i)=>{flower.position.y=231+Math.sin(t*2+i*.4)*.7;});
      grasses.forEach((blade,i)=>{blade.rotation.z=Math.sin(t*1.6+i)*.08;});
      windows.forEach((window,i)=>{if(i%13===0){window.material.color.set(i%2?'#e8d7bb':'#f5e7c8');window.material.opacity=.75+Math.sin(t*.8+i)*.2;window.material.transparent=true;}});
      for(const {flock,birds,baseX,baseY,direction} of flocks){
        flock.position.set(baseX+direction*t*38,baseY+Math.sin(t*.35+baseX)*14,-2);
        for(const {bird,wings,baseY,phase} of birds){
          // Clear, unhurried wingbeats, staggered across the flock.
          const flap=reduced?0:Math.sin(t*5.2+phase)*.65;
          wings[0].rotation.z=-flap;wings[1].rotation.z=flap;
          bird.position.y=baseY+Math.sin(t*1.3+phase)*4;
          bird.rotation.z=Math.sin(t*.3+phase)*.035;
        }
      }
      if(breachStart===null&&travelerX>3100)breachStart=time;
      const age=breachStart===null?-1:time-breachStart;
      const phase=age/6.4*1.5;
      worm.visible=age>=0&&phase<=1.5;
      if(worm.visible){
        const p=reduced?.45:phase;
        const head=wormPath(p);
        mouth.position.set(head.x,head.y,0);
        mouth.rotation.z=Math.atan2(head.dy,head.dx)-Math.PI/2;
        mouth.scale.x=.6+.4*Math.abs(head.dy)/Math.hypot(head.dx,head.dy);
        throat.scale.y=34*(.92+Math.sin(p*Math.PI)*.08);
        for(let i=0;i<=segments;i++){
          const q=i/segments;
          const center=wormPath(p-q*.5);
          const len=Math.hypot(center.dx,center.dy),nx=-center.dy/len,ny=center.dx/len;
          const pulse=1+Math.sin(q*18-t*3)*.025;
          const radius=(52*(1-Math.pow(q,2.5)*.94))*(i%4===0?1.025:1)*pulse;
          for(let j=0;j<=sides;j++){
            const angle=j/sides*Math.PI*2;
            const offset=(i*(sides+1)+j)*3;
            const r=Math.cos(angle)*radius;
            bodyPositions[offset]=center.x+nx*r;
            bodyPositions[offset+1]=center.y+ny*r;
            bodyPositions[offset+2]=Math.sin(angle)*radius*.45;
          }
        }
        wormGeometry.attributes.position.needsUpdate=true;
      }
      for(const {grain,event,index} of dust){
        const trigger=(event===0?.066:.934)*6.4/1.5;
        const particleAge=age-trigger-index*.009;
        const life=1.4+(index%5)*.09;
        grain.visible=!reduced&&age>=0&&particleAge>0&&particleAge<life;
        if(grain.visible){
          const hit=wormPath(event===0?.066:.934);
          const vx=(index-22)*3.6,vy=45+(index*23%110);
          grain.position.set(hit.x+vx*particleAge,ground+vy*particleAge-100*particleAge*particleAge,8);
          grain.visible=grain.position.y>=ground;
          grain.material.opacity=Math.max(0,1-particleAge/life);
        }
      }
      for(const {puff,event,index} of plumes){
        const trigger=(event===0?.066:.934)*6.4/1.5;
        const puffAge=age-trigger-index*.07;
        puff.visible=!reduced&&age>=0&&puffAge>0&&puffAge<2;
        if(puff.visible){const hit=wormPath(event===0?.066:.934);puff.position.set(hit.x+(index-2.5)*puffAge*17,ground+4+Math.sin(Math.min(1,puffAge/2)*Math.PI)*12,7);puff.scale.set(12+puffAge*15,7+puffAge*6,1);puff.material.opacity=(1-puffAge/2)*.24;}
      }

    }
  };
}
