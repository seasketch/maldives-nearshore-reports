/**
 * @jest-environment node
 * @group smoke
 */
import handler, { clipToNearshore } from "./clipToNearshore";
import { polygonPreprocessorSmokeTest } from "@seasketch/geoprocessing/scripts/testing";

polygonPreprocessorSmokeTest(clipToNearshore, handler.options.title, {
  timeout: 20000,
  debug: true,
});
