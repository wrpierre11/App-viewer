import Stats from "stats.js";
import { SimpleRenderer } from "@thatopen/components";

export class StatsModule {
  private stats: Stats;

  constructor() {
    this.stats = new Stats();
    this.stats.showPanel(2); // Show the FPS panel
    document.body.append(this.stats.dom);

    // Position the Stats panel at the left bottom
    this.stats.dom.style.position = "fixed";
    this.stats.dom.style.right = "10px";
    this.stats.dom.style.bottom = "10px";
    this.stats.dom.style.left = "auto";
    this.stats.dom.style.top = "auto";
    this.stats.dom.style.zIndex = "1000";    
  }

  public attachToRenderer(renderer: SimpleRenderer): void {
    renderer.onBeforeUpdate.add(() => this.stats.begin());
    renderer.onAfterUpdate.add(() => this.stats.end());
  }
}