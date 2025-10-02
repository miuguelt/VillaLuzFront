import { routeCoverage } from './routeCoverageReport';

/**
 * Utility to expose backend route coverage as pure JSON for dashboards or diagnostics.
 */
export function getRouteCoverageJSON() {
  try {
    return JSON.parse(JSON.stringify(routeCoverage));
  } catch {
    return [];
  }
}

export default { getRouteCoverageJSON };
