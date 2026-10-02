const VEHICLE_MEDIA = {
  'fire-engine': 'fire-engine',
  ladder: 'ladder',
  'wildfire-unit': 'wildfire-unit',
  'light-wildfire': 'wildfire-unit',
  'hazmat-unit': 'hazmat-unit',
  'command-unit': 'command-unit',
  tanker: 'tanker',
  'heavy-rescue': 'heavy-rescue',
  'aerial-platform': 'aerial-platform',
  ambulance: 'ambulance',
  vmer: 'vmer',
  siv: 'ambulance',
  umipe: 'vmer',
  tip: 'ambulance',
  'mass-casualty-unit': 'mass-casualty-unit',
  'patient-transport': 'patient-transport',
  'medical-motorcycle': 'medical-motorcycle',
  'medical-helicopter': 'medical-helicopter',
  patrol: 'patrol',
  'canine-unit': 'canine-unit',
  'riot-unit': 'riot-unit',
  'traffic-unit': 'traffic-unit',
  'investigation-unit': 'patrol',
  'prisoner-van': 'prisoner-van',
  'tactical-unit': 'tactical-unit',
};

export const VEHICLE_MEDIA_VERSION = '2026-10-02-2';

export const vehicleImage = vehicleType => `${process.env.PUBLIC_URL}/assets/vehicles/${VEHICLE_MEDIA[vehicleType] || 'patrol'}.webp?v=${VEHICLE_MEDIA_VERSION}`;

export const VehicleThumbnail = ({ unit, className = '' }) => <span className={`vehicle-thumbnail ${className}`} aria-hidden="true">
  <img src={vehicleImage(unit?.vehicle_type)} alt="" draggable="false" decoding="async" onError={event => { event.currentTarget.style.display = 'none'; }} />
</span>;
