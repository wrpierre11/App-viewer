import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import Stats from "stats.js";
import { IfcLoaderModule } from "./IFCLoader";

// Get the container element
const container = document.getElementById("container");
if (!container) {
  throw new Error("Container element not found");
}

// Initialize components
const components = new OBC.Components();

// Create a new world
const worlds = components.get(OBC.Worlds);

const world = worlds.create<
  OBC.SimpleScene,
  OBC.OrthoPerspectiveCamera,
  OBC.SimpleRenderer
>();

// Setup the world
world.scene = new OBC.SimpleScene(components);
world.renderer = new OBC.SimpleRenderer(components, container);
world.camera = new OBC.OrthoPerspectiveCamera(components);

// Initialize components
components.init();

// Set the camera to orthographic
world.camera.projection.set("Orthographic");
world.camera.set("Plan");
world.camera.controls.setLookAt(0, 1, 0, 0, 0, 0);

// Fit the camera to the box
const box = new THREE.Box3(new THREE.Vector3(-20, -20, -20), new THREE.Vector3(20, 20, 20));
world.camera.controls.fitToBox(box, false);


// Set the camera limits
const position = new THREE.Vector3();
world.camera.controls.getPosition(position);
console.log(position);

//Camera, renderer setup and background color
world.scene.setup();
world.scene.three.background = new THREE.Color(0x000000);

//Add a grid
const grids = components.get(OBC.Grids);
grids.create(world);

//Axes
const axes = new THREE.AxesHelper(5);
world.scene.three.add(axes);

// Load a model
const ifcLoaderModule = new IfcLoaderModule(components, world);
await ifcLoaderModule.initialize();
ifcLoaderModule.setupFileInput();

// Highlighter
const highlighter = components.get(OBCF.Highlighter);
highlighter.setup({ world });
highlighter.zoomToSelection = false;

//Access properties
//const propertiesManager = components.get("ifc.properties");

//const elemements = mod

//Stats
const stats = new Stats();
stats.showPanel(2);
document.body.append(stats.dom);
stats.dom.style.left = "0px";
stats.dom.style.zIndex = "unset";
world.renderer.onBeforeUpdate.add(() => stats.begin());
world.renderer.onAfterUpdate.add(() => stats.end());