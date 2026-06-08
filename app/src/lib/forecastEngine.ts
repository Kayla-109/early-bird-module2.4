/**
 * Multi-Factor Demand Forecast Engine
 * Implements Holt-Winters triple exponential smoothing with
 * seasonal, epidemiological, policy, and promotional factors.
 */

import { dataEngine, type SkuDaily } from './dataEngine';

// Simple LRU-like cache for forecast results
const forecastCache = new Map<string, ForecastResult>();

function getCacheKey(sku_id: string, horizon: number, customerType: string, region: string): string {
  return `${sku_id}|${horizon}|${customerType}|${region}`;
}

export interface ForecastPoint {
  date: string;
  baseline: number;
  seasonalFactor: number;
  epidemicFactor: number;
  policyFactor: number;
  promotionFactor: number;
  finalForecast: number;
  lowerBound: number;
  upperBound: number;
}

export interface ForecastResult {
  sku_id: string;
  category: string;
  horizon: number;
  points: ForecastPoint[];
  totalPredicted: number;
  avgDaily: number;
  confidence: number;
}

interface HWModel {
  level: number;
  trend: number;
  seasonal: number[];
  alpha: number;
  beta: number;
  gamma: number;
  m: number;
  rmse: number;
}

function fitHoltWinters(data: number[], m: number = 7): HWModel {
  const n = data.length;
  if (n < m * 2) {
    // Not enough data for HW, use simple average
    const avg = data.reduce((a, b) => a + b, 0) / n;
    return {
      level: avg,
      trend: 0,
      seasonal: Array(m).fill(1),
      alpha: 0.3,
      beta: 0.1,
      gamma: 0.1,
      m,
      rmse: avg * 0.3,
    };
  }

  // Initial level: average of first season
  let level = 0;
  for (let i = 0; i < m; i++) level += data[i];
  level /= m;

  // Initial trend: average difference between first two seasons
  let trend = 0;
  for (let i = 0; i < m; i++) trend += (data[m + i] - data[i]) / m;
  trend /= m;

  // Initial seasonal indices
  const seasonal: number[] = [];
  for (let i = 0; i < m; i++) {
    seasonal.push(data[i] / level);
  }

  const alpha = 0.3;
  const beta = 0.1;
  const gamma = 0.3;

  // Fit
  let Lt = level;
  let Tt = trend;
  let errors = 0;
  let errCount = 0;

  for (let t = m; t < n; t++) {
    const seasonalIdx = t % m;
    const prevSeasonal = seasonal[seasonalIdx];
    const forecast = (Lt + Tt) * prevSeasonal;
    const obs = data[t];
    const error = obs - forecast;
    errors += error * error;
    errCount++;

    const newLevel = alpha * (obs / prevSeasonal) + (1 - alpha) * (Lt + Tt);
    const newTrend = beta * (newLevel - Lt) + (1 - beta) * Tt;
    const newSeasonal = gamma * (obs / newLevel) + (1 - gamma) * prevSeasonal;

    Lt = newLevel;
    Tt = newTrend;
    seasonal[seasonalIdx] = newSeasonal;
  }

  const rmse = errCount > 0 ? Math.sqrt(errors / errCount) : 1;

  return { level: Lt, trend: Tt, seasonal, alpha, beta, gamma, m, rmse };
}

function predictHW(model: HWModel, steps: number): number[] {
  const predictions: number[] = [];
  for (let h = 1; h <= steps; h++) {
    const seasonalIdx = (model.m - ((h - 1) % model.m) - 1 + model.m) % model.m;
    const pred = (model.level + h * model.trend) * model.seasonal[seasonalIdx];
    predictions.push(Math.max(0, pred));
  }
  return predictions;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getSeasonalFactor(model: HWModel, dayIndex: number): number {
  return model.seasonal[dayIndex % model.m];
}

function getEpidemicFactor(dateStr: string, region: string = 'Sichuan'): number {
  const month = new Date(dateStr).getMonth();
  // Simplified epidemic curve: flu season Nov-Mar boosts demand
  const base = month >= 10 || month <= 2 ? 1.0 + 0.3 * Math.sin((month % 12) / 5 * Math.PI) : 1.0;
  // Add small regional noise (deterministic)
  const regionSeed = region.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const regional = 1.0 + (Math.sin(regionSeed) * 0.1);
  return Math.max(0.7, Math.min(1.5, base * regional));
}

function getPolicyFactor(
  dateStr: string,
  category: string,
  policies: Array<{ effective_date: string; affected_categories: string; demand_shift_hospital: number; demand_shift_pharmacy: number }>,
  customerType: string = 'chain_pharmacy'
): number {
  let factor = 1.0;
  for (const p of policies) {
    if (dateStr >= p.effective_date && p.affected_categories.includes(category)) {
      const isHospital = customerType === 'public_hospital' || customerType === 'primary_healthcare' || customerType === 'clinic';
      const shift = isHospital ? p.demand_shift_hospital : p.demand_shift_pharmacy;
      // Policy effect builds up over 3 months then stabilizes
      const daysSince = (new Date(dateStr).getTime() - new Date(p.effective_date).getTime()) / (86400000);
      const ramp = Math.min(1, daysSince / 90);
      factor *= (1 + (shift - 1) * ramp);
    }
  }
  return factor;
}

function getPromotionFactor(historicalData: SkuDaily[], dateStr: string): number {
  // If historical data shows promotion effect, estimate boost
  const promoDays = historicalData.filter(d => d.promotion_count > 0);
  if (promoDays.length === 0) return 1.0;
  const avgOnPromo = promoDays.reduce((s, d) => s + d.units, 0) / promoDays.length;
  const avgNormal = historicalData.filter(d => d.promotion_count === 0).reduce((s, d) => s + d.units, 0) /
    Math.max(1, historicalData.filter(d => d.promotion_count === 0).length);
  if (avgNormal === 0) return 1.0;
  // Predicted promotion schedule: random promo days
  const daySeed = new Date(dateStr).getDate() + new Date(dateStr).getMonth() * 31;
  const isPromo = Math.sin(daySeed) > 0.85;
  return isPromo ? Math.min(2.0, avgOnPromo / avgNormal) : 1.0;
}

export async function forecastSkuDemand(
  sku_id: string,
  horizon: number = 30,
  customerType: string = 'chain_pharmacy',
  region: string = 'Sichuan'
): Promise<ForecastResult> {
  await dataEngine.init();
  const cacheKey = getCacheKey(sku_id, horizon, customerType, region);
  if (forecastCache.has(cacheKey)) {
    return forecastCache.get(cacheKey)!;
  }

  const product = dataEngine.getProduct(sku_id);
  const category = product?.category || 'Unknown';

  const daily = dataEngine.getSkuDaily(sku_id);
  if (daily.length === 0) {
    return { sku_id, category, horizon, points: [], totalPredicted: 0, avgDaily: 0, confidence: 0 };
  }

  // Sort by date
  daily.sort((a, b) => a.date.localeCompare(b.date));
  const values = daily.map(d => d.units);
  const lastDate = daily[daily.length - 1].date;

  const model = fitHoltWinters(values, 7);
  const baselinePredictions = predictHW(model, horizon);

  const points: ForecastPoint[] = [];
  let totalPredicted = 0;

  for (let h = 0; h < horizon; h++) {
    const date = addDays(lastDate, h + 1);
    const baseline = baselinePredictions[h];
    const seasonal = getSeasonalFactor(model, h);
    const epidemic = getEpidemicFactor(date, region);
    const policy = getPolicyFactor(date, category, dataEngine.policies, customerType);
    const promotion = getPromotionFactor(daily, date);

    const combined = baseline * epidemic * policy * promotion;
    const final = Math.max(0, combined);
    const uncertainty = model.rmse * (1 + h * 0.02);

    points.push({
      date,
      baseline: Math.round(baseline * 100) / 100,
      seasonalFactor: Math.round(seasonal * 100) / 100,
      epidemicFactor: Math.round(epidemic * 100) / 100,
      policyFactor: Math.round(policy * 100) / 100,
      promotionFactor: Math.round(promotion * 100) / 100,
      finalForecast: Math.round(final * 100) / 100,
      lowerBound: Math.round(Math.max(0, final - 1.96 * uncertainty) * 100) / 100,
      upperBound: Math.round((final + 1.96 * uncertainty) * 100) / 100,
    });
    totalPredicted += final;
  }

  const confidence = Math.max(0, Math.min(1, 1 - model.rmse / (model.level + 0.001)));

  const result: ForecastResult = {
    sku_id,
    category,
    horizon,
    points,
    totalPredicted: Math.round(totalPredicted * 100) / 100,
    avgDaily: Math.round((totalPredicted / horizon) * 100) / 100,
    confidence: Math.round(confidence * 1000) / 1000,
  };
  forecastCache.set(cacheKey, result);
  return result;
}

export interface BacktestPoint {
  date: string;
  actual: number;
  predicted: number;
  lowerBound: number;
  upperBound: number;
}

export interface BacktestResult {
  sku_id: string;
  category: string;
  points: BacktestPoint[];
  mape: number;
  rmse: number;
}

export async function backtestSkuDemand(
  sku_id: string,
  backtestDays: number = 30,
  customerType: string = 'chain_pharmacy',
  region: string = 'Sichuan'
): Promise<BacktestResult> {
  await dataEngine.init();
  const product = dataEngine.getProduct(sku_id);
  const category = product?.category || 'Unknown';

  const daily = dataEngine.getSkuDaily(sku_id);
  if (daily.length < backtestDays + 14) {
    return { sku_id, category, points: [], mape: 0, rmse: 0 };
  }

  daily.sort((a, b) => a.date.localeCompare(b.date));

  // Training set: all data except last backtestDays
  const trainData = daily.slice(0, -backtestDays);
  const testData = daily.slice(-backtestDays);

  const trainValues = trainData.map(d => d.units);
  const model = fitHoltWinters(trainValues, 7);
  const predictions = predictHW(model, backtestDays);

  const points: BacktestPoint[] = [];
  let totalError = 0;
  let totalPctError = 0;
  let count = 0;

  for (let i = 0; i < backtestDays; i++) {
    const actual = testData[i].units;
    const date = testData[i].date;

    // Apply multi-factor adjustment like in forecastSkuDemand
    const epidemic = getEpidemicFactor(date, region);
    const policy = getPolicyFactor(date, category, dataEngine.policies, customerType);
    const promotion = getPromotionFactor(trainData, date);

    const baseline = predictions[i];
    const combined = baseline * epidemic * policy * promotion;
    const predicted = Math.max(0, combined);
    const uncertainty = model.rmse * (1 + i * 0.02);

    points.push({
      date: date.slice(5),
      actual,
      predicted: Math.round(predicted * 100) / 100,
      lowerBound: Math.round(Math.max(0, predicted - 1.96 * uncertainty) * 100) / 100,
      upperBound: Math.round((predicted + 1.96 * uncertainty) * 100) / 100,
    });

    totalError += (actual - predicted) ** 2;
    totalPctError += actual > 0 ? Math.abs(actual - predicted) / actual : 0;
    count++;
  }

  const rmse = count > 0 ? Math.sqrt(totalError / count) : 0;
  const mape = count > 0 ? (totalPctError / count) * 100 : 0;

  return {
    sku_id,
    category,
    points,
    rmse: Math.round(rmse * 100) / 100,
    mape: Math.round(mape * 100) / 100,
  };
}

export async function backtestCategoryDemand(
  category: string,
  backtestDays: number = 30,
  customerType: string = 'chain_pharmacy',
  region: string = 'Sichuan'
): Promise<BacktestResult> {
  await dataEngine.init();

  // Aggregate all SKU daily data in this category
  const skus = dataEngine.products.filter(p => p.category === category).map(p => p.sku_id);
  const allDaily: Record<string, { date: string; units: number }> = {};

  for (const sku_id of skus) {
    const daily = dataEngine.getSkuDaily(sku_id);
    for (const d of daily) {
      if (!allDaily[d.date]) allDaily[d.date] = { date: d.date, units: 0 };
      allDaily[d.date].units += d.units;
    }
  }

  const sorted = Object.values(allDaily).sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < backtestDays + 14) {
    return { sku_id: category, category, points: [], mape: 0, rmse: 0 };
  }

  const trainData = sorted.slice(0, -backtestDays);
  const testData = sorted.slice(-backtestDays);

  const trainValues = trainData.map(d => d.units);
  const model = fitHoltWinters(trainValues, 7);
  const predictions = predictHW(model, backtestDays);

  const points: BacktestPoint[] = [];
  let totalError = 0;
  let totalPctError = 0;
  let count = 0;

  for (let i = 0; i < backtestDays; i++) {
    const actual = testData[i].units;
    const date = testData[i].date;

    const epidemic = getEpidemicFactor(date, region);
    const policy = getPolicyFactor(date, category, dataEngine.policies, customerType);

    const baseline = predictions[i];
    const combined = baseline * epidemic * policy;
    const predicted = Math.max(0, combined);
    const uncertainty = model.rmse * (1 + i * 0.02);

    points.push({
      date: date.slice(5),
      actual,
      predicted: Math.round(predicted * 100) / 100,
      lowerBound: Math.round(Math.max(0, predicted - 1.96 * uncertainty) * 100) / 100,
      upperBound: Math.round((predicted + 1.96 * uncertainty) * 100) / 100,
    });

    totalError += (actual - predicted) ** 2;
    totalPctError += actual > 0 ? Math.abs(actual - predicted) / actual : 0;
    count++;
  }

  const rmse = count > 0 ? Math.sqrt(totalError / count) : 0;
  const mape = count > 0 ? (totalPctError / count) * 100 : 0;

  return {
    sku_id: category,
    category,
    points,
    rmse: Math.round(rmse * 100) / 100,
    mape: Math.round(mape * 100) / 100,
  };
}

export async function forecastCategoryDemand(
  category: string,
  horizon: number = 30,
  customerType: string = 'chain_pharmacy',
  region: string = 'Sichuan'
): Promise<ForecastResult> {
  await dataEngine.init();
  const cacheKey = getCacheKey(category, horizon, customerType, region);
  if (forecastCache.has(cacheKey)) {
    return forecastCache.get(cacheKey)!;
  }

  const monthly = dataEngine.categoryMonthly.filter(c => c.category === category);
  monthly.sort((a, b) => a.year_month.localeCompare(b.year_month));

  if (monthly.length === 0) {
    return { sku_id: category, category, horizon, points: [], totalPredicted: 0, avgDaily: 0, confidence: 0 };
  }

  // Aggregate monthly to daily approximation
  const values = monthly.map(m => m.units / 30);
  const lastMonth = monthly[monthly.length - 1].year_month;
  const lastDate = lastMonth + '-28';

  const model = fitHoltWinters(values, 12);
  const baselinePredictions = predictHW(model, Math.ceil(horizon / 30));

  const points: ForecastPoint[] = [];
  let totalPredicted = 0;

  for (let h = 0; h < horizon; h++) {
    const date = addDays(lastDate, h + 1);
    const monthIdx = Math.floor(h / 30);
    const baseline = baselinePredictions[Math.min(monthIdx, baselinePredictions.length - 1)] / 30;
    const seasonal = getSeasonalFactor(model, monthIdx);
    const epidemic = getEpidemicFactor(date, region);
    const policy = getPolicyFactor(date, category, dataEngine.policies, customerType);

    const combined = baseline * epidemic * policy;
    const final = Math.max(0, combined);
    const uncertainty = model.rmse / 30 * (1 + h * 0.02);

    points.push({
      date,
      baseline: Math.round(baseline * 100) / 100,
      seasonalFactor: Math.round(seasonal * 100) / 100,
      epidemicFactor: Math.round(epidemic * 100) / 100,
      policyFactor: Math.round(policy * 100) / 100,
      promotionFactor: 1.0,
      finalForecast: Math.round(final * 100) / 100,
      lowerBound: Math.round(Math.max(0, final - 1.96 * uncertainty) * 100) / 100,
      upperBound: Math.round((final + 1.96 * uncertainty) * 100) / 100,
    });
    totalPredicted += final;
  }

  const confidence = Math.max(0, Math.min(1, 1 - model.rmse / (model.level + 0.001)));

  const result: ForecastResult = {
    sku_id: category,
    category,
    horizon,
    points,
    totalPredicted: Math.round(totalPredicted * 100) / 100,
    avgDaily: Math.round((totalPredicted / horizon) * 100) / 100,
    confidence: Math.round(confidence * 1000) / 1000,
  };
  forecastCache.set(cacheKey, result);
  return result;
}
