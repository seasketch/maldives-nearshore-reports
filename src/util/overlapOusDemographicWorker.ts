import { expose } from "threads/worker";
import {
  OusFeatureProperties,
  OusFeature,
  OusFeatureCollection,
  BaseCountStats,
  ClassCountStats,
  OusStats,
} from "./overlapOusDemographic";
import { featureCollection } from "@turf/helpers";
import intersect from "@turf/intersect";
import {
  clip,
  createMetric,
  Feature,
  Polygon,
  FeatureCollection,
  Metric,
  MultiPolygon,
  Nullable,
  Sketch,
  SketchCollection,
  toSketchArray,
} from "@seasketch/geoprocessing";

/**
  Calculates demographics of ocean use within a sketch

  Weight - includes 0-100 normalized and also unnormalized up to 4500
  Island - one assigned island value per respondent
  Sector - one per respondent, except for bait fishing, which is only/also asked if tuna fishing is selected by respondent
  Gear - one or more per shape (list where each element separated by 3 spaces), answered by respondent per shape
  Number of people - answered once per respondent, gets joined in from respondents csv to each shape.  This means it's answered effectively once per sector, except for bait fishing.

  What this means we can do with the data:
  * number of respondents (unique respondent_id's) is not equal to number of people surveyed.  Someone could respond to the survey multiples times, for a different sector each time
    * The names of the people and their island can be used to better uniquely identify people but also not perfect.  This report doesn't attempt to use names
  * number_of_ppl is therefore also an approximation.
 */
async function overlapOusDemographicWorker(
  /** ous shape polygons */
  shapes: OusFeatureCollection,
  /** optionally calculate stats for OUS shapes that overlap with sketch  */
  sketch?:
    | Sketch<Polygon>
    | SketchCollection<Polygon>
    | Sketch<MultiPolygon>
    | SketchCollection<MultiPolygon>
) {
  
  // combine into multipolygon
  const combinedSketch = (() => {
    if (sketch) {
      const sketches = toSketchArray(
        sketch as Sketch<Polygon> | SketchCollection<Polygon>
      );
      const sketchColl = featureCollection(sketches);
      return sketch ? clip(sketchColl, "union") : null;
    } else {
      return null;
    }
  })();

  // Track counting of respondent/sector level stats, only need to count once
  const respondentProcessed: Record<string, Record<string, boolean>> = {};

  const countStats = shapes.features.reduce<OusStats>(
    (statsSoFar:OusStats, shape:Feature<MultiPolygon | Polygon, OusFeatureProperties>) => {
      if (!shape.properties) {
        console.log(`Shape missing properties ${JSON.stringify(shape)}`);
      }

      if (!shape.properties.resp_id || shape.properties.resp_id === "") {
        console.log(
          `Missing respondent ID for ${JSON.stringify(shape)}, skipping`
        );
        return statsSoFar;
      }

      // Can replace with pre-calculating h3 cell overlap for each shape, using all_touched option, Then get h3 cell overlap for sketch and check for match
      const isOverlapping = combinedSketch
        ? !!intersect(shape, combinedSketch)
        : false; // booleanOverlap seemed to miss some so using intersect
      if (sketch && !isOverlapping) return statsSoFar;

      const resp_id = shape.properties.resp_id;
      const respAtoll = shape.properties.atoll
        ? shape.properties.atoll
        : "unknown-atoll";
      const respIsland = shape.properties.island
        ? `${shape.properties.atoll} - ${shape.properties.island}`
        : "unknown-island";
      const curSector = shape.properties.sector
        ? shape.properties.sector
        : "unknown-sector";
      const curGears = shape.properties.gear
        ? shape.properties.gear.split(/\s{2,}/)
        : ["unknown-gear"];

      // Number of people is gathered once per sector
      // So you can only know the total number of people for each sector, not overall
      const curPeople = (() => {
        const peopleVal = shape.properties["number_of_ppl"];
        if (peopleVal !== null && peopleVal !== undefined) {
          if (typeof peopleVal === "string") {
            return parseFloat(peopleVal);
          } else {
            return peopleVal;
          }
        } else {
          return 1;
        }
      })();

      // Mutates
      let newStats: OusStats = { ...statsSoFar };

      // Once per respondent counts - island / atoll
      if (!respondentProcessed[resp_id]) {
        newStats.people = newStats.people + curPeople;
        newStats.respondents = newStats.respondents + 1;

        newStats.byAtoll[respAtoll] = {
          respondents: newStats.byAtoll[respAtoll]
            ? newStats.byAtoll[respAtoll].respondents + 1
            : 1,
          people: newStats.byAtoll[respAtoll]
            ? newStats.byAtoll[respAtoll].people + curPeople
            : curPeople,
        };
        newStats.byIsland[respIsland] = {
          respondents: newStats.byIsland[respIsland]
            ? newStats.byIsland[respIsland].respondents + 1
            : 1,
          people: newStats.byIsland[respIsland]
            ? newStats.byIsland[respIsland].people + curPeople
            : curPeople,
        };
        respondentProcessed[resp_id] = {};
      }

      // Once per respondent and gear type counts
      curGears.forEach((curGear:string) => {
        if (!respondentProcessed[resp_id][curGear]) {
          newStats.byGear[curGear] = {
            respondents: newStats.byGear[curGear]
              ? newStats.byGear[curGear].respondents + 1
              : 1,
            people: newStats.byGear[curGear]
              ? newStats.byGear[curGear].people + curPeople
              : curPeople,
          };
          respondentProcessed[resp_id][curGear] = true;
        }
      });

      // Once per respondent and sector counts
      if (!respondentProcessed[resp_id][curSector]) {
        newStats.bySector[curSector] = {
          respondents: newStats.bySector[curSector]
            ? newStats.bySector[curSector].respondents + 1
            : 1,
          people: newStats.bySector[curSector]
            ? newStats.bySector[curSector].people + curPeople
            : curPeople,
        };
        respondentProcessed[resp_id][curSector] = true;
      }

      return newStats;
    },
    {
      respondents: 0,
      people: 0,
      bySector: {},
      byAtoll: {},
      byIsland: {},
      byGear: {},
    }
  );

  // calculate sketch % overlap - divide sketch counts by total counts
  const overallMetrics = [
    createMetric({
      metricId: "ousPeopleCount",
      classId: "ousPeopleCount_all",
      value: countStats.people,
      ...(sketch ? { sketchId: sketch.properties.id } : {}),
    }),
    createMetric({
      metricId: "ousRespondentCount",
      classId: "ousRespondentCount_all",
      value: countStats.respondents,
      ...(sketch ? { sketchId: sketch.properties.id } : {}),
    }),
  ];

  const sectorMetrics = genOusClassMetrics(countStats.bySector, sketch);
  const atollMetrics = genOusClassMetrics(countStats.byAtoll, sketch);
  const islandMetrics = genOusClassMetrics(countStats.byIsland, sketch);
  const gearMetrics = genOusClassMetrics(countStats.byGear, sketch);

  return {
    stats: countStats,
    metrics: [
      ...overallMetrics,
      ...sectorMetrics,
      ...atollMetrics,
      ...islandMetrics,
      ...gearMetrics,
    ],
  };
}

export type OverlapOusDemographicWorker = typeof overlapOusDemographicWorker;

expose(overlapOusDemographicWorker);

/** Generate metrics from OUS class stats */
function genOusClassMetrics<G extends Polygon | MultiPolygon>(
  classStats: ClassCountStats,
  /** optionally calculate stats for OUS shapes that overlap with sketch  */
  sketch?:
    | Sketch<Polygon>
    | SketchCollection<Polygon>
    | Sketch<MultiPolygon>
    | SketchCollection<MultiPolygon>
): Metric[] {
  return Object.keys(classStats)
    .map((curClass) => [
      createMetric({
        metricId: "ousPeopleCount",
        classId: curClass,
        value: classStats[curClass].people,
        ...(sketch ? { sketchId: sketch.properties.id } : {}),
      }),
      createMetric({
        metricId: "ousRespondentCount",
        classId: curClass,
        value: classStats[curClass].respondents,
        ...(sketch ? { sketchId: sketch.properties.id } : {}),
      }),
    ])
    .reduce<Metric[]>((soFar, classMetrics) => soFar.concat(classMetrics), []);
}
