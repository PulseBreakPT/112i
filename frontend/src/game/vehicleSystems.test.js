import { VEHICLE_CATALOG } from './progression';
import { adjustedRoutePlan, fuelPercentForDistance, maintenanceQuote, normalizeVehicleUnit, resaleValue, vehicleRatings } from './vehicleSystems';

test('every catalog vehicle exposes the operational vehicle schema', () => {
  Object.values(VEHICLE_CATALOG).flat().forEach(vehicle => {
    expect(vehicle.vehicle_class).toBeTruthy();
    expect(vehicle.speed_multiplier).toBeGreaterThan(0);
    expect(vehicle.acceleration).toBeGreaterThan(0);
    expect(vehicle.maneuverability).toBeGreaterThan(0);
    expect(vehicle.reliability).toBeGreaterThan(0);
    expect(vehicle.fuel_capacity_l).toBeGreaterThan(0);
    expect(vehicle.fuel_consumption_l_100km).toBeGreaterThan(0);
    expect(vehicle.resource_capacity.fuel).toBe(100);
    expect(Array.isArray(vehicle.capabilities)).toBe(true);
    expect(Array.isArray(vehicle.equipment)).toBe(true);
  });
});

test('vehicle performance changes the real route duration', () => {
  const vmer=normalizeVehicleUnit({service:'medical'},VEHICLE_CATALOG.medical.find(v=>v.id==='vmer'),0);
  const pma=normalizeVehicleUnit({service:'medical'},VEHICLE_CATALOG.medical.find(v=>v.id==='mass-casualty-unit'),0);
  const plan={coordinates:[[0,0],[1,1]],times:[0,120],duration:120,distance:5000};
  expect(adjustedRoutePlan(vmer,plan,'enroute').duration).toBeLessThan(adjustedRoutePlan(pma,plan,'enroute').duration);
});

test('fuel burn reflects each model capacity and consumption', () => {
  const tanker=normalizeVehicleUnit({service:'fire'},VEHICLE_CATALOG.fire.find(v=>v.id==='tanker'),0);
  const patrol=normalizeVehicleUnit({service:'police'},VEHICLE_CATALOG.police.find(v=>v.id==='patrol'),0);
  expect(fuelPercentForDistance(tanker,100000)).toBeGreaterThan(0);
  expect(fuelPercentForDistance(patrol,100000)).toBeGreaterThan(0);
  expect(fuelPercentForDistance(tanker,100000)).not.toBe(fuelPercentForDistance(patrol,100000));
});

test('maintenance gets more expensive as condition and wear worsen', () => {
  const def=VEHICLE_CATALOG.fire[0];
  const healthy=normalizeVehicleUnit({service:'fire',condition:95,wear:3},def,0);
  const worn=normalizeVehicleUnit({service:'fire',condition:45,wear:65,maintenance_due:true,mileage_km:7000,next_maintenance_km:5000},def,0);
  expect(maintenanceQuote(worn,def).cost).toBeGreaterThan(maintenanceQuote(healthy,def).cost);
});

test('ratings are calculated and resale falls with ageing and wear', () => {
  const def=VEHICLE_CATALOG.medical.find(v=>v.id==='ambulance');
  const fresh=normalizeVehicleUnit({service:'medical'},def,0);
  const old=normalizeVehicleUnit({service:'medical',condition:55,wear:70,mileage_km:140000},def,0);
  const ratings=vehicleRatings(fresh,def);
  expect(Object.values(ratings).every(value=>value>=0&&value<=100)).toBe(true);
  expect(resaleValue(old,def,86400*500)).toBeLessThan(resaleValue(fresh,def,0));
});
