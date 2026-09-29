const VEHICLE_MEDIA = {
  'fire-engine': 'fire-engine',
  ladder: 'ladder',
  'wildfire-unit': 'wildfire-unit',
  'hazmat-unit': 'hazmat-unit',
  'command-unit': 'fire-engine',
  tanker: 'wildfire-unit',
  'heavy-rescue': 'fire-engine',
  'aerial-platform': 'ladder',
  ambulance: 'ambulance',
  vmer: 'vmer',
  'mass-casualty-unit': 'ambulance',
  'patient-transport': 'ambulance',
  'medical-motorcycle': 'medical-motorcycle',
  'medical-helicopter': 'medical-helicopter',
  patrol: 'patrol',
  'canine-unit': 'police-van',
  'riot-unit': 'tactical-unit',
  'traffic-unit': 'traffic-unit',
  'prisoner-van': 'police-van',
  'tactical-unit': 'tactical-unit',
};

export const vehicleImage = vehicleType => `${process.env.PUBLIC_URL}/assets/vehicles/${VEHICLE_MEDIA[vehicleType] || 'patrol'}.webp`;

