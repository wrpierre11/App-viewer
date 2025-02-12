import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import { IfcLoaderModule } from "./IFCLoader";
import { StatsModule } from "./StatsModule";

const container = document.getElementById("container");
if (!container) {
  throw new Error("Container element not found");
}

// Initialize components and create world
const components = new OBC.Components();
const worlds = components.get(OBC.Worlds);
const world = worlds.create<
  OBC.SimpleScene,
  OBC.OrthoPerspectiveCamera,
  OBC.SimpleRenderer
>();

// Setup the world and initialize components
world.scene = new OBC.SimpleScene(components);
world.renderer = new OBC.SimpleRenderer(components, container);
world.camera = new OBC.OrthoPerspectiveCamera(components);
components.init();

// Set the camera to orthographic and Fit the camera to the box
world.camera.projection.set("Orthographic");
world.camera.set("Plan");
world.camera.controls.setLookAt(0, 1, 0, 0, 0, 0);

const box = new THREE.Box3(new THREE.Vector3(-20, -20, -20), new THREE.Vector3(20, 20, 20));
world.camera.controls.fitToBox(box, false);

//Camera, renderer setup and background color
world.scene.setup();
world.scene.three.background = new THREE.Color(0x000000);

//Add a grid, axes and stats
const grids = components.get(OBC.Grids);
grids.create(world);

const axes = new THREE.AxesHelper(5);
world.scene.three.add(axes);

const statsModule = new StatsModule();
statsModule.attachToRenderer(world.renderer);

// Load a model
const ifcLoaderModule = new IfcLoaderModule(components, world);
await ifcLoaderModule.initialize();

// Highlighter
const highlighter = components.get(OBCF.Highlighter);
highlighter.setup({ world });

// Classifier
const classifier = components.get(OBC.Classifier);
ifcLoaderModule.setupFileInput((loadedModel) => {
  classifier.byEntity(loadedModel);

  const walls = classifier.find({
    entities: ["IFCWALLSTANDARDCASE"],
  });
  console.log(walls);
});