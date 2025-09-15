/**
 * Blue Carbon Credit Calculator Utility
 * Calculates carbon credits from coastal ecosystem restoration projects
 */

/**
 * Converts flux from μmol/m²/h to Mg/ha/yr
 * @param {number} flux - Flux value in μmol/m²/h
 * @param {number} molarMass - Molar mass of the gas
 * @returns {number} Flux in Mg/ha/yr
 */
function fluxToMgHaYr(flux, molarMass) {
  const hoursPerYear = 24 * 365;
  const areaToHa = 10000;
  return flux * 1e-6 * molarMass * hoursPerYear * areaToHa * 1e-6;
}

/**
 * Calculates carbon credits based on blue carbon parameters
 * @param {Object} values - Input parameters for calculation
 * @returns {Object|null} Calculation results or null if incomplete data
 */
export function calculateCarbonCredits(values) {
  const {
    bulk_density,
    depth,
    carbon_percent,
    agb_biomass,
    bgb_biomass,
    carbon_fraction = 0.47,
    ch4_flux,
    n2o_flux,
    baseline_carbon_stock,
    uncertainty_deduction = 0.2,
  } = values;

  // Check if all required fields are present
  if (
    !bulk_density || !depth || !carbon_percent || !agb_biomass || !bgb_biomass ||
    !ch4_flux || !n2o_flux || !baseline_carbon_stock
  ) {
    return null;
  }

  // Parse values to numbers
  const bd = parseFloat(bulk_density);
  const d = parseFloat(depth);
  const cPct = parseFloat(carbon_percent);
  const agb = parseFloat(agb_biomass);
  const bgb = parseFloat(bgb_biomass);
  const cf = parseFloat(carbon_fraction);
  const ch4 = parseFloat(ch4_flux);
  const n2o = parseFloat(n2o_flux);
  const baselineC = parseFloat(baseline_carbon_stock);
  const uncertainty = parseFloat(uncertainty_deduction);

  // Validate parsed values
  if (isNaN(bd) || isNaN(d) || isNaN(cPct) || isNaN(agb) || isNaN(bgb) || 
      isNaN(cf) || isNaN(ch4) || isNaN(n2o) || isNaN(baselineC) || isNaN(uncertainty)) {
    return null;
  }

  try {
    // Calculate Soil Organic Carbon (SOC) stock
    const socStock = bd * d * (cPct / 100) * 10000; // Mg C/ha
    const socCO2e = socStock * 3.67; // Convert to CO2 equivalent

    // Calculate Above Ground Biomass carbon
    const agbCarbon = agb * cf; // Mg C/ha
    const agbCO2e = agbCarbon * 3.67;

    // Calculate Below Ground Biomass carbon
    const bgbCarbon = bgb * cf; // Mg C/ha
    const bgbCO2e = bgbCarbon * 3.67;

    // Calculate GHG emissions
    const ch4MgHaYr = fluxToMgHaYr(ch4, 16.04); // CH4 molar mass
    const n2oMgHaYr = fluxToMgHaYr(n2o, 44.01); // N2O molar mass
    
    // Convert to CO2 equivalent (GWP values)
    const ch4CO2e = ch4MgHaYr * 28; // GWP of CH4 = 28
    const n2oCO2e = n2oMgHaYr * 298; // GWP of N2O = 298
    const totalGHG_CO2e = ch4CO2e + n2oCO2e;

    // Calculate baseline
    const baselineCO2e = baselineC * 3.67;

    // Calculate net carbon sequestration
    const currentTotalCO2e = socCO2e + agbCO2e + bgbCO2e;
    const netStockIncrease = currentTotalCO2e - baselineCO2e;
    
    // Net CO2e after accounting for GHG emissions
    const netCO2e = netStockIncrease - totalGHG_CO2e;
    
    // Apply uncertainty deduction
    const netCO2eAfterUncertainty = netCO2e * (1 - uncertainty);

    // Final carbon credits (ensure non-negative)
    const carbonCredits = Math.max(0, netCO2eAfterUncertainty);

    return {
      // Individual components
      socCO2e: parseFloat(socCO2e.toFixed(2)),
      agbCO2e: parseFloat(agbCO2e.toFixed(2)),
      bgbCO2e: parseFloat(bgbCO2e.toFixed(2)),
      totalGHG_CO2e: parseFloat(totalGHG_CO2e.toFixed(2)),
      
      // Net calculations
      netStockIncrease: parseFloat(netStockIncrease.toFixed(2)),
      netCO2e: parseFloat(netCO2e.toFixed(2)),
      netCO2eAfterUncertainty: parseFloat(netCO2eAfterUncertainty.toFixed(2)),
      
      // Final result
      carbonCredits: parseFloat(carbonCredits.toFixed(2)),
      
      // Additional info
      baselineCO2e: parseFloat(baselineCO2e.toFixed(2)),
      currentTotalCO2e: parseFloat(currentTotalCO2e.toFixed(2)),
      uncertaintyPercentage: uncertainty * 100,
      
      // Calculation breakdown for transparency
      breakdown: {
        soilCarbon: socCO2e,
        abovegroundCarbon: agbCO2e,
        belowgroundCarbon: bgbCO2e,
        methaneEmissions: ch4CO2e,
        nitrousOxideEmissions: n2oCO2e,
        totalEmissions: totalGHG_CO2e,
        baseline: baselineCO2e,
        uncertaintyDeduction: netCO2e * uncertainty
      }
    };
  } catch (error) {
    console.error('Error in carbon credit calculation:', error);
    return null;
  }
}

/**
 * Calculates carbon credits per hectare for a given project area
 * @param {Object} carbonData - Blue carbon parameters from project
 * @param {number} projectArea - Project area in hectares
 * @returns {Object|null} Total carbon credits and per-hectare breakdown
 */
export function calculateProjectCredits(carbonData, projectArea) {
  const perHectareResult = calculateCarbonCredits(carbonData);
  
  if (!perHectareResult || !projectArea || projectArea <= 0) {
    return null;
  }

  const area = parseFloat(projectArea);
  const totalCredits = perHectareResult.carbonCredits * area;

  return {
    ...perHectareResult,
    projectArea: area,
    totalCarbonCredits: parseFloat(totalCredits.toFixed(2)),
    creditsPerHectare: perHectareResult.carbonCredits
  };
}

/**
 * Validates if carbon data is complete for calculation
 * @param {Object} carbonData - Blue carbon parameters
 * @returns {Object} Validation result with missing fields
 */
export function validateCarbonData(carbonData) {
  const requiredFields = [
    'bulk_density',
    'depth', 
    'carbon_percent',
    'agb_biomass',
    'bgb_biomass',
    'ch4_flux',
    'n2o_flux',
    'baseline_carbon_stock'
  ];

  const missingFields = requiredFields.filter(field => 
    !carbonData[field] || carbonData[field] === '' || isNaN(parseFloat(carbonData[field]))
  );

  return {
    isValid: missingFields.length === 0,
    missingFields,
    requiredFields
  };
}

/**
 * Formats carbon credit calculation results for display
 * @param {Object} result - Calculation result from calculateCarbonCredits
 * @returns {Object} Formatted strings for UI display
 */
export function formatCalculationResults(result) {
  if (!result) return null;

  return {
    totalCredits: `${result.totalCarbonCredits || result.carbonCredits} Mg CO₂e`,
    creditsPerHa: `${result.creditsPerHectare || result.carbonCredits} Mg CO₂e/ha`,
    soilCarbon: `${result.socCO2e} Mg CO₂e/ha`,
    biomassCarbon: `${(result.agbCO2e + result.bgbCO2e).toFixed(2)} Mg CO₂e/ha`,
    emissions: `${result.totalGHG_CO2e} Mg CO₂e/ha/yr`,
    netSequestration: `${result.netCO2e} Mg CO₂e/ha`,
    afterUncertainty: `${result.netCO2eAfterUncertainty} Mg CO₂e/ha`
  };
}