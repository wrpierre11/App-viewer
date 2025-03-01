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

const box = new THREE.Box3(new THREE.Vector3(-15, -15, -15), new THREE.Vector3(15, 15, 15));
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

// Getting IFC model a fragments
const fragments = components.get(OBC.FragmentsManager);
const fragmentIfcLoader = components.get(OBC.IfcLoader);
await fragmentIfcLoader.setup();

fragmentIfcLoader.settings.webIfc.COORDINATE_TO_ORIGIN = true;

async function loadIfcFromFile(file: File) {
  const data = await file.arrayBuffer();
  const buffer = new Uint8Array(data);
  const model = await fragmentIfcLoader.load(buffer);
  model.name = file.name;
  world.scene.three.add(model);

  // Process the model to index relationships
  const indexer = components.get(OBC.IfcRelationsIndexer);
  await indexer.process(model);

  // Access the fragments and properties
  const group = Array.from(fragments.groups.values())[0];
  const properties = group.getLocalProperties();

  if (properties) {
    console.log("Properties of the loaded IFC file", properties)};

  // Use the IfcFinder to query specific elements
  const finder = components.get(OBC.IfcFinder);
  const queryGroup = finder.create();

  //Basic query by category
  const basicQuery = new OBC.IfcBasicQuery(components, {
    name: "category",
    inclusive: false,
    rules: [],
  });

  queryGroup.add(basicQuery);
    
  //Filter walls
  const categoryRule: OBC.IfcCategoryRule = {
    type: "category",
    value: /IfcWallStandardCase/,
  };

  basicQuery.rules.push(categoryRule);

  const propertyRule: OBC.IfcPropertyRule = {
    type: "property",
    name: /.*/,
    value: /yeso/,
  };

  const propertyQuery = new OBC.IfcBasicQuery(components, {
    name: "property",
    inclusive: false,
    rules: [propertyRule],
  });

  queryGroup.add(propertyQuery);

  await queryGroup.update(model.uuid, file);
  const items = queryGroup.items;

  const hider = components.get(OBC.Hider);
  hider.set(false);
  hider.set(true, items);

  // Buttons section to the finder
  const categoryInput = document.getElementById("category-input") as BUI.TextInput;
  const propertyInput = document.getElementById("property-input") as BUI.TextInput;
  const updateFinderButton = document.getElementById("update-finder-button") as BUI.Button;
  if (!updateFinderButton) {
    throw new Error("Update Finder Button not found!");
  }

  const updateFinder = async () => {
    basicQuery.clear();
    propertyQuery.clear();
    categoryRule.value = new RegExp(categoryInput.value);
    propertyRule.value = new RegExp(propertyInput.value);
    await queryGroup.update(model.uuid, file);
    const items = queryGroup.items;
    console.log(items);
    if (Object.keys(items).length === 0) {
      alert("No elements found");
      return;
    }
    hider.set(false);
    hider.set(true, items);
  };

  updateFinderButton.addEventListener("click", async () => {
    await updateFinder();
  });
};

fragments.onFragmentsLoaded.add((model) => {
  console.log(model);
});

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