import React from "react";
import { SizeCard } from "./SizeCard";
import { SketchAttributesCard } from "@seasketch/geoprocessing/client-ui";
import { OusDemographics } from "./OusDemographic";

const ReportPage = () => {
  return (
    <>
      <SizeCard />
      <OusDemographics />
      <SketchAttributesCard autoHide />
    </>
  );
};

export default ReportPage;
