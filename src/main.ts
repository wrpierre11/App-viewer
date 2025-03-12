import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui"
import * as CUI from "@thatopen/ui-obc";
import { StatsModule } from "./StatsModule";

// ======================
// 1. INITIALIZATION
// ======================

// Initialize UI Manager
BUI.Manager.init();

// Get the container element
const container = document.getElementById("container");
if (!container) {
  throw new Error("Container element not found");
}

// ======================
// 2. WORLD SETUP
// ======================

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

// Set up scene background color
world.scene.setup();
world.scene.three.background = new THREE.Color(0x000000);

//Add a grid, axes and stats
const grids = components.get(OBC.Grids);
grids.create(world);
const statsModule = new StatsModule();
statsModule.attachToRenderer(world.renderer);

// ======================
// 4. IFC LOADER SETUP
// ======================

// Initialize fragments and IFC loader
const fragments = components.get(OBC.FragmentsManager);
const fragmentIfcLoader = components.get(OBC.IfcLoader);
await fragmentIfcLoader.setup();

fragmentIfcLoader.settings.webIfc.COORDINATE_TO_ORIGIN = true;

// ======================
// 5. LOAD IFC FILE FUNCTION
// ======================

let loadedModel: THREE.Object3D | null = null;

async function loadIfcFromFile(file: File) {
  const data = await file.arrayBuffer();
  const buffer = new Uint8Array(data);
  const model = await fragmentIfcLoader.load(buffer);
  model.name = file.name;
  world.scene.three.add(model);

  loadedModel = model;

  // Process the model to index relationships
  const indexer = components.get(OBC.IfcRelationsIndexer);
  await indexer.process(model);

  // Access the fragments and properties
  const group = Array.from(fragments.groups.values())[0];
  const properties = group.getLocalProperties();

  if (properties) {
    console.log("Properties of the loaded IFC file", properties);
  }
};

// ======================
// 6. FINDER FUNCTION
// ======================

async function findElementsInModel(model: THREE.Object3D, file: File, category: string, property: string) {
  const finder = components.get(OBC.IfcFinder);
  const queryGroup = finder.create();

  // Create a query to find elements by category
  const basicQuery = new OBC.IfcBasicQuery(components, {
    name: "category",
    inclusive: false,
    rules: [],
  });
  queryGroup.add(basicQuery);

  // Rule for query by category
  const categoryRule: OBC.IfcCategoryRule = {
    type: "category",
    value: new RegExp(category, "i"),
  };
  basicQuery.rules.push(categoryRule);

  // Property query
  const propertyRule: OBC.IfcPropertyRule = {
    type: "property",
    name: /.*/,
    value: new RegExp(property, "i"),
  };
  const propertyQuery = new OBC.IfcPropertyQuery(components, {
    name: "property",
    inclusive: false,
    rules: [propertyRule],
  });
  queryGroup.add(propertyQuery);

  // Perform the query
  await queryGroup.update(model.uuid, file);
  const items = queryGroup.items;

  // Hide all elements and show only the queried ones
  const hider = components.get(OBC.Hider);
  hider.set(false);
  hider.set(true, items);
};

// ======================
// 7. PROPERTIES TABLE SETUP
// ======================

const propertiesTable = document.getElementById("properties-table");
const [table, updateTable] = CUI.tables.elementProperties({
  components,
  fragmentIdMap: {},
});
propertiesTable?.appendChild(table);

// ======================
// 8. HIGHLIGHTER SETUP
// ======================

const highlighter = components.get(OBF.Highlighter);
highlighter.setup({ world });
highlighter.events.select.onHighlight.add((fragmentIdMap) => {
  updateTable({ fragmentIdMap });
});
highlighter.events.select.onClear.add(() => {
  updateTable({ fragmentIdMap: {} });
});

// ======================
// 9. FILE INPUT AND BUTTON SETUP
// ======================

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

// ======================
// 10. UPDATE BUTTON SETUP
// ======================

const updateButton = document.getElementById("update-button") as HTMLButtonElement;
const categoryInput = document.getElementById("category-input") as HTMLInputElement;
const propertyInput = document.getElementById("property-input") as HTMLInputElement;

updateButton.addEventListener("click", async () => {
  if (!loadedModel) {
    console.warn("No IFC model is loaded yet.");
    return;
  }

  // Get user inputs for category and property
  const category = categoryInput.value.trim();
  const property = propertyInput.value.trim();

  if (!category || !property) {
    console.warn("Please provide both Category and Property values.");
    return;
  }

  // Perform the finder functionality with user inputs
  await findElementsInModel(loadedModel, fileInput.files![0], category, property);
});
