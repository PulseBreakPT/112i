export const startRoute = (unit,plan,status,destination) => {
  unit.status=status;unit.route=plan.coordinates;unit.route_times=plan.times;unit.travel=0;unit.travel_total=plan.duration;unit.route_distance=plan.distance;unit.destination=destination;unit.lng=plan.coordinates[0][0];unit.lat=plan.coordinates[0][1];unit.x=unit.lng;unit.y=unit.lat;
};

export const locate = unit => {
  const times=unit.route_times||[], points=unit.route||[];
  if(points.length<2||times.length<2)return;
  const elapsed=Math.min(unit.travel,unit.travel_total); let i=0;
  while(i<times.length-2&&times[i+1]<=elapsed)i++;
  const span=times[i+1]-times[i], t=span?Math.max(0,Math.min(1,(elapsed-times[i])/span)):1;
  unit.lng=points[i][0]+(points[i+1][0]-points[i][0])*t; unit.lat=points[i][1]+(points[i+1][1]-points[i][1])*t; unit.x=unit.lng;unit.y=unit.lat;
};

export const returnToBase = (g,unit,startRouteFn=startRoute) => {
  const base=g.bases.find(b=>b.id===unit.base_id);unit.incident_id=null;unit.staging_area_id=null;
  if(unit.road_return_plan){const plan=unit.road_return_plan;unit.road_return_plan=null;startRouteFn(unit,plan,'returning',base.node);return;}
  unit.status='available';unit.node=base.node;unit.lng=base.lng;unit.lat=base.lat;unit.x=base.lng;unit.y=base.lat;unit.route=[];unit.route_times=[];
};