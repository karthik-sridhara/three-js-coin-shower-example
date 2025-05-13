import * as THREE from 'three';
import {GUI} from 'three/addons/libs/lil-gui.module.min.js';
import CANNON from 'cannon';


/**
 * Debug
 */
const gui = new GUI();


/**
 * Base
 */
// Canvas
const canvas = document.querySelector("canvas.webgl");
// Scene
const scene = new THREE.Scene();
const virtualScene = new CANNON.World();
virtualScene.gravity.set(0, -9.82, 0);


/**
 * Texture
 */
const loaderManager = new THREE.LoadingManager();
loaderManager.onError = (url) => {
    console.error(url);
}
const textureLoader = new THREE.TextureLoader(loaderManager);
const coinColorTexture = textureLoader.load("/goldTexture/Poliigon_MetalGoldPaint_7253_BaseColor.jpg");
coinColorTexture.colorSpace = THREE.SRGBColorSpace;
const coinNormalTexture = textureLoader.load("/goldTexture/Poliigon_MetalGoldPaint_7253_Normal.png");
const coinRoughnessTexture = textureLoader.load("/goldTexture/Poliigon_MetalGoldPaint_7253_Roughness.jpg");
const coinMetalnessTexture = textureLoader.load("/goldTexture/Poliigon_MetalGoldPaint_7253_Metallic.jpg");

/**
 * Light
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(3, 3, 3); 
scene.add(directionalLight);


/**
 * Object
 */

const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        side: THREE.DoubleSide,
    })
);
plane.rotation.x = - Math.PI * 0.5;
plane.position.y = -0.01;
// scene.add(plane);

const virtualPlane = new CANNON.Body({
    mass: 0,
    position: new CANNON.Vec3(0, 0, 0),
    shape: new CANNON.Plane()
});
virtualPlane.quaternion.setFromEuler(-Math.PI * 0.5, 0, 0);
virtualScene.addBody(virtualPlane);


const coins = [];
const coinRadius = 0.2;
const coinHeight = 0.05;
const segments = 32;

const coinGeometry = new THREE.CylinderGeometry(coinRadius,coinRadius, coinHeight, segments);
const coinMaterial = new THREE.MeshStandardMaterial({
    map: coinColorTexture,
    normalMap: coinNormalTexture,
    roughnessMap: coinRoughnessTexture,
    metalnessMap: coinMetalnessTexture,
    metalness:0.6,
    roughness: 0.3
});
function createCoin(position){
    const coin = new THREE.Mesh(coinGeometry, coinMaterial);
    coin.position.copy(position);
    scene.add(coin);

    const virtualCoin = new CANNON.Body({
        mass: 1
    });
    const quat = new CANNON.Quaternion();
    quat.setFromEuler(Math.PI / 2, 0, 0); 
    virtualCoin.addShape( 
        new CANNON.Cylinder(coinRadius, coinRadius,coinHeight, segments), 
        new CANNON.Vec3(0, 0, 0), quat
    );
    virtualCoin.position.copy(position);
    virtualScene.addBody(virtualCoin);

    const coinObject ={
        physical: coin,
        virtual: virtualCoin,
        time:new Date().getTime()
    }

    coins.push(coinObject); 

    return coinObject;
}

/**
 * Camera
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.set(0, 3, 6);  // Pull back and look from above
camera.rotation.set(0.2, 0, 0); 
scene.add(camera);



/**
 * Renderer
 */
// antialias: true, alpha: true 
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));


window.addEventListener("resize", () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
});


/**
 * Animation
 */

const triggerEvents = {
    'coin-shower':false,
    'parabolic-coin-shower':false,
    'coin-burst':false,
}
const parabolicCoinFlow ={
    'z-axis':false,
    'projectile-amplitude':10,
    'projectile-velocity':10,
    'impulse-force':0.1,
}



const clock = new THREE.Clock();
let previousElapsed = 0;
let previousCoinCreated = 0;
function tick(){

    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - previousElapsed;
    previousElapsed = elapsedTime;

    const currentTime = new Date().getTime();

    // Create coins
    if (triggerEvents['parabolic-coin-shower'] && currentTime - previousCoinCreated > 30) {
        const randomX = (Math.random()-0.5);
        const randomZ = (Math.random()-0.5);
        const position = new THREE.Vector3(randomX, 1, randomZ);
        const coinObject = createCoin(position);

        const projectile = (Math.random() - 0.5) * parabolicCoinFlow['projectile-velocity'] ;
        let isX = Math.random() > 0.5 ? 1 : 0;
        let isZ = isX ? 0 : 1;
        if(parabolicCoinFlow['z-axis'] == false){
            isX = 1;
            isZ = 0;
        }
        
        coinObject.virtual.velocity.set(
            projectile * isX, // X
            parabolicCoinFlow['projectile-amplitude'] + Math.random() * 2,     // Y
            projectile * isZ,  // Z
        );
        setTimeout(() => {

        coinObject.virtual.applyImpulse(
            new CANNON.Vec3(
                Math.random() * parabolicCoinFlow['impulse-force'],
                0,
                Math.random() * parabolicCoinFlow['impulse-force']
            ),
            new CANNON.Vec3(0,0,0)
        )
    }, 100);

        previousCoinCreated = currentTime;

       
    }

   
    // Update physics
    virtualScene.step(1 / 60, deltaTime, 3);

    const length = coins.length;
    const inactiveCoins = [];
    
    for (let i = 0 ; i<length ; i++){
        const coin = coins[i];
        coin.physical.position.copy(coin.virtual.position);
        coin.physical.quaternion.copy(coin.virtual.quaternion);
        const time = coin.time;
        const timeDiff = currentTime - time;
        const cutOff = 5000;
        if (timeDiff > cutOff){
            inactiveCoins.push(i);
        }
    }
   
    for (let i = inactiveCoins.length - 1; i >= 0; i--) {
        const index = inactiveCoins[i];
        const coin = coins[index];
        scene.remove(coin.physical);
        virtualScene.removeBody(coin.virtual);
        coin.physical.geometry.dispose();
        coin.physical.material.dispose();
        coins.splice(index, 1);
    }


    // Render
    renderer.render(scene, camera);

    // Call tick again on the next frame
    window.requestAnimationFrame(tick);
}

tick();


const cameraFolder = gui.addFolder('Camera');
cameraFolder.add(camera.position, 'x').min(-10).max(10).step(0.1).name('Camera X');
cameraFolder.add(camera.position, 'y').min(-10).max(10).step(0.1).name('Camera Y');
cameraFolder.add(camera.position, 'z').min(-10).max(10).step(0.1).name('Camera Z');
cameraFolder.add(camera.rotation, 'x').min(-Math.PI).max(Math.PI).step(0.01).name('Camera Rotation X');
cameraFolder.add(camera.rotation, 'y').min(-Math.PI).max(Math.PI).step(0.01).name('Camera Rotation Y');
cameraFolder.add(camera.rotation, 'z').min(-Math.PI).max(Math.PI).step(0.01).name('Camera Rotation Z');
cameraFolder.close();

const parabolicFolder = gui.addFolder('Parabolic Coin Shower');
parabolicFolder.add(triggerEvents, 'parabolic-coin-shower').name('TRIGGER');
parabolicFolder.add(parabolicCoinFlow, 'z-axis').name('Z-Axis');
parabolicFolder.add(parabolicCoinFlow, 'projectile-amplitude').min(0).max(20).step(0.1).name('Projectile Amplitude');
parabolicFolder.add(parabolicCoinFlow, 'projectile-velocity').min(0).max(20).step(0.1).name('Projectile Velocity');
parabolicFolder.add(parabolicCoinFlow, 'impulse-force').min(0).max(20).step(0.1).name('Impulse Force');
parabolicFolder.close();


// const balloonFolder = gui.addFolder('Coin Burst');
// balloonFolder.add(triggerEvents, 'coin-burst').name('TRIGGER');
// balloonFolder.close();




// if (triggerEvents['coin-burst'] && currentTime - previousCoinCreated > 30) {

//     for(let i = 0; i < coinBurstFlow['no-coin']; i++){
//         const coinObject = createCoin({x: (Math.random()-0.5),y:0,z:(Math.random()-0.5)});

//         coinObject.physical.quaternion.setFromEuler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
//         coinObject.virtual.quaternion.copy(coinObject.physical.quaternion);
//     }
//     if(coinBurstFlow['no-coin']<10 && coinBurstFlow['phase'] == 'rising'){
//         // for (let i = 0; i < coins.length; i++) {
//         //     const coin = coins[i];
//         //     coin.physical.position.y += 0.1;
//         //     coin.virtual.position.copy(coin.physical.position);
//         //     coin.virtual.quaternion.copy(coin.physical.quaternion);
//         // }
//         coinBurstFlow['no-coin'] += 1;
//     }else if(coinBurstFlow['no-coin']>0 && coinBurstFlow['phase'] == 'falling'){
//         coinBurstFlow['phase'] = 'falling';
//         coinBurstFlow['no-coin'] -= 1;
//     }
//     // }else{
//     //     triggerEvents['coin-burst'] = false;
//     //     coinBurstFlow['phase'] = 'rising';
//     //     coinBurstFlow['no-coin'] = 1;
//     // }

// }



// if(triggerEvents['coin-burst']){
//     for (let i = 0 ; i<length ; i++){
//         const coin = coins[i];
//         coin.virtual.applyForce(
//             new CANNON.Vec3(0,15,0),
//             new CANNON.Vec3(0,0,0)
//         );
//         coin.physical.position.copy(coin.virtual.position);
//         coin.physical.quaternion.copy(coin.virtual.quaternion);
        
//     }
// }


// const coinBurstFlow = {
//     'no-coin':1,
//     'phase':'rising'
// }