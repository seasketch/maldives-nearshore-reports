import fs from "fs-extra";
import { OusFeatureProperties } from "../../src/util/overlapOusDemographic";
import { FeatureCollection, Polygon } from "@seasketch/geoprocessing";

// Assumes already done:
// join spatial and tabular data
// remove extraneous fields or those uniquely identifying people

const shapeFc = fs.readJSONSync(
  "./data/src/Analytics/ous_all_report_ready.geojson"
) as FeatureCollection<Polygon, OusFeatureProperties>;

// sort by respondent_id (string)
const sortedShapes = shapeFc.features.sort((a, b) =>
  a.properties.resp_id.localeCompare(b.properties.resp_id)
);
fs.writeFileSync(
  "./data/src/Analytics/ous_all_report_ready_sorted.geojson",
  JSON.stringify({ ...shapeFc, features: sortedShapes })
);
