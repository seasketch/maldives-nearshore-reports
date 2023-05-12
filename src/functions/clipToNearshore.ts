import {
  PreprocessingHandler,
  genPreprocessor,
} from "@seasketch/geoprocessing";
import project from "../../project";
import { genClipLoader } from "@seasketch/geoprocessing/dataproviders";

const clipLoader = genClipLoader(project, [
  {
    datasourceId: "global-clipping-osm-land",
    operation: "difference",
    options: {
      unionProperty: "gid",
    },
  },
  {
    datasourceId: "nearshore_boundary",
    operation: "intersection",
    options: {},
  },
]);

export const clipToNearshore = genPreprocessor(clipLoader);

export default new PreprocessingHandler(clipToNearshore, {
  title: "clipToNearshore",
  description: "Example-description",
  timeout: 40,
  requiresProperties: [],
  memory: 4096,
});
