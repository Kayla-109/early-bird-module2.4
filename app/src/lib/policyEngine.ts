/**
 * Policy Impact Simulation Engine
 */

import { dataEngine } from './dataEngine';

export interface PolicyScenario {
  policy_id: string;
  name: string;
  name_en: string;
  effective_date: string;
  affected_categories: string[];
  price_cut_pct: number;
  demand_shift_hospital: number;
  demand_shift_pharmacy: number;
}

export interface PolicyImpactResult {
  category: string;
  baseline_revenue: number;
  baseline_units: number;
  simulated_revenue: number;
  simulated_units: number;
  revenue_change_pct: number;
  units_change_pct: number;
  hospital_impact: number;
  pharmacy_impact: number;
  monthly_series: {
    month: string;
    baseline_units: number;
    simulated_units: number;
    baseline_revenue: number;
    simulated_revenue: number;
  }[];
}

export async function simulatePolicyImpact(
  scenario: PolicyScenario,
  monthsAhead: number = 12
): Promise<PolicyImpactResult[]> {
  await dataEngine.init();

  const results: PolicyImpactResult[] = [];
  const categories = scenario.affected_categories.length > 0
    ? scenario.affected_categories
    : dataEngine.getCategories();

  for (const category of categories) {
    const monthly = dataEngine.categoryMonthly
      .filter(c => c.category === category)
      .sort((a, b) => a.year_month.localeCompare(b.year_month));

    if (monthly.length === 0) continue;

    // Use last 6 months average as baseline
    const recent = monthly.slice(-6);
    const avgMonthlyUnits = recent.reduce((s, m) => s + m.units, 0) / recent.length;
    const avgMonthlyRevenue = recent.reduce((s, m) => s + m.revenue, 0) / recent.length;
    const avgPrice = avgMonthlyRevenue / avgMonthlyUnits;

    const newPrice = avgPrice * (1 - scenario.price_cut_pct);

    // Simulate monthly forward
    const monthlySeries: PolicyImpactResult['monthly_series'] = [];
    let totalBaselineUnits = 0;
    let totalSimulatedUnits = 0;
    let totalBaselineRevenue = 0;
    let totalSimulatedRevenue = 0;

    const lastMonth = monthly[monthly.length - 1].year_month;
    const [lastYear, lastMonthNum] = lastMonth.split('-').map(Number);

    for (let i = 1; i <= monthsAhead; i++) {
      let y = lastYear;
      let m = lastMonthNum + i;
      while (m > 12) { m -= 12; y += 1; }
      const monthStr = `${y}-${String(m).padStart(2, '0')}`;

      // Seasonal adjustment based on historical pattern
      const histMonth = monthly.find(h => h.year_month.endsWith(`-${String(m).padStart(2, '0')}`));
      const seasonalFactor = histMonth ? (histMonth.units / avgMonthlyUnits) : 1.0;

      // Policy ramp-up effect (full effect after 3 months)
      const ramp = Math.min(1, i / 3);

      // Price elasticity: roughly -0.8 for pharma (demand increases as price drops, but less than proportionally)
      const priceElasticity = -0.8;
      const priceEffect = Math.pow(1 - scenario.price_cut_pct, priceElasticity);

      // Hospital vs pharmacy split (approximate from customer type data)
      const hospitalShare = 0.45;
      const pharmacyShare = 0.55;
      const hospitalShift = 1 + (scenario.demand_shift_hospital - 1) * ramp;
      const pharmacyShift = 1 + (scenario.demand_shift_pharmacy - 1) * ramp;
      const demandShift = hospitalShare * hospitalShift + pharmacyShare * pharmacyShift;

      const baselineUnits = avgMonthlyUnits * seasonalFactor;
      const simulatedUnits = baselineUnits * priceEffect * demandShift;
      const baselineRevenue = baselineUnits * avgPrice;
      const simulatedRevenue = simulatedUnits * newPrice;

      monthlySeries.push({
        month: monthStr,
        baseline_units: Math.round(baselineUnits),
        simulated_units: Math.round(simulatedUnits),
        baseline_revenue: Math.round(baselineRevenue * 100) / 100,
        simulated_revenue: Math.round(simulatedRevenue * 100) / 100,
      });

      totalBaselineUnits += baselineUnits;
      totalSimulatedUnits += simulatedUnits;
      totalBaselineRevenue += baselineRevenue;
      totalSimulatedRevenue += simulatedRevenue;
    }

    results.push({
      category,
      baseline_revenue: Math.round(totalBaselineRevenue * 100) / 100,
      baseline_units: Math.round(totalBaselineUnits),
      simulated_revenue: Math.round(totalSimulatedRevenue * 100) / 100,
      simulated_units: Math.round(totalSimulatedUnits),
      revenue_change_pct: Math.round(((totalSimulatedRevenue - totalBaselineRevenue) / totalBaselineRevenue) * 1000) / 10,
      units_change_pct: Math.round(((totalSimulatedUnits - totalBaselineUnits) / totalBaselineUnits) * 1000) / 10,
      hospital_impact: Math.round((scenario.demand_shift_hospital - 1) * 1000) / 10,
      pharmacy_impact: Math.round((scenario.demand_shift_pharmacy - 1) * 1000) / 10,
      monthly_series: monthlySeries,
    });
  }

  return results;
}

export function getDefaultScenarios(): PolicyScenario[] {
  return [
    {
      policy_id: 'vbp_2025',
      name: '第七批国家集采',
      name_en: '7th VBP Procurement',
      effective_date: '2025-07-01',
      affected_categories: ['Western_Medicine'],
      price_cut_pct: 0.51,
      demand_shift_hospital: 1.35,
      demand_shift_pharmacy: 0.75,
    },
    {
      policy_id: 'nrdl_2024',
      name: '2024医保目录调整',
      name_en: '2024 NRDL Update',
      effective_date: '2025-01-01',
      affected_categories: ['Western_Medicine', 'TCM'],
      price_cut_pct: 0.15,
      demand_shift_hospital: 1.15,
      demand_shift_pharmacy: 1.10,
    },
    {
      policy_id: 'drg_2025',
      name: 'DRG/DIP全面推广',
      name_en: 'DRG/DIP Expansion',
      effective_date: '2025-04-01',
      affected_categories: ['Western_Medicine', 'Medical_Devices'],
      price_cut_pct: 0.08,
      demand_shift_hospital: 0.95,
      demand_shift_pharmacy: 1.20,
    },
  ];
}
