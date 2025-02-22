import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createNodes, createEdgeDefinitions, dataFiles, loadNetworkData } from './data.js';
import { Node } from './objects/Node.js';
import { Edge } from './objects/Edge.js';
import { EventManager } from './src/core/EventManager.js';
import { StateManager } from './src/core/StateManager.js';
import { UIManager } from './src/core/UIManager.js';
import { GlowEffect } from './src/effects/GlowEffect.js';
import { HighlightManager } from './src/effects/HighlightManager.js';
import { RaycastManager } from './src/utils/RaycastManager.js';
import { Rollover } from './rollover.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf5f5dc); // Beige background

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 15, 15);
camera.lookAt(0, 0, 0);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Ground plane for shadows
const groundGeometry = new THREE.PlaneGeometry(40, 40);
const groundMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xfefeee,
    side: THREE.DoubleSide
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.81;
ground.receiveShadow = true;
scene.add(ground);

// Grid helper
const gridHelper = new THREE.GridHelper(20, 20, 0xffa500, 0xffa500);
scene.add(gridHelper);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(10, 10, 10);
directionalLight.castShadow = true;

// Optimierte Schatten-Einstellungen
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;

scene.add(directionalLight);

// Netzwerk-Verwaltung
let currentNodes = [];
let currentEdges = [];

function clearNetwork() {
    currentNodes.forEach(node => {
        scene.remove(node.mesh);
        node.mesh.geometry.dispose();
        node.mesh.material.dispose();
    });
    currentNodes = [];

    currentEdges.forEach(edge => {
        scene.remove(edge.line);
        edge.line.geometry.dispose();
        edge.line.material.dispose();
    });
    currentEdges = [];
}

async function loadNetwork(filename) {
    console.log("Loading network:", filename);
    clearNetwork();

    // Lade und erstelle neue Knoten mit verschiedenen Formen
    const nodePositions = await createNodes(filename);
    console.log("Nodes loaded:", nodePositions);
    currentNodes = nodePositions.map(pos => {
        const node = new Node(pos, {
            type: 'cube',
            size: 1.2,
            color: 0xff4500
        });
        node.mesh.name = pos.name;
        scene.add(node.mesh);
        return node;
    });

    // Lade und erstelle neue Kanten mit verschiedenen Stilen
    const edgeDefinitions = await createEdgeDefinitions(filename, currentNodes);
    if (edgeDefinitions) {
        currentEdges = edgeDefinitions.map((def) => {
            const edge = new Edge(def.start, def.end, {
                style: ['solid', 'dashed', 'dotted'][Math.floor(Math.random() * 3)],
                color: [0x0000ff, 0x00ff00, 0xff0000][Math.floor(Math.random() * 3)],
                width: 3,
                curveHeight: def.offset + 2,
                offset: def.offset,
            });
            edge.line.name = def.name;
            scene.add(edge.line);
            return edge;
        });
    }

    let xAxis = "unbekannt";
    let yAxis = "unbekannt";
    let zAxis = "unbekannt";

    if (filename === "architektur.json") {
        xAxis = "Fortschreitender Ladevorgang";
        yAxis = "Art der Komponente";
        zAxis = "Tiefe";
    }

    updateFileInfoPanel(filename, nodePositions.length, edgeDefinitions ? edgeDefinitions.length : 0, xAxis, yAxis, zAxis);
}

function updateFileInfoPanel(filename, nodeCount, edgeCount, xAxis, yAxis, zAxis) {
    document.getElementById('fileFilename').textContent = `Dateiname: ${filename}`;
    document.getElementById('fileNodeCount').textContent = `Anzahl Knoten: ${nodeCount}`;
    document.getElementById('fileEdgeCount').textContent = `Anzahl Kanten: ${edgeCount}`;
    document.getElementById('fileXAxis').textContent = `X-Achse: ${xAxis}`;
    document.getElementById('fileYAxis').textContent = `Y-Achse: ${yAxis}`;
    document.getElementById('fileZAxis').textContent = `Z-Achse: ${zAxis}`;
}

// Initialisiere Manager
const stateManager = new StateManager();
const eventManager = new EventManager();
const uiManager = new UIManager(stateManager);
const glowEffect = new GlowEffect();
const highlightManager = new HighlightManager(stateManager, glowEffect);
const raycastManager = new RaycastManager(camera, scene, renderer);

// Initialisiere Rollover
const rollover = new Rollover(camera, scene, renderer);
 
// Initialisiere Event-System
eventManager.init(camera, scene, renderer);

// Starte Animation-Loop des StateManagers
stateManager.animate();

// Button Event-Handler
document.getElementById('smallData').addEventListener('click', () => loadNetwork(dataFiles.small));
document.getElementById('mediumData').addEventListener('click', () => loadNetwork(dataFiles.medium));
document.getElementById('largeData').addEventListener('click', () => loadNetwork(dataFiles.large));
document.getElementById('megaData').addEventListener('click', () => loadNetwork(dataFiles.mega));
document.getElementById('miniData').addEventListener('click', () => loadNetwork(dataFiles.mini));
document.getElementById('familyData').addEventListener('click', () => loadNetwork(dataFiles.family));
document.getElementById('julioIglesias').addEventListener('click', () => loadNetwork(dataFiles.julioIglesias));
document.getElementById('architektur').addEventListener('click', () => loadNetwork(dataFiles.architektur));

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// Window resize handler
window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Lade initial das kleine Netzwerk
loadNetwork(dataFiles.small);
