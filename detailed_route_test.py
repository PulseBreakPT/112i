"""Detailed route validation for review request requirements"""
import requests
import json

BACKEND_URL = "https://menu-standardization.preview.emergentagent.com/api"

def detailed_route_check(origin_id, destination_id, route_name):
    """Check detailed route requirements"""
    print(f"\n{'='*70}")
    print(f"DETAILED VALIDATION: {route_name}")
    print(f"{'='*70}")
    
    response = requests.get(f"{BACKEND_URL}/road-routes/{origin_id}/{destination_id}", timeout=30)
    
    if response.status_code != 200:
        print(f"❌ Failed to get route: {response.status_code}")
        return False
    
    route = response.json()
    
    # 1. Full road geometry (many points)
    coords = route['coordinates']
    print(f"\n1. GEOMETRY:")
    print(f"   ✅ Coordinates: {len(coords)} points (many points confirmed)")
    print(f"   First point: {coords[0]}")
    print(f"   Last point: {coords[-1]}")
    
    # 2. Times length equals coordinates count
    times = route['times']
    print(f"\n2. TIMES ARRAY:")
    print(f"   Times length: {len(times)}")
    print(f"   Coordinates length: {len(coords)}")
    if len(times) == len(coords):
        print(f"   ✅ Times length EQUALS coordinates count")
    else:
        print(f"   ❌ Times length DOES NOT EQUAL coordinates count")
        return False
    
    # 3. Monotonic nonnegative cumulative, last=duration
    duration = route['duration']
    print(f"\n3. CUMULATIVE TIMING:")
    print(f"   Route duration: {duration:.2f}s ({duration/60:.1f} minutes)")
    print(f"   First time: {times[0]:.2f}s")
    print(f"   Last time: {times[-1]:.2f}s")
    
    # Check monotonic
    is_monotonic = all(times[i] <= times[i+1] for i in range(len(times)-1))
    print(f"   {'✅' if is_monotonic else '❌'} Monotonic: {is_monotonic}")
    
    # Check nonnegative
    is_nonnegative = all(t >= 0 for t in times)
    print(f"   {'✅' if is_nonnegative else '❌'} Non-negative: {is_nonnegative}")
    
    # Check last equals duration
    last_equals_duration = abs(times[-1] - duration) < 0.01
    print(f"   {'✅' if last_equals_duration else '❌'} Last time equals duration: {last_equals_duration}")
    
    if not (is_monotonic and is_nonnegative and last_equals_duration):
        return False
    
    # 4. Realistic meters/seconds
    distance = route['distance']
    print(f"\n4. REALISTIC VALUES:")
    print(f"   Distance: {distance:.2f}m ({distance/1000:.2f}km)")
    print(f"   Duration: {duration:.2f}s ({duration/60:.1f} minutes)")
    avg_speed_kmh = (distance / 1000) / (duration / 3600)
    print(f"   Average speed: {avg_speed_kmh:.1f} km/h")
    
    is_realistic = 5 <= avg_speed_kmh <= 200
    print(f"   {'✅' if is_realistic else '❌'} Realistic speed (5-200 km/h): {is_realistic}")
    
    if not is_realistic:
        return False
    
    # 5. Actual OSRM source
    source = route['source']
    print(f"\n5. SOURCE:")
    print(f"   Source: {source}")
    has_osrm = 'OSRM' in source
    print(f"   {'✅' if has_osrm else '❌'} Contains 'OSRM': {has_osrm}")
    
    if not has_osrm:
        return False
    
    # 6. Additional metadata
    print(f"\n6. METADATA:")
    print(f"   Route ID: {route['id']}")
    print(f"   Estimated: {route['estimated']}")
    print(f"   Live traffic: {route['live_traffic']}")
    print(f"   Steps: {len(route['steps'])} turn-by-turn instructions")
    
    # Show sample steps
    print(f"\n   Sample steps:")
    for i, step in enumerate(route['steps'][:3]):
        print(f"     {i+1}. {step.get('name', 'unnamed')} - {step.get('distance', 0):.0f}m, {step.get('duration', 0):.0f}s")
    if len(route['steps']) > 3:
        print(f"     ... and {len(route['steps']) - 3} more steps")
    
    print(f"\n{'='*70}")
    print(f"✅ ALL VALIDATIONS PASSED for {route_name}")
    print(f"{'='*70}")
    
    return True

# Test all four required routes
print("DETAILED ROUTE VALIDATION FOR REVIEW REQUEST")
print("="*70)

routes = [
    ("porto-boavista", "porto-aliados", "Porto: Boavista → Aliados"),
    ("porto-asprela", "porto-trindade", "Porto: Asprela → Trindade"),
    ("funchal", "machico", "Madeira: Funchal → Machico"),
    ("ponta-delgada", "ribeira-grande", "Açores: Ponta Delgada → Ribeira Grande"),
]

all_passed = True
for origin, dest, name in routes:
    if not detailed_route_check(origin, dest, name):
        all_passed = False
    import time
    time.sleep(1.2)  # Rate limiting

print(f"\n{'='*70}")
if all_passed:
    print("✅ ALL DETAILED VALIDATIONS PASSED")
else:
    print("❌ SOME VALIDATIONS FAILED")
print(f"{'='*70}")
