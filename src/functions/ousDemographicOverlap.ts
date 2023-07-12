import {
  Sketch,
  GeoprocessingHandler,
  Polygon,
  ReportResult,
  SketchCollection,
  toNullSketch,
  rekeyMetrics,
} from "@seasketch/geoprocessing";
import { fgbFetchAll } from "@seasketch/geoprocessing/dataproviders";
import bbox from "@turf/bbox";
import {
  OusFeature,
  overlapOusDemographic,
} from "../util/overlapOusDemographic";
import { featureCollection } from "@turf/helpers";
import project from "../../project";

const METRIC = project.getMetricGroup("ousSectorDemographicOverlap");

/** Calculate sketch area overlap inside and outside of multiple planning area boundaries */
export async function ousDemographicOverlap(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>
): Promise<ReportResult> {
  const box = sketch.bbox || bbox(sketch);
  const url = `${project.dataBucketUrl()}ous_all_report_ready.fgb`;

  // Fetch the whole nearshore boundary, because we need to calculate its total area
  const shapes = await fgbFetchAll<OusFeature>(url, project.basic.bbox);

  const metrics = (
    await overlapOusDemographic(featureCollection(shapes), sketch)
  ).metrics;

  return {
    metrics: rekeyMetrics(metrics),
    sketch: toNullSketch(sketch, true),
  };
}

export default new GeoprocessingHandler(ousDemographicOverlap, {
  title: "ousDemographicOverlap",
  description: "Calculates ous overlap metrics",
  timeout: 900, // seconds
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  memory: 10240,
  requiresProperties: [],
});
