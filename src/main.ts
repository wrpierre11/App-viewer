import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui"
import * as CUI from "@thatopen/ui-obc";
import { StatsModule } from "./StatsModule";

BUI.Manager.init();

// -------------------------
// Initialize App
// -------------------------
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

const box = new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10));
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

// -------------------------
// Declare Global Variables
// -------------------------
let model: OBC.FragmentsGroup | null = null;
let file: File | null = null;

// Initialize Finder and Hider
const finder = components.get(OBC.IfcFinder);
const queryGroup = finder.create();
const hider = components.get(OBC.Hider);

// -------------------------
// Functions
// -------------------------

/**
 * Loads an IFC file and processes it.
 */
async function loadIfcFromFile(selectedFile: File) {
  const data = await selectedFile.arrayBuffer();
  const buffer = new Uint8Array(data);
  model = await fragmentIfcLoader.load(buffer);
  model.name = selectedFile.name;
  world.scene.three.add(model);

  // Process the model to index relationships
  const indexer = components.get(OBC.IfcRelationsIndexer);
  await indexer.process(model);

  // Access the fragments and properties
  const group = Array.from(fragments.groups.values())[0];
  const properties = group.getLocalProperties();

  if (properties) {
    console.log("Properties of the loaded IFC file", properties);
  }
}

/**
 * Updates the finder based on the current category and property inputs.
 */
// Declare a variable to track the current filter step
let currentStep = 0;

async function applyFilterStep() {
  if (!model || !file) {
    console.error("No model or file loaded.");
    return;
  }

  // Clear previous rules
  queryGroup.clear();

  // Get the category and property inputs for the current step
  const categoryInput = document.getElementById(`category-input-${currentStep + 1}`) as BUI.TextInput;
  const propertyInput = document.getElementById(`property-input-${currentStep + 1}`) as BUI.TextInput;

  // Add category rule if category input has a value
  if (categoryInput.value) {
    const categoryRule: OBC.IfcCategoryRule = {
      type: "category",
      value: new RegExp(categoryInput.value, "i"),
    };
    queryGroup.add(new OBC.IfcBasicQuery(components, {
      name: "category",
      inclusive: false,
      rules: [categoryRule],
    }));
    console.log(`Category Rule Applied (Step ${currentStep + 1}):`, categoryRule);
  }

  // Add property rule if property input has a value
  if (propertyInput.value) {
    const propertyRule: OBC.IfcPropertyRule = {
      type: "property",
      name: /.*/, // Match any property name
      value: new RegExp(propertyInput.value, "i"),
    };
    queryGroup.add(new OBC.IfcBasicQuery(components, {
      name: "property",
      inclusive: false,
      rules: [propertyRule],
    }));
    console.log(`Property Rule Applied (Step ${currentStep + 1}):`, propertyRule);
  }

  // Update the query group
  await queryGroup.update(model.uuid, file);
  const items = queryGroup.items;
  console.log(`Query Results (Step ${currentStep + 1}):`, items);

  if (Object.keys(items).length === 0) {
    alert(`No elements found for Step ${currentStep + 1}`);
    hider.set(false);
    return;
  }

  // Hide all elements and show only the filtered ones
  hider.set(false);
  console.log("All elements are visible");

  hider.set(true, items);
  console.log(`Filtered elements are visible for Step ${currentStep + 1}`, items);

  // Move to the next step
  currentStep++;
  if (currentStep >= 5) {
    alert("All filter steps applied.");
    currentStep = 0;
  }
}

/**
 * Resets the view to show the entire model.
 */
function resetView() {
  if (!model) {
    console.error("No model loaded.");
    return;
  }

  // Reset the camera to fit the entire model
  const box = new THREE.Box3().setFromObject(world.scene.three);
  console.log("Bounding Box:", box);
  world.camera.controls.fitToBox(box, true);

  // Reset visibility of all elements
  hider.set(false);
  console.log("All elements are visible.");

  // Clear the category and property input fields
  const categoryInput = document.getElementById("category-input") as BUI.TextInput;
  const propertyInput = document.getElementById("property-input") as BUI.TextInput;

  if (categoryInput && propertyInput) {
    categoryInput.value = "";
    propertyInput.value = "";
  }

  // Clear the query rules
  queryGroup.clear();
  console.log("Query rules cleared.");

  console.log("View reset to show the entire model.");
}

// -------------------------
// Event Listeners
// -------------------------

// Setup file input and button
const fileInput = document.getElementById("file-input") as HTMLInputElement;
const loadIfcButton = document.getElementById("load-ifc-button") as HTMLButtonElement;

loadIfcButton.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", async (event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    file = input.files[0];
    await loadIfcFromFile(file);
  }
});

// Event listener for the Next button
const nextButton = document.getElementById("next-button") as HTMLButtonElement;
nextButton.addEventListener("click", applyFilterStep);

// Reset View Button
const resetViewButton = document.getElementById("reset-view-button") as HTMLButtonElement;
resetViewButton?.addEventListener("click", resetView);

// -------------------------
// Properties Table Setup
// -------------------------
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