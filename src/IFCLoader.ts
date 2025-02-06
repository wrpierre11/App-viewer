import * as OBC from "@thatopen/components";

export class IfcLoaderModule {
  components: OBC.Components;
  world: OBC.SimpleWorld<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBC.SimpleRenderer>;
  fragments: OBC.FragmentsManager;
  fragmentIfcLoader: OBC.IfcLoader;
  
  constructor(
    components: OBC.Components, 
    world: OBC.SimpleWorld<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBC.SimpleRenderer>) {
    this.components = components;
    this.world = world;
    this.fragments = components.get(OBC.FragmentsManager);
    this.fragmentIfcLoader = components.get(OBC.IfcLoader);
  }

  async initialize() {
    await this.fragmentIfcLoader.setup();
    this.fragmentIfcLoader.settings.webIfc.COORDINATE_TO_ORIGIN = true;
  }

  async loadIfcFromFile(file: File) {
    const data = await file.arrayBuffer(); // Read the file's contents as an ArrayBuffer
    const buffer = new Uint8Array(data); // Convert the ArrayBuffer to a Uint8Array
    const model = await this.fragmentIfcLoader.load(buffer); // Load the IFC model from the buffer
    (model as any).name = file.name; // Set the model's name to the file's name
    this.world.scene.three.add(model);
  }

  setupFileInput() {
    // Create a hidden file input element
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".ifc";
    fileInput.style.display = "none";

    // Add an event listener for file selection
    fileInput.addEventListener("change", async (event) => {
      const input = event.target as HTMLInputElement;
      if (input && input.files && input.files[0]) {
        // Load the selected IFC file
        await this.loadIfcFromFile(input.files[0]);
      }
    });

    // Create a button to trigger the upload
    const button = document.createElement("button");
    button.textContent = "Load IFC";
    button.style.cursor = "pointer";
    button.style.margin = "10px";
    button.style.color = "red";
    button.addEventListener("click", () => {
      fileInput.click();
    });
    document.body.appendChild(button);
  }
}