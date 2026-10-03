import {
  PORTUGAL_ECONOMY,
  capitalQuote,
  vatRateForLand,
  baseUpgradeNet,
  recruitmentCost,
  monthlyEmployerCost,
  weeklyEmployerCost,
  weeklyBuildingFixedCost,
} from './portugalEconomy';

describe('Portuguese real-economy model', () => {
  test('uses 2025-2026 reference-scale capital prices', () => {
    expect(PORTUGAL_ECONOMY.vehicles['wildfire-unit']).toBe(255000);
    expect(PORTUGAL_ECONOMY.vehicles.ladder).toBe(1275000);
    expect(PORTUGAL_ECONOMY.vehicles.ambulance).toBe(92000);
    expect(PORTUGAL_ECONOMY.vehicles.patrol).toBe(38000);
    expect(PORTUGAL_ECONOMY.buildings.fire).toBe(3500000);
    expect(PORTUGAL_ECONOMY.buildings.hospital).toBe(150000000);
  });

  test('applies regional VAT rates separately from base price', () => {
    expect(vatRateForLand('mainland')).toBe(.23);
    expect(vatRateForLand('madeira')).toBe(.22);
    expect(vatRateForLand('sao-miguel')).toBe(.16);
    expect(capitalQuote(100000,'mainland','vehicle')).toMatchObject({
      net:100000,
      vat:23000,
      total:123000,
    });
  });

  test('capital grants preserve real asset values while requiring an own contribution', () => {
    const fireBase=capitalQuote(PORTUGAL_ECONOMY.buildings.fire,'mainland','base');
    const ladder=capitalQuote(PORTUGAL_ECONOMY.vehicles.ladder,'mainland','vehicle');
    expect(fireBase.total).toBe(4305000);
    expect(fireBase.grant).toBeGreaterThan(3500000);
    expect(fireBase.own).toBeGreaterThan(500000);
    expect(ladder.total).toBe(1568250);
    expect(ladder.own).toBeGreaterThan(400000);
  });

  test('recruitment and payroll are meaningful recurring costs', () => {
    expect(recruitmentCost('fire',1,false)).toBe(2500);
    expect(recruitmentCost('medical',1,false)).toBe(1800);
    const monthly=monthlyEmployerCost(PORTUGAL_ECONOMY.salaries.police);
    expect(monthly).toBeGreaterThan(2500);
    expect(weeklyEmployerCost(PORTUGAL_ECONOMY.salaries.police)).toBe(Math.round(monthly*12/52));
  });

  test('building references are converted to a weekly fixed charge only', () => {
    expect(weeklyBuildingFixedCost('fire')).toBe(Math.round(PORTUGAL_ECONOMY.buildings.fire*.035/52));
    expect(weeklyBuildingFixedCost('hospital')).toBe(Math.round(PORTUGAL_ECONOMY.buildings.hospital*.06/52));
    expect(PORTUGAL_ECONOMY.upkeepInterval).toBeUndefined();
  });

  test('base upgrades scale from real construction references', () => {
    expect(baseUpgradeNet({service:'fire',level:1})).toBe(450000);
    expect(baseUpgradeNet({service:'fire',level:3})).toBeGreaterThan(450000);
  });
});
