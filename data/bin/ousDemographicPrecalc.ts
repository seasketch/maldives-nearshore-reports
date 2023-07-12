import fs from "fs-extra";
import {
  overlapOusDemographic,
  OusFeatureCollection,
} from "../../src/util/overlapOusDemographic";
import {
  ReportResultBase,
  rekeyMetrics,
  DataClass,
} from "@seasketch/geoprocessing";
import ousShapes from "../dist/ous_all_report_ready.json";
import { MetricGroup } from "@seasketch/geoprocessing/client-core";

const shapes = ousShapes as OusFeatureCollection;

const filename = "ous_all_report_ready.fgb";

const DEST_PATH = "data/bin/ousDemographicPrecalcTotals.json";

const atollDisplay: { [id: string]: string } = {};
atollDisplay["Addu City"] = "Addu City";
atollDisplay["K"] = "Kaafu";
atollDisplay["F"] = "Faafu";
atollDisplay["HDh"] = "Haa Dhaalu";
atollDisplay["N"] = "Noonu";
atollDisplay["R"] = "Raa";
atollDisplay["Sh"] = "Shaviyani";
atollDisplay["AA"] = "Alifu Alifu";
atollDisplay["B"] = "Baa";
atollDisplay["GA"] = "Gaafu Alifu";
atollDisplay["HA"] = "Haa Alifu";
atollDisplay["Lh"] = "Lhaviyani";
atollDisplay["ADh"] = "Alifu Dhaalu";
atollDisplay["M"] = "Meemu";
atollDisplay["Th"] = "Thaa";
atollDisplay["Dh"] = "Dhaalu";
atollDisplay["L"] = "Laamu";
atollDisplay["GDh"] = "Gaafu Dhaalu";
atollDisplay["Gn"] = "Gnaviyani";
atollDisplay["V"] = "Vaavu";

async function main() {
  const overlapResult = await overlapOusDemographic(shapes);

  const result: ReportResultBase = {
    metrics: rekeyMetrics(overlapResult.metrics),
  };

  fs.writeFile(DEST_PATH, JSON.stringify(result, null, 2), (err) =>
    err
      ? console.error("Error", err)
      : console.info(`Successfully wrote ${DEST_PATH}`)
  );

  // New for Azores: moves the below code from config into precalc so full metrics are created
  const ousOverallClasses: DataClass[] = [
    {
      classId: "ousPeopleCount_all",
      display: "Total",
      datasourceId: filename,
      layerId: "",
    },
  ];

  const ousOverallDemographicDataGroup = {
    classes: ousOverallClasses,
  };
  const ousOverallDemographicOverlap: MetricGroup = {
    metricId: "ousOverallDemographicOverlap",
    type: "countOverlap",
    ...ousOverallDemographicDataGroup,
  };

  console.log(JSON.stringify(ousOverallDemographicOverlap), ",");

  const ousSectorClasses: DataClass[] = Object.keys(
    overlapResult.stats.bySector
  ).map(nameToClass);

  const ousSectorDemographicDataGroup = {
    classes: ousSectorClasses,
  };
  const ousSectorDemographicOverlap: MetricGroup = {
    metricId: "ousSectorDemographicOverlap",
    type: "countOverlap",
    ...ousSectorDemographicDataGroup,
  };

  console.log(JSON.stringify(ousSectorDemographicOverlap), ",");

  const ousAtollClasses: DataClass[] = Object.keys(overlapResult.stats.byAtoll)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      classId: name,
      display: atollDisplay[name],
      datasourceId: filename,
      layerId: "",
    }))
    .concat({
      classId: "unknown-atoll",
      display: "Unknown",
      datasourceId: filename,
      layerId: "",
    });
  const ousAtollDemographicDataGroup = {
    classes: ousAtollClasses,
  };
  const ousAtollDemographicOverlap: MetricGroup = {
    metricId: "ousAtollDemographicOverlap",
    type: "countOverlap",
    ...ousAtollDemographicDataGroup,
  };

  console.log(JSON.stringify(ousAtollDemographicOverlap), ",");

  const ousIslandClasses: DataClass[] = Object.keys(
    overlapResult.stats.byIsland
  )
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      classId: name,
      display: name[0].toUpperCase() + name.substring(1),
      datasourceId: filename,
      layerId: "",
    }))
    .concat({
      classId: "unknown-island",
      display: "Unknown",
      datasourceId: filename,
      layerId: "",
    });
  const ousIslandDemographicDataGroup = {
    classes: ousIslandClasses,
  };
  const ousIslandDemographicOverlap: MetricGroup = {
    metricId: "ousIslandDemographicOverlap",
    type: "countOverlap",
    ...ousIslandDemographicDataGroup,
  };

  console.log(JSON.stringify(ousIslandDemographicOverlap), ",");

  const ousGearClasses: DataClass[] = Object.keys(overlapResult.stats.byGear)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      classId: name,
      display: name[0].toUpperCase() + name.substring(1),
      datasourceId: filename,
      layerId: "",
    }));

  const ousGearDemographicDataGroup = {
    classes: ousGearClasses,
  };
  const ousGearDemographicOverlap: MetricGroup = {
    metricId: "ousGearDemographicOverlap",
    type: "countOverlap",
    ...ousGearDemographicDataGroup,
  };

  console.log(JSON.stringify(ousGearDemographicOverlap));
}

main();

function nameToClass(name: string): DataClass {
  return {
    classId: name,
    display: name[0].toUpperCase() + name.substring(1),
    datasourceId: filename,
    layerId: "",
  };
}
