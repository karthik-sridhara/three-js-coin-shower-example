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
directionalLight.shadow.camera.far = 10;
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
const cubeObjects = [];

const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xff0000,
    metalness: 0.7,
    roughness: 0.2,
});

function createCube(width,height,depth,position){
    const physicalCube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    physicalCube.scale.set(width,height,depth);
    physicalCube.position.copy(position);
    physicalCube.castShadow = true;
    physicalCube.receiveShadow = true;
    scene.add(physicalCube);

    const virtualCube = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Box(new CANNON.Vec3(width/2,height/2,depth/2)),
    });
    virtualCube.position.copy(position);
    virtualScene.addBody(virtualCube);

    cubeObjects.push({
        physical: physicalCube,
        virtual: virtualCube,
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
    const length = cubeObjects.length;
    const inactiveCubes = [];
    for (let i = 0 ; i<length ; i++){
        const cube = cubeObjects[i];
        cube.physical.position.copy(cube.virtual.position);
        cube.physical.quaternion.copy(cube.virtual.quaternion);

        // const velocity = cube.virtual.velocity;
        // const speed = velocity.length(); 
        // const threshold = 0.001;
        // if (speed < threshold){
        //     inactiveCubes.push(i);
        // }

        const currentTime = new Date().getTime();
        const time = cube.time;
        const timeDiff = currentTime - time;
        if (timeDiff > 4000){
            inactiveCubes.push(i);
        }
    }
    for (let i = inactiveCubes.length - 1; i >= 0; i--) {
        const index = inactiveCubes[i];
        const cube = cubeObjects[index];
        scene.remove(cube.physical);
        virtualScene.removeBody(cube.virtual);
        cube.physical.geometry.dispose();
        cube.physical.material.dispose();
        cubeObjects.splice(index, 1);
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
    createCube: () => {
        createCube(
            Math.random() * 2,
            Math.random() * 2,
            Math.random() * 2,
            {
                x:(Math.random() - 0.5) * 4,
                y:5, 
                z: (Math.random() - 0.5) * 4
            }
        );
    },
};
gui.add(debugObject, "createCube").name("Create Cube");