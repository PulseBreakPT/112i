export const facilityOccupancy = (g,facility) => facility.type==='hospital'
  ? (g.patients||[]).filter(p=>(p.hospital_id===facility.id&&['transporting','admitted'].includes(p.status))||(p.reserved_hospital_id===facility.id&&['transfer_scheduled','transfer_transporting'].includes(p.status))).length
    + Math.max(0,Number(facility.external_occupancy)||0)
  : (g.prisoners||[]).filter(p=>p.prison_id===facility.id&&['transporting','detained'].includes(p.status)).length;

export const hospitalSpecialtyCapacity = (facility,specialty) => facility.type!=='hospital'
  ? 0
  : (facility.specialty_status?.[specialty]==='limited'?Math.max(1,Math.floor((facility.specialty_capacity?.[specialty]||0)*.5)):(facility.specialty_capacity?.[specialty]||0))
    +(specialty==='urgency'?facility.capacity:0);

export const hospitalSpecialtyOccupancy = (g,facility,specialty) => (g.patients||[]).filter(patient=>
  ((patient.hospital_id===facility.id&&['transporting','admitted'].includes(patient.status))||(patient.reserved_hospital_id===facility.id&&['transfer_scheduled','transfer_transporting'].includes(patient.status)))&&
  (patient.specialty===specialty||specialty==='urgency')
).length + (specialty==='urgency'?Math.max(0,Number(facility.external_occupancy)||0):0);

export const hospitalCanReceive = (g,facility,patient,operationalFacility) =>
  facility?.type==='hospital'&&
  operationalFacility(g,facility)&&
  facility.enabled!==false&&
  facility.diversion!==true&&
  facility.manual_diversion!==true&&
  facilityOccupancy(g,facility)<Math.min((facility.capacity||0)+(facility.network_capacity_bonus||0),(facility.queue_limit||facility.capacity||0)+(facility.network_capacity_bonus||0))&&
  facility.specialty_status?.[patient.specialty]!=='closed'&&
  (hospitalSpecialtyCapacity(facility,patient.specialty)>hospitalSpecialtyOccupancy(g,facility,patient.specialty)||(facility.specialties||[]).includes('urgency'));
