import Stats from "stats.js";
import { SimpleRenderer } from "@thatopen/components";

export class StatsModule {
  private stats: Stats;

  constructor() {
    this.stats = new Stats();
    this.stats.showPanel(2); // Show the FPS panel
    document.body.append(this.stats.dom);
    this.stats.dom.style.left = "auto";
    this.stats.dom.style.right = "0px";
    this.stats.dom.style.zIndex = "unset";
  }

  public attachToRenderer(renderer: SimpleRenderer): void {
    renderer.onBeforeUpdate.add(() => this.stats.begin());
    renderer.onAfterUpdate.add(() => this.stats.end());
  }
}