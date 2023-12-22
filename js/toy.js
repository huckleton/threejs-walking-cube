import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clamp } from 'three/src/math/MathUtils';

const clock = new THREE.Clock(true);
const animatedObjects = [];
let walkingCube;

// CLASSES

class AnimatedObject {
	constructor(object) {
		this.object = object;
		animatedObjects.push(this);
	}

	animate() {
		return true;
	}
}

class WalkingCube extends AnimatedObject {
	constructor(object, cube) {
		super(object);
		this.cube = cube;
		this.stepLength = 0.16;
		this.nextPosition = null;
		this.progress = 0;
		this.oldAngle = null;
		this.newAngle = null;
	}

	getPosition() {
		return [ this.object.position.x, this.object.position.y, this.object.position.z ];
	}

	getCubePosition() {
		return [ this.cube.position.x, this.cube.position.y, this.cube.position.z ];
	}

	animate() {
		const delta = clock.getDelta();

		if (this.nextPosition) {
			if (this.progress === 0) {
				this.startMove();
			}

			this.progress += delta / this.stepLength;
			this.object.rotation.set( ...interpolateAngles(this.oldAngle, this.newAngle, clamp(this.progress, 0, 1)) );
			
			if (this.progress >= 1) {
				this.endMove();
			}
		}
	}

	startMove() {
		const [x, y, z] = this.getPosition();
		const [nextX, nextZ] = this.nextPosition;
		const [offsetZ, offsetX] = [nextX - x, nextZ - z];
		const groupPosition = [midpoint(x, nextX), y - 0.5, midpoint(z, nextZ)];
		const cubePosition = [x - groupPosition[0], y - groupPosition[1], z - groupPosition[2]];

		this.oldAngle = this.object.rotation.clone();
		this.newAngle = new THREE.Euler(
			this.oldAngle.x + offsetX * Math.PI/2, 
			this.oldAngle.y, 
			this.oldAngle.z + (offsetZ * -1) * Math.PI/2);

		this.object.position.set(...groupPosition);
		this.cube.position.set(...cubePosition);
	}

	endMove() {
		this.nextPosition = null;
		this.progress = 0;

		const position = this.cube.getWorldPosition(new THREE.Vector3());
		this.object.position.set(position.x, position.y, position.z);
		this.object.rotation.set(0, 0, 0);
		this.cube.position.set(0, 0, 0);
	}
}

// FUNCTIONS

function initializeScene() {
	function animate() {
		requestAnimationFrame(() => animate());
		animatedObjects.forEach(object => object.animate());
		renderer.render(scene, camera);
	}
	
	const scene = new THREE.Scene();

	const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
	camera.position.z = 5;

	const renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	new OrbitControls(camera, renderer.domElement);

	addLighting(scene);
	addGrid(scene);
	walkingCube = addWalkingCube(scene);

	document.addEventListener('keydown', onKeyDown);
	animate(renderer, scene, camera);
}

// SCENE BUILDER FUNCTIONS

function addLighting(scene) {
	const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
	directionalLight.position.set(2, 3, 1);
	scene.add(directionalLight);

	const ambientLight = new THREE.AmbientLight(0x222222);
	scene.add(ambientLight);

	scene.background = new THREE.Color(0x222222);

	return [directionalLight, ambientLight];
}

function addGrid(scene) {
	const gridSize = 11;
	const planeSize = 1;
	const colorScale = 1 / 11;

	for (let x = 0; x < gridSize; x++) {
		for (let z = 0; z < gridSize; z++) {
			const geometry = new THREE.PlaneGeometry(planeSize, planeSize);
			const posX = x * planeSize - (gridSize / 2) * planeSize + 0.5;
			const posZ = z * planeSize - (gridSize / 2) * planeSize + 0.5;

			const material = new THREE.MeshBasicMaterial({
				color: new THREE.Color(x * colorScale, 0, z * colorScale),
				side: THREE.DoubleSide,
			});
			const plane = new THREE.Mesh(geometry, material);

			plane.position.set(posX, -0.5, posZ);
			plane.rotation.x = Math.PI / 2;
			scene.add(plane);
		}
	}
}

function addWalkingCube(scene) {
	const geometry = new THREE.BoxGeometry();
	const material = new THREE.MeshPhongMaterial({
		color: 0x00ff00,
		specular: 0xdddddd,
		shininess: 90
	});

	const cube = new THREE.Mesh(geometry, material);
	const group = new THREE.Group();
	group.add(cube);
	scene.add(group);

	return new WalkingCube(group, cube);
}

function midpoint(start, end) {
	return (end - start) / 2 + start;
}

function interpolateAngles(start, end, alpha) {
	return [lerp(start.x, end.x, alpha), 
					lerp(start.y, end.y, alpha), 
					lerp(start.z, end.z, alpha)];
}

function lerp( a, b, alpha ) {
	return a + alpha * ( b - a );
}

// CALLBACKS

function onKeyDown(event) {
	if (!walkingCube || walkingCube.nextPosition) return;
	const [x,,z] = walkingCube.getPosition();
	
	switch (event.key) {
		case 'w':
			walkingCube.nextPosition = [x, z-1];
			break;
		case 's':
			walkingCube.nextPosition = [x, z+1];
			break;
		case 'a':
			walkingCube.nextPosition = [x-1, z];
			break;
		case 'd':
			walkingCube.nextPosition = [x+1, z];
			break;
	}
}

if (WebGL.isWebGLAvailable()) {
	initializeScene();
}