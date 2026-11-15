import * as THREE from 'three';

const $=s=>document.querySelector(s), canvas=$('#scene');
const ui={menu:$('#menu'),hud:$('#hud'),overlay:$('#overlay'),pause:$('#pause'),cams:$('#camera-ui'),toast:$('#toast'),prompt:$('#prompt')};
let renderer,scene,camera,clock3,player,spot,ambientAudio=null,started=false,paused=false,gameOver=false,cameraOpen=false,flashlightOn=false,doorClosed={left:false,right:false},power=100,night=1,elapsed=0,lastToast=0,lastStep=0,currentCam=0,mouseSensitivity=.002,volume=.55;
const NIGHT_LENGTH=360;
const keys={}, colliders=[], animatronics=[], objects=[], camRooms=[
 {name:'CAM 01 — PALCO',room:'PALCO PRINCIPAL · SETOR A',pos:[0,0,-12],xy:[50,17]},
 {name:'CAM 02 — SALÃO',room:'SALÃO PRINCIPAL · SETOR B',pos:[0,0,0],xy:[50,49]},
 {name:'CAM 03 — COZINHA',room:'COZINHA · SETOR C',pos:[-14,0,-4],xy:[20,40]},
 {name:'CAM 04 — DEPÓSITO',room:'DEPÓSITO · SETOR D',pos:[-14,0,5],xy:[20,69]},
 {name:'CAM 05 — CORREDOR LESTE',room:'CORREDOR LESTE · SETOR E',pos:[13,0,0],xy:[79,48]},
 {name:'CAM 06 — BANHEIROS',room:'BANHEIROS · SETOR F',pos:[14,0,8],xy:[80,76]},
 {name:'CAM 07 — MANUTENÇÃO',room:'MANUTENÇÃO · SETOR G',pos:[13,0,-9],xy:[79,18]},
 {name:'CAM 08 — ESCRITÓRIO',room:'ESCRITÓRIO · SETOR H',pos:[0,0,11],xy:[50,84]}
];
function mat(color,rough=.8,metal=0,extra={}){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,...extra})}
const mats={wall:mat('#3b3028'),dark:mat('#191716'),tile:mat('#51483e'),cream:mat('#b9a88d'),red:mat('#7d3026'),wood:mat('#59402d'),metal:mat('#61615d',.38,.8),gold:mat('#b07b3e',.4,.65),black:mat('#090a0b',.25,.25),glow:mat('#ef4933',.25,.15,{emissive:'#c32010',emissiveIntensity:2})};
function box(parent,x,y,z,w,h,d,material,opts={}){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=opts.cast!==false;m.receiveShadow=true;parent.add(m);return m}
function sphere(parent,x,y,z,r,material,sx=1,sy=1,sz=1){const m=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function cylinder(parent,x,y,z,r1,r2,h,material,segments=12){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),material);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m}
function plane(parent,x,y,z,w,d,material){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),material);m.rotation.x=-Math.PI/2;m.position.set(x,y,z);m.receiveShadow=true;parent.add(m);return m}
function wall(x,z,w,d,h=3.5,material=mats.wall){const m=box(scene,x,h/2,z,w,h,d,material);colliders.push({x,z,w,d,mesh:m,baseY:h/2});return m}
function addLight(x,y,z,color,intensity,distance,angle){const l=new THREE.PointLight(color,intensity,distance,2);l.position.set(x,y,z);scene.add(l);if(angle){const s=new THREE.SpotLight(color,intensity*1.5,18,angle,.45,1.4);s.position.set(x,y,z);s.target.position.set(x,y-4,z);scene.add(s,s.target)}return l}
function init(){renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.outputColorSpace=THREE.SRGBColorSpace;
 scene=new THREE.Scene();scene.background=new THREE.Color('#100c0b');scene.fog=new THREE.FogExp2('#120e0d',.031);camera=new THREE.PerspectiveCamera(73,innerWidth/innerHeight,.08,90);camera.rotation.order='YXZ';clock3=new THREE.Clock();
 const hemi=new THREE.HemisphereLight('#a58f75','#171313',1.25);scene.add(hemi);const key=new THREE.DirectionalLight('#f0b879',2.2);key.position.set(-8,15,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-25;key.shadow.camera.right=25;key.shadow.camera.top=20;key.shadow.camera.bottom=-20;scene.add(key);
 buildRestaurant();buildPlayer();buildCharacters();buildCamerasMap();bind();resize();renderer.setAnimationLoop(frame);
}
function buildRestaurant(){
 const floorMat=mat('#38302b',.94), tileLight=mat('#766756',.78), carpet=mat('#422d27',.97), ceiling=mat('#211d1a');
 plane(scene,0,-.12,0,38,31,floorMat);plane(scene,0,3.55,0,38,31,ceiling);
 // worn tile grid and checker details
 for(let x=-18;x<19;x+=2)for(let z=-14;z<15;z+=2){if((x+z)%4===0)plane(scene,x,.002,z,1.94,1.94,tileLight)}
 // outer shell, doors/openings in the south wall
 wall(-19,0,.7,30);wall(19,0,.7,30);wall(0,-15,38,.7);wall(-10,15,18,.7);wall(10,15,18,.7);
 // office boundary and two side exits
 wall(-12,7,14,.35);wall(-3.7,7,2.6,.35);wall(0,7,2.2,.35);wall(3.7,7,2.6,.35);wall(12,7,14,.35);
 // stage and kitchen/store partitions, open passages retained
 wall(-11,-11,14,.35);wall(11,-11,14,.35);wall(-18,-5,2,.35);wall(-18,10,2,.35);
 wall(-14,-8,8,.35);wall(-14,-1,8,.35);wall(-14,0,.35,2);wall(-14,9,.35,2);
 wall(14,-6,9,.35);wall(14,3,9,.35);wall(14,-1,.35,2);wall(14,7,.35,2);
 // office security furnishings
 plane(scene,0,-.105,10.8,11,7,carpet);box(scene,0,.65,9.3,4.2,1.25,1.1,mats.wood);box(scene,0,1.29,9.3,4.3,.09,1.16,mats.gold);
 box(scene,0,1.62,8.75,1.42,.84,.13,mats.black);box(scene,0,1.64,8.65,1.25,.65,.025,mat('#1b322e',.25,.3,{emissive:'#142c28',emissiveIntensity:.3}));
 box(scene,-1.7,.76,9.25,.3,.12,.3,mats.metal);box(scene,1.7,.76,9.25,.3,.12,.3,mats.metal);
 for(let x of [-4.6,4.6]){box(scene,x,1.35,7,.18,2.7,.18,mats.metal);box(scene,x,2.75,7,.65,.13,.22,mats.gold)}
 // stage raised platform, striped awning and curtains
 box(scene,0,.22,-12,13,.4,4.4,mats.wood);box(scene,0,2.9,-14.5,14,.32,.6,mats.red);for(let x=-6.5;x<=6.5;x+=1.3)box(scene,x,2.88,-14.15,.62,.35,.08,mats.gold);
 for(let x of [-7,7]){box(scene,x,1.7,-12,.34,3,.4,mats.red);cylinder(scene,x,3.25,-12,.22,.22,.13,mats.gold)}
 box(scene,0,2.7,-10.65,12,.35,.18,mats.gold);
 // rooms dressed with counters, shelving, tables, chairs, sinks
 for(let x of [-15,-12]){box(scene,x,1,-4,1.4,2,.7,mats.wood);for(let s of [-1,1])box(scene,x+s*.42,1,-3.6,.06,1.5,.06,mats.metal)}
 box(scene,-14,1.1,-7,7,.18,1.2,mats.metal);for(let x=-17;x<=-11;x+=1.2)box(scene,x,1.8,-7,.16,1.2,.18,mats.wood);
 // seating and party tables
 for(let x of [-7,0,7])for(let z of [-5,0,4]){cylinder(scene,x,.8,z,.85,.85,.12,mats.wood,24);cylinder(scene,x,.88,z,.7,.7,.08,mats.gold,24);for(let a=0;a<4;a++){let angle=a*Math.PI/2;let chair=box(scene,x+Math.cos(angle)*1.25,.55,z+Math.sin(angle)*1.25,.55,1,.48,mats.red);chair.rotation.y=-angle}}
 // east corridor and bathroom stalls
 for(let x of [12,16]){box(scene,x,.45,8,.12,.9,1.2,mats.cream);box(scene,x,.96,8,.5,.1,1.35,mats.metal)}
 // storage shelves
 for(let z of [3,6]){box(scene,-16,1.15,z,.35,2.3,5,mats.metal);for(let y of [.5,1.35,2.2])box(scene,-15.75,y,z,.48,.12,4.8,mats.wood);for(let x=-17;x<=-12;x+=1.5)box(scene,x,1.7,z,.75,.7,.65,mats.red)}
 // maintenance props
 box(scene,12,1,-9,4,1.9,.65,mats.metal);for(let x of [10.5,12,13.5])cylinder(scene,x,.95,-8.55,.19,.19,.9,mats.gold,8);
 // tiled wall baseboards and ceiling lamps
 for(let x=-16;x<=16;x+=5){box(scene,x,3.38,-2,1.3,.09,.08,mats.gold);addLight(x,3.12,-2,'#e6a862',9,9,.7)}
 addLight(0,3,-12,'#ffb05b',12,12,.85);addLight(-14,3,-4,'#e39150',8,9,.72);addLight(-14,3,5,'#c27a42',5,8,.7);addLight(14,3,0,'#e0a268',7,9,.7);addLight(0,3,9,'#c87a50',3,6,.8);
 // wall signage and emergency lamps
 for(let x of [-8,0,8]){box(scene,x,2.45,-14.55,2,.43,.09,mats.dark);box(scene,x,2.45,-14.48,1.82,.28,.05,mat('#9f5530',.7,0,{emissive:'#672913',emissiveIntensity:.35}))}
 for(let x of [-18.55,18.55]){box(scene,x,2,7,.06,.36,.15,mats.glow)}
}
function buildPlayer(){player={pos:new THREE.Vector3(0,0,10.7),yaw:Math.PI,pitch:0,velocity:new THREE.Vector3(),radius:.38};camera.position.set(0,1.65,10.7);scene.add(camera);
 spot=new THREE.SpotLight('#d9e8ff',0,22,.34,.45,1.4);spot.position.set(0,0,0);spot.target.position.set(0,0,-4);camera.add(spot,spot.target);const bulb=new THREE.PointLight('#d9e8ff',0,5,2);camera.add(bulb);spot.userData.bulb=bulb;
}
const castMats=['#725038','#7b473c','#55515e','#3d716c','#655449','#8c4235','#4f5548'];
const characterData=[
 {name:'COELHO',color:'#70513a',accent:'#c49a68',kind:'rabbit',speed:.68,start:[-3,0,-12],path:[[-3,0,-12],[0,0,-9],[0,0,-4],[-7,0,-3],[0,0,2],[0,0,5]]},
 {name:'CACHORRO',color:'#83523c',accent:'#d0a06c',kind:'dog',speed:.78,start:[3,0,-12],path:[[3,0,-12],[6,0,-8],[8,0,-4],[4,0,0],[1,0,5]]},
 {name:'GATO',color:'#4c4a4b',accent:'#aaa29a',kind:'cat',speed:.72,start:[0,0,-12],path:[[0,0,-12],[-4,0,-8],[-5,0,-4],[0,0,-3],[5,0,1],[4,0,5]]},
 {name:'PAPAGAIO',color:'#35654d',accent:'#e45431',kind:'parrot',speed:.86,start:[-14,0,-4],path:[[-14,0,-4],[-12,0,-9],[-8,0,-9],[-7,0,-5],[0,0,-3]]},
 {name:'ÁGUIA',color:'#786045',accent:'#cfb28a',kind:'eagle',speed:.82,start:[14,0,0],path:[[14,0,0],[12,0,-4],[8,0,-7],[5,0,-5],[3,0,0]]},
 {name:'COBRA CEGA',color:'#54705a',accent:'#a6a044',kind:'snake',speed:.57,start:[-14,0,5],path:[[-14,0,5],[-11,0,7],[-8,0,7],[-7,0,4],[-3,0,5],[0,0,7]]},
 {name:'RAPOSA RÁPIDA',color:'#a1472d',accent:'#e7b25e',kind:'fox',speed:1.55,start:[14,0,-9],path:[[14,0,-9],[14,0,-4],[10,0,-2],[7,0,1],[5,0,5]]}
];
function makeAnimatronic(data,index){
 const root=new THREE.Group();root.position.set(...data.start);scene.add(root);const shell=mat(data.color,.65,.3),accent=mat(data.accent,.48,.42),joint=mat('#292b2a',.32,.82),eye=mat('#ff3d23',.2,.12,{emissive:'#ff1e0a',emissiveIntensity:2.7}),ivory=mat('#dfc7a0',.5,.1),dark=mat('#161719',.38,.35);
 // metal endoskeleton is visible in the neck, joints and gaps
 cylinder(root,0,1.16,0,.2,.24,.84,joint);sphere(root,0,1.58,0,.16,mat('#9a8b6b',.36,.8));
 box(root,0,.99,0,.62,.75,.32,shell);sphere(root,0,1.31,-.02,.37,shell,1,.95,.8);sphere(root,0,1.25,-.31,.2,accent,1,.56,.52);
 // hinged lower jaw and rivets
 const jaw=new THREE.Group();jaw.position.set(0,1.11,-.42);root.add(jaw);box(jaw,0,-.08,-.035,.33,.13,.14,dark);for(let t=-1;t<=1;t++)box(jaw,t*.1,-.01,-.11,.045,.08,.04,ivory);
 if(data.kind!=='snake'){sphere(root,-.18,1.43,-.29,.085,eye);sphere(root,.18,1.43,-.29,.085,eye)}for(let t of [-1,1]){cylinder(root,t*.29,1.04,-.05,.035,.035,.12,joint,8);sphere(root,t*.3,1.03,-.05,.055,accent)}
 // ears, crown, beak or snout give each silhouette its own read
 if(data.kind==='rabbit'){for(let t of [-1,1]){let ear=sphere(root,t*.2,1.99,0,.14,shell,.78,2.4,.62);ear.rotation.z=t*.13;sphere(root,t*.2,2.01,-.104,.065,accent,.65,1.8,.35)}}
 if(data.kind==='cat'){for(let t of [-1,1]){const e=new THREE.Mesh(new THREE.ConeGeometry(.19,.48,5),shell);e.position.set(t*.23,1.91,-.01);e.rotation.z=t*-.19;root.add(e);const ins=new THREE.Mesh(new THREE.ConeGeometry(.07,.24,5),accent);ins.position.set(t*.23,1.91,-.12);ins.rotation.z=t*-.19;root.add(ins)}}
 if(data.kind==='dog'){for(let t of [-1,1]){const ear=sphere(root,t*.3,1.5,.02,.15,shell,.72,1.65,.72);ear.rotation.z=t*-.45} sphere(root,0,1.28,-.48,.21,accent,1.15,.72,.72);sphere(root,0,1.31,-.63,.065,dark)}
 if(data.kind==='parrot'||data.kind==='eagle'){const beak=new THREE.Mesh(new THREE.ConeGeometry(.2,.48,5),accent);beak.position.set(0,1.24,-.54);beak.rotation.x=Math.PI/2;root.add(beak);if(data.kind==='eagle'){for(let t of [-1,1]){const brow=box(root,t*.18,1.54,-.27,.28,.1,.12,accent);brow.rotation.z=t*.22}}}
 if(data.kind==='snake'){root.scale.set(.84,.9,.84);for(let i=0;i<4;i++){const coil=new THREE.Mesh(new THREE.TorusGeometry(.24+i*.035,.085,8,18),i%2?shell:joint);coil.rotation.x=Math.PI/2;coil.position.set(0,.35+i*.035,.32+i*.11);root.add(coil)}const neck=cylinder(root,0,.95,-.2,.12,.17,.8,shell);neck.rotation.x=-.25;sphere(root,0,1.46,-.35,.27,shell,1,.68,.83);box(root,0,1.5,-.555,.28,.09,.04,shell);for(let t of [-1,1])sphere(root,t*.075,1.35,-.55,.025,dark,.8,.55,.5);box(root,0,1.29,-.55,.23,.05,.04,accent);}
 if(data.kind==='fox'){for(let t of [-1,1]){let ear=new THREE.Mesh(new THREE.ConeGeometry(.16,.53,5),shell);ear.position.set(t*.22,1.93,0);root.add(ear)}sphere(root,0,1.23,-.53,.29,accent,.7,.61,1.2);sphere(root,0,1.27,-.79,.075,dark)}
 // exposed shoulder gears + independently swinging limbs
 const limbs=[];for(let t of [-1,1]){const arm=new THREE.Group();arm.position.set(t*.43,1.22,0);root.add(arm);sphere(arm,0,-.08,0,.16,joint);cylinder(arm,0,-.32,0,.095,.105,.48,joint);sphere(arm,0,-.57,-.04,.12,shell);box(arm,0,-.37,-.07,.23,.32,.13,shell);for(let f=-1;f<=1;f++)cylinder(arm,f*.07,-.67,-.08,.025,.025,.15,accent,7);limbs.push(arm);
 const leg=new THREE.Group();leg.position.set(t*.2,.75,0);root.add(leg);sphere(leg,0,-.04,0,.14,joint);cylinder(leg,0,-.32,0,.11,.14,.56,joint);box(leg,0,-.32,-.035,.25,.38,.2,shell);box(leg,0,-.68,-.15,.3,.16,.42,accent);limbs.push(leg)}
 const tail=sphere(root,data.kind==='fox'?.34:.32,.78,.26,.23,data.kind==='dog'?accent:shell,.75,.85,1.9);tail.rotation.x=-.55;
 // neck bolts and chest plate
 for(let y of [1.12,1.28])for(let t of [-1,1])sphere(root,t*.28,y,-.19,.028,accent);
 const nameSprite=makeLabel(data.name);nameSprite.position.set(0,2.48,0);root.add(nameSprite);
 return {data,index,root,limbs,jaw,eye,waypoint:0,moveAt:index<3?10+index*6:23+index*4,attack:0,base:new THREE.Vector3(...data.start),phase:Math.random()*5,speed:data.speed,active:true};
}
function makeLabel(text){const c=document.createElement('canvas');c.width=256;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#160f0ddd';ctx.fillRect(0,0,256,64);ctx.strokeStyle='#e14839';ctx.strokeRect(1,1,254,62);ctx.fillStyle='#eedccd';ctx.font='20px monospace';ctx.textAlign='center';ctx.fillText(text,128,40);const tex=new THREE.CanvasTexture(c);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));sprite.scale.set(1.8,.45,1);return sprite}
function buildCharacters(){characterData.forEach((d,i)=>animatronics.push(makeAnimatronic(d,i)))}
function buildCamerasMap(){camRooms.forEach((c,i)=>{const b=document.createElement('button');b.className='cam-point';b.style.left=c.xy[0]+'%';b.style.top=c.xy[1]+'%';b.textContent='0'+(i+1);b.innerHTML=`0${i+1}<span>${c.name.split('— ')[1]}</span>`;b.onclick=()=>selectCamera(i);$('#camera-map').appendChild(b)});for(const side of ['left','right']){const d=box(scene,side==='left'?-3.7:3.7,1.35,7,2.6,2.7,.22,mats.metal);d.visible=false;d.userData.side=side;objects.push(d)}}
function bind(){
 addEventListener('resize',resize);addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;
  if(e.code==='Escape'){if(cameraOpen){toggleCameras(false)}else if(started&&!gameOver)togglePause(true)}
  if(!started||paused||gameOver)return;
  if(e.code==='KeyF')toggleFlashlight();if(e.code==='KeyC')toggleCameras(!cameraOpen);if(e.code==='KeyQ')toggleDoor();if(e.code==='KeyE')interact();
 });addEventListener('keyup',e=>keys[e.code]=false);
 canvas.addEventListener('click',()=>{if(started&&!paused&&!cameraOpen&&document.pointerLockElement!==canvas)canvas.requestPointerLock?.()});
 document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==canvas&&started&&!paused&&!cameraOpen&&!gameOver)togglePause(true)});
 document.addEventListener('mousemove',e=>{if(!started||paused||cameraOpen)return;if(document.pointerLockElement===canvas){player.yaw-=e.movementX*mouseSensitivity;player.pitch=Math.max(-1.25,Math.min(1.25,player.pitch-e.movementY*mouseSensitivity))}});
 let touchLast=null;canvas.addEventListener('touchstart',e=>{touchLast=[e.touches[0].clientX,e.touches[0].clientY]},{passive:true});canvas.addEventListener('touchmove',e=>{if(!started||!touchLast)return;const t=e.touches[0],dx=t.clientX-touchLast[0],dy=t.clientY-touchLast[1];player.yaw-=dx*.006;player.pitch=Math.max(-1.1,Math.min(1.1,player.pitch-dy*.006));touchLast=[t.clientX,t.clientY]},{passive:true});canvas.addEventListener('touchend',()=>touchLast=null);
 $('#new-game').onclick=()=>startGame(1);$('#continue-game').onclick=()=>startGame(Number(localStorage.getItem('pd-night'))||1);$('#settings-button').onclick=()=>$('#settings-panel').classList.remove('hidden');$('#credits-button').onclick=()=>$('#credits-panel').classList.remove('hidden');document.querySelectorAll('.close-modal,.modal-done').forEach(b=>b.onclick=()=>b.closest('.modal').classList.add('hidden'));
 $('#volume').oninput=e=>{volume=e.target.value/100;if(ambientAudio)ambientAudio.master.gain.value=volume*.12};$('#sensitivity').oninput=e=>mouseSensitivity=e.target.value/100000;
 $('#close-cameras').onclick=()=>toggleCameras(false);$('#resume').onclick=()=>togglePause(false);$('#quit-game').onclick=()=>{togglePause(false);endToMenu()};$('#return-menu').onclick=endToMenu;
}
function resize(){if(!renderer)return;renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}
function startGame(which=1){$('#return-menu').onclick=endToMenu;night=which;elapsed=0;power=100;gameOver=false;paused=false;started=true;flashlightOn=false;doorClosed={left:false,right:false};for(let d of objects)d.visible=false;animatronics.forEach((a,i)=>{a.root.position.set(...a.data.start);a.waypoint=0;a.active=true;a.attack=0;a.moveAt=(i<3?13+i*8:33+i*7)+(night-1)*3});$('#night-num').textContent=String(night).padStart(2,'0');$('#menu').classList.add('hidden');$('#overlay').classList.add('hidden');$('#pause').classList.add('hidden');$('#hud').classList.remove('hidden');$('#camera-ui').classList.add('hidden');$('#clock').textContent='01:00 AM';$('#room-name').textContent='ESCRITÓRIO DE SEGURANÇA';$('#continue-label').textContent='NOITE '+String(Number(localStorage.getItem('pd-night'))||1).padStart(2,'0');player.pos.set(0,0,10.7);player.yaw=0;player.pitch=0;camera.position.set(0,1.65,10.7);camera.rotation.set(0,0,0);$('#scene').style.filter='';lastToast=0;startAudio();showToast('TURNO INICIADO — O PRÉDIO FECHA ÀS 06:00');canvas.requestPointerLock?.()}
function endToMenu(){started=false;paused=false;gameOver=false;cameraOpen=false;$('#return-menu').onclick=endToMenu;document.exitPointerLock?.();$('#hud').classList.add('hidden');$('#pause').classList.add('hidden');$('#overlay').classList.add('hidden');$('#menu').classList.remove('hidden');$('#continue-label').textContent=localStorage.getItem('pd-night')?'NOITE '+String(localStorage.getItem('pd-night')).padStart(2,'0'):'— SEM TURNO SALVO'}
function togglePause(value){paused=value;$('#pause').classList.toggle('hidden',!value);if(value)document.exitPointerLock?.();else canvas.requestPointerLock?.()}
function toggleFlashlight(){if(power<=0){showToast('SEM ENERGIA — LANTERNA INOPERANTE');return}flashlightOn=!flashlightOn;spot.intensity=flashlightOn?25:0;spot.userData.bulb.intensity=flashlightOn?1.6:0;showToast(flashlightOn?'LANTERNA LIGADA':'LANTERNA DESLIGADA');sfx(flashlightOn?620:280,.055,'square')}
function toggleCameras(value){cameraOpen=value;$('#camera-ui').classList.toggle('hidden',!value);if(value){selectCamera(currentCam);document.exitPointerLock?.()}else if(started&&!paused)canvas.requestPointerLock?.()}
function toggleDoor(){const side=nearestDoor();if(!side){showToast('APROXIME-SE DE UMA PORTA DE SEGURANÇA');return}if(power<=0&&!doorClosed[side]){showToast('ENERGIA INSUFICIENTE PARA FECHAR A PORTA');return}doorClosed[side]=!doorClosed[side];const door=objects.find(d=>d.userData.side===side);door.visible=doorClosed[side];showToast(`PORTA ${side==='left'?'ESQUERDA':'DIREITA'} ${doorClosed[side]?'FECHADA':'ABERTA'}`);sfx(doorClosed[side]?100:180,.18,'sawtooth')}
function nearestDoor(){let best=null,dist=2.8;for(let side of ['left','right']){const x=side==='left'?-3.7:3.7,d=Math.hypot(player.pos.x-x,player.pos.z-7.5);if(d<dist){best=side;dist=d}}return best}
function interact(){const d=nearestDoor();if(d){toggleDoor();return}if(Math.hypot(player.pos.x,player.pos.z-8.6)<2.4){toggleCameras(!cameraOpen);return}const target=animatronics.find(a=>a.active&&a.root.position.distanceTo(player.pos)<2.2);if(target){showToast(`${target.data.name} — NÃO TOQUE NO EQUIPAMENTO`);return}showToast('NADA ALCANÇÁVEL — USE O MONITOR DE SEGURANÇA')}
function selectCamera(i){currentCam=i;const c=camRooms[i];$('#cam-name').textContent=c.name;$('#cam-description').textContent=c.room;document.querySelectorAll('.cam-point').forEach((el,j)=>el.classList.toggle('active',j===i));const feed=$('#feed-subjects');feed.innerHTML='';const nearby=animatronics.filter(a=>a.active&&Math.hypot(a.root.position.x-c.pos[0],a.root.position.z-c.pos[2])<5.2);if(!nearby.length){const empty=document.createElement('div');empty.style.cssText='align-self:center;color:#8f8779;font:10px monospace;letter-spacing:2px';empty.textContent='— NENHUM MOVIMENTO —';feed.appendChild(empty)}nearby.forEach(a=>{const f=document.createElement('div');f.className='feed-figure';f.innerHTML='<i class="head"></i><i class="body"></i>';f.style.filter=`hue-rotate(${a.index*21}deg)`;feed.appendChild(f)});$('#feed-time').textContent=$('#clock').textContent.replace(' AM','')+':'+String(Math.floor(elapsed%60)).padStart(2,'0')}
function showToast(msg){const now=performance.now();lastToast=now;ui.toast.textContent=msg;ui.toast.classList.remove('hidden');setTimeout(()=>{if(performance.now()-lastToast>=1450)ui.toast.classList.add('hidden')},1500)}
function startAudio(){if(ambientAudio)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const ctx=new AC(),master=ctx.createGain();master.gain.value=volume*.12;master.connect(ctx.destination);const osc=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();osc.type='sawtooth';osc.frequency.value=47;filter.type='lowpass';filter.frequency.value=110;gain.gain.value=.18;osc.connect(filter).connect(gain).connect(master);osc.start();ambientAudio={ctx,master};ctx.resume()}catch(e){}}
function sfx(freq=220,duration=.1,type='sine'){if(!ambientAudio)return;try{const c=ambientAudio.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.0001,c.currentTime);g.gain.exponentialRampToValueAtTime(.13*volume,c.currentTime+.012);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);o.connect(g).connect(ambientAudio.master);o.start();o.stop(c.currentTime+duration+.02)}catch(e){}}
function frame(){const dt=Math.min(clock3.getDelta(),.05),t=clock3.elapsedTime;animateWorld(t,dt);if(started&&!paused&&!gameOver)updateGame(dt);renderer.render(scene,camera)}
function animateWorld(t,dt){for(const a of animatronics){const moving=a.active&&started&&!paused&&elapsed>a.moveAt;a.root.position.y=Math.sin(t*2+a.phase)*.025;if(moving){a.limbs.forEach((l,i)=>{l.rotation.x=Math.sin(t*7+a.phase+i*2)*.24});a.jaw.rotation.x=Math.max(0,Math.sin(t*3+a.phase))*.09}else{a.limbs.forEach((l,i)=>{l.rotation.x=Math.sin(t*.7+a.phase+i)*.025});a.jaw.rotation.x=Math.sin(t*1.1+a.phase)*.025}a.root.rotation.y+=Math.sin(t*1.4+a.phase)*dt*.025}}
function updateGame(dt){elapsed+=dt;const gameMinutes=60+Math.min(300,elapsed/NIGHT_LENGTH*300),hour=Math.floor(gameMinutes/60),minute=Math.floor(gameMinutes%60);$('#clock').textContent=String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0')+' AM';if(elapsed>=NIGHT_LENGTH){$('#clock').textContent='06:00 AM';winNight();return}
 movePlayer(dt);updateAnimatronics(dt);updatePower(dt);updateHUD();
 if(Math.floor(elapsed)%5===0&&Math.floor(elapsed-dt)%5!==0){$('#feed-time').textContent=$('#clock').textContent.replace(' AM','');if(cameraOpen)selectCamera(currentCam)}
 if(Math.random()<dt*.018)sfx(80+Math.random()*180,.08,'triangle');
}
function movePlayer(dt){const forward=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0),side=(keys.KeyD?1:0)-(keys.KeyA?1:0),fast=keys.ShiftLeft||keys.ShiftRight?1.35:1;const len=Math.hypot(forward,side)||1,speed=3.35*fast;let dx=(-Math.sin(player.yaw)*forward+Math.cos(player.yaw)*side)/len*speed*dt,dz=(-Math.cos(player.yaw)*forward-Math.sin(player.yaw)*side)/len*speed*dt;const nx=player.pos.x+dx,nz=player.pos.z+dz;if(!blocked(nx,player.pos.z))player.pos.x=nx;if(!blocked(player.pos.x,nz))player.pos.z=nz;player.pos.x=THREE.MathUtils.clamp(player.pos.x,-18.1,18.1);player.pos.z=THREE.MathUtils.clamp(player.pos.z,-14.1,14.1);camera.position.set(player.pos.x,1.63+Math.sin(elapsed*8)*((forward||side)?.018:0),player.pos.z);camera.rotation.set(player.pitch,player.yaw,0,'YXZ');spot.target.position.set(Math.sin(player.yaw)*-7,Math.sin(player.pitch)*5,-Math.cos(player.yaw)*7);if((forward||side)&&elapsed-lastStep>.48){lastStep=elapsed;if(Math.random()<.3)sfx(54,.045,'triangle')}}
function blocked(x,z){const r=.32;for(const c of colliders){if(Math.abs(x-c.x)<c.w/2+r&&Math.abs(z-c.z)<c.d/2+r)return true}for(const side of ['left','right'])if(doorClosed[side]){const dx=side==='left'?-3.7:3.7;if(Math.abs(x-dx)<1.36+r&&Math.abs(z-7)<.3+r)return true}return false}
function updateAnimatronics(dt){for(const a of animatronics){if(!a.active||elapsed<a.moveAt)continue;const pos=a.root.position,paths=a.data.path;let target=paths[a.waypoint];if(!target)target=paths[paths.length-1];if(night>=2&&a.waypoint>=paths.length-1&&Math.hypot(player.pos.x-pos.x,player.pos.z-pos.z)<12)target=[player.pos.x,0,player.pos.z];const dx=target[0]-pos.x,dz=target[2]-pos.z,dist=Math.hypot(dx,dz);if(dist<.35){if(a.waypoint<paths.length-1)a.waypoint++;else if(night===1)a.waypoint=0}else{const step=Math.min(dist,a.speed*(night===1?1:.8+night*.14)*dt);let nx=pos.x+dx/dist*step,nz=pos.z+dz/dist*step;if(doorClosed.left&&crossesDoor(pos.x,pos.z,nx,nz,-3.7)){nx=pos.x;nz=Math.min(nz,6.45)}if(doorClosed.right&&crossesDoor(pos.x,pos.z,nx,nz,3.7)){nx=pos.x;nz=Math.min(nz,6.45)}pos.x=nx;pos.z=nz;a.root.rotation.y=Math.atan2(-dx,-dz)}
 const d=Math.hypot(player.pos.x-pos.x,player.pos.z-pos.z);if(d<1.6){if(flashlightOn&&d<7){a.moveAt+=dt*.7}else{a.attack+=dt;if(a.attack>1.0){loseNight(a);return}}}else a.attack=Math.max(0,a.attack-dt*.3);
 if(d<5&&Math.random()<dt*.025)sfx(115+a.index*17,.12,'square')}}
function crossesDoor(x,z,nx,nz,doorX){return (z-7)*(nz-7)<=0&&Math.abs(nx-doorX)<1.65}
function updatePower(dt){const doors=Number(doorClosed.left)+Number(doorClosed.right);const drain=.095+(flashlightOn?.34:0)+(cameraOpen?.105:0)+doors*.17;power=Math.max(0,power-drain*dt);if(power<=0){if(flashlightOn){flashlightOn=false;spot.intensity=0;spot.userData.bulb.intensity=0;showToast('APAGÃO — A PIZZARIA FICOU NO ESCURO')}doorClosed.left=doorClosed.right=false;objects.forEach(d=>d.visible=false)}}
function updateHUD(){const pct=Math.round(power);$('#power-value').textContent=String(pct).padStart(2,'0');$('#power-bar').style.width=pct+'%';$('#power-bar').style.background=pct<20?'#f04435':'#df4a39';const uses=1+Number(flashlightOn)+Number(cameraOpen)+Number(doorClosed.left)+Number(doorClosed.right);$('.usage-bars').querySelectorAll('i').forEach((el,i)=>el.style.opacity=i<uses?'.95':'.2');$('#usage-label').textContent=flashlightOn?'LANTERNA ATIVA':'CONSUMO';
 let room='SALÃO PRINCIPAL';if(player.pos.z>7)room='ESCRITÓRIO DE SEGURANÇA';else if(player.pos.z<-10)room='PALCO DOS ANIMATRÔNICOS';else if(player.pos.x<-10&&player.pos.z<-1)room='COZINHA';else if(player.pos.x<-10)room='DEPÓSITO';else if(player.pos.x>10&&player.pos.z>4)room='BANHEIROS';else if(player.pos.x>10&&player.pos.z<-5)room='SALA DE MANUTENÇÃO';else if(Math.abs(player.pos.x)>10)room='CORREDOR LATERAL';$('#room-name').textContent=room;
 const door=nearestDoor(),nearMonitor=Math.hypot(player.pos.x,player.pos.z-8.6)<2.4;ui.prompt.classList.toggle('hidden',!door&&!nearMonitor);if(door){ui.prompt.querySelector('span').textContent=`PORTA ${door==='left'?'ESQUERDA':'DIREITA'} · ${doorClosed[door]?'ABRIR':'FECHAR'} (Q)`}else if(nearMonitor)ui.prompt.querySelector('span').textContent='MONITOR DE SEGURANÇA (E)';else ui.prompt.querySelector('span').textContent='INTERAGIR';$('#door-state').classList.toggle('hidden',!door);if(door)$('#door-state').innerHTML=`PORTA <b>${doorClosed[door]?'FECHADA':'ABERTA'}</b> <span>Q</span>`;
}
function loseNight(a){if(gameOver)return;gameOver=true;paused=false;document.exitPointerLock?.();$('#result-eyebrow').textContent='FALHA NO TURNO · '+a.data.name;$('#result-title').textContent='VOCÊ FOI ENCONTRADO.';$('#result-text').textContent='O turno acabou. Os animatrônicos voltaram ao palco.';$('#overlay').classList.remove('hidden');$('#pause').classList.add('hidden');localStorage.setItem('pd-night',String(night));sfx(45,.8,'sawtooth')}
function winNight(){gameOver=true;document.exitPointerLock?.();const done=night>=5;$('#result-eyebrow').textContent=done?'EXPEDIENTE ENCERRADO':'06:00 AM · TURNO CONCLUÍDO';$('#result-title').textContent=done?'VOCÊ SOBREVIVEU À PIZZARIA.':'VOCÊ SOBREVIVEU.';$('#result-text').textContent=done?'A verdade ficou enterrada. A pizzaria não.':'Mais uma noite concluída. A próxima será ainda pior.';$('#return-menu').innerHTML=done?'VOLTAR AO MENU <b>↗</b>':'PRÓXIMA NOITE <b>↗</b>';$('#return-menu').onclick=()=>{if(done){localStorage.removeItem('pd-night');endToMenu()}else startGame(night+1)};localStorage.setItem('pd-night',String(done?1:night+1));$('#overlay').classList.remove('hidden');sfx(540,.4,'sine')}
init();
