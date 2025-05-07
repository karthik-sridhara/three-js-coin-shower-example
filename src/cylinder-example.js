import * as THREE from "three";
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GUI} from 'three/addons/libs/lil-gui.module.min.js';
import CANNON from "cannon";
/**
 * Base
 */
// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const defaultMaterial = new CANNON.Material("default");
const defaultContactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    defaultMaterial,
    {
        friction: 0.2 ,
        restitution: 0.6,
    }
);

const scene = new THREE.Scene();
const virtualScene = new CANNON.World();
virtualScene.gravity.set(0, -9.82, 0); 
virtualScene.defaultContactMaterial = defaultContactMaterial;
// virtualScene.broadphase = new CANNON.SAPBroadphase(virtualScene);

/**
 * Texture
 */
const loaderManager = new THREE.LoadingManager();
loaderManager.onError = (url) => {
    console.error( url);
}
const textureLoader = new THREE.TextureLoader();
const coinColorTexture = textureLoader.load("/goldTexture/Poliigon_MetalGoldPaint_7253_BaseColor.jpg");
coinColorTexture.colorSpace = THREE.SRGBColorSpace;
const coinNormalTexture = textureLoader.load("/goldTexture/Poliigon_MetalGoldPaint_7253_Normal.png");
const coinRoughnessTexture = textureLoader.load("/goldTexture/Poliigon_MetalGoldPaint_7253_Roughness.jpg");
const coinMetalnessTexture = textureLoader.load("/goldTexture/Poliigon_MetalGoldPaint_7253_Metallic.jpg");
const coinHeightTexture = textureLoader.load("/goldTexture/Poliigon_MetalGoldPaint_7253_Displacement.tiff");

/**
 * Light
 */

const AmibentLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(AmibentLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(5, 5, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 512;
directionalLight.shadow.mapSize.height = 512;
directionalLight.shadow.camera.near = 0.1;
directionalLight.shadow.camera.far = 20;
scene.add(directionalLight);
/**
 * Object
 */
const physicalFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial()
);
physicalFloor.rotation.x = -Math.PI / 2;
physicalFloor.receiveShadow = true;
scene.add(physicalFloor);

const virtualFoor = new CANNON.Body({
    mass: 0,
    position: new CANNON.Vec3(0, 0, 0),
    shape: new CANNON.Plane(),
});
virtualFoor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
virtualScene.addBody(virtualFoor);


/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
};

window.addEventListener("resize", () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height,0.1,100);

camera.position.set(0,3,5);
scene.add(camera);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);
renderer.shadowMap.enabled = true;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Utility 
 */
const coins = [];
const coinRadius = 0.2;
const coinHeight = 0.1;
const segments = 32;

const coinGeometry = new THREE.CylinderGeometry(coinRadius, coinRadius, coinHeight, segments);
const coinMaterial = new THREE.MeshStandardMaterial({ 
    map: coinColorTexture,
    normalMap: coinNormalTexture,
    roughnessMap: coinRoughnessTexture,
    metalnessMap: coinMetalnessTexture,
    displacementMap: coinHeightTexture,
    displacementScale: 0.1,
    metalness: 0.5,
    roughness: 0.1,
});

function createCoin(position){
    const physicalCoin = new THREE.Mesh(coinGeometry, coinMaterial);
    physicalCoin.position.copy(position);
    physicalCoin.castShadow = true;
    physicalCoin.receiveShadow = true;
    scene.add(physicalCoin);


    const virtualCoinShape = new CANNON.Cylinder(coinRadius, coinRadius, coinHeight, segments);
    const virtualCoin = new CANNON.Body({
        mass: 1,
    });

    const quat = new CANNON.Quaternion();
    quat.setFromEuler(Math.PI / 2, 0, 0); 
    virtualCoin.addShape(virtualCoinShape, new CANNON.Vec3(0, 0, 0), quat);

    virtualCoin.position.copy(position);
    virtualScene.addBody(virtualCoin);

    coins.push({
        physical: physicalCoin,
        virtual: virtualCoin,
        time:new Date().getTime()
    }); 
}



/**
 * Animation
 */
const clock = new THREE.Clock();
let previousTime = 0;
function tick() {
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - previousTime;
    // Update physics
    virtualScene.step(1 / 60,deltaTime, 3);
    

    // Update objects
    const length = coins.length;
    const inactiveCoins = [];
    for (let i = 0 ; i<length ; i++){
        const coin = coins[i];
        coin.physical.position.copy(coin.virtual.position);
        coin.physical.quaternion.copy(coin.virtual.quaternion);

      
        const currentTime = new Date().getTime();
        const time = coin.time;
        const timeDiff = currentTime - time;
        if (timeDiff > 15000){
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

    controls.update();
    renderer.render(scene, camera);
    previousTime = elapsedTime;
    window.requestAnimationFrame(tick);
}
tick();
/**
 * Debug
 */
const gui = new GUI();
const debugObject = {
    create:() => {
        createCoin(
            {
                x:(Math.random() - 0.5) * 4,
                y:5, 
                z: (Math.random() - 0.5) * 4
            }
        );
    },
};
gui.add(debugObject, "create").name("Create");