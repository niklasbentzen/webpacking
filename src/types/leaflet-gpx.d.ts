import * as L from "leaflet";

declare module "leaflet" {
  // Define a minimal type for L.GPX so TS doesn't complain
  class GPX extends L.FeatureGroup {
    constructor(url: string, options?: any);
  }
}
