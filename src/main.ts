import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui"
import * as CUI from "@thatopen/ui-obc";
import { StatsModule } from "./StatsModule";

BUI.Manager.init();

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

// Load IFC model
const fragmentIfcLoader = components.get(OBC.IfcLoader);
await fragmentIfcLoader.setup();

fragmentIfcLoader.settings.webIfc.COORDINATE_TO_ORIGIN = true;

async function loadIfcFromFile(file: File) {
  const data = await file.arrayBuffer();
  const buffer = new Uint8Array(data);
  const model = await fragmentIfcLoader.load(buffer);
  model.name = file.name;
  world.scene.three.add(model);
  const indexer = components.get(OBC.IfcRelationsIndexer);
  await indexer.process(model);
}

// Setup file input and button
const fileInput = document.getElementById("file-input") as HTMLInputElement;
const loadIfcButton = document.getElementById("load-ifc-button") as HTMLButtonElement;

loadIfcButton.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", async (event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    await loadIfcFromFile(input.files[0]);
  }
});

//Properties table setup
const propertiesTable = document.getElementById("properties-table");
const [table, updateTable] = CUI.tables.elementProperties({
  components,
  fragmentIdMap: {},
});

propertiesTable?.appendChild(table);

const highlighter = components.get(OBF.Highlighter);
highlighter.setup({ world });

highlighter.events.select.onHighlight.add((fragmentIdMap) => {
  updateTable({ fragmentIdMap });
});

highlighter.events.select.onClear.add(() => {
  updateTable({ fragmentIdMap: {} });
});