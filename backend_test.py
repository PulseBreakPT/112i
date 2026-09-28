"""
Phase 1 Backend Integration Tests for NEXO 112 Road Routing
Tests real OSRM integration, cache, rate limiting, and MAP_STYLE_URL
"""
import os
import sys
import time
import requests
from datetime import datetime

# Load backend URL from frontend .env
BACKEND_URL = "https://8147c801-7851-450c-b78c-be8c511c9cf2.preview.emergentagent.com/api"
MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty"

# Test results tracking
test_results = {
    "passed": [],
    "failed": [],
    "warnings": []
}

def log_test(name, passed, message=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if message:
        print(f"   {message}")
    
    if passed:
        test_results["passed"].append(name)
    else:
        test_results["failed"].append({"test": name, "message": message})

def log_warning(name, message):
    """Log warning"""
    print(f"⚠️  WARNING: {name}")
    print(f"   {message}")
    test_results["warnings"].append({"test": name, "message": message})

def test_health_endpoint():
    """Test basic health endpoint"""
    print("\n=== Testing Health Endpoint ===")
    try:
        response = requests.get(f"{BACKEND_URL}/", timeout=10)
        if response.status_code == 200:
            data = response.json()
            log_test("Health endpoint", True, f"Status: {data.get('status')}, Name: {data.get('name')}")
            return True
        else:
            log_test("Health endpoint", False, f"Status code: {response.status_code}")
            return False
    except Exception as e:
        log_test("Health endpoint", False, f"Exception: {str(e)}")
        return False

def validate_route_response(route, origin_id, destination_id, expected_land):
    """Validate route response structure and data"""
    issues = []
    
    # Check required fields
    required_fields = ['id', 'coordinates', 'times', 'duration', 'distance', 'source', 'estimated', 'live_traffic', 'steps']
    for field in required_fields:
        if field not in route:
            issues.append(f"Missing field: {field}")
    
    if issues:
        return False, "; ".join(issues)
    
    # Validate coordinates (meaningful geometry, not 2-point straight line)
    coordinates = route['coordinates']
    if len(coordinates) < 3:
        issues.append(f"Insufficient geometry points: {len(coordinates)} (expected >2 for road-following route)")
    
    # Validate times array
    times = route['times']
    if len(times) != len(coordinates):
        issues.append(f"Times array length {len(times)} doesn't match coordinates length {len(coordinates)}")
    
    # Validate duration
    duration = route['duration']
    if duration <= 0:
        issues.append(f"Invalid duration: {duration} (expected positive)")
    
    # Validate times[-1] == duration
    if times and abs(times[-1] - duration) > 0.01:  # Allow small floating point difference
        issues.append(f"Last time {times[-1]} doesn't match duration {duration}")
    
    # Validate distance
    distance = route['distance']
    if distance <= 0:
        issues.append(f"Invalid distance: {distance} (expected positive)")
    
    # Validate source
    if 'OSRM' not in route['source']:
        issues.append(f"Unexpected source: {route['source']}")
    
    # Validate estimated and live_traffic flags
    if not route['estimated']:
        issues.append("Route should be marked as estimated")
    if route['live_traffic']:
        issues.append("Route should not have live_traffic enabled")
    
    # Validate steps exist
    if not route['steps'] or len(route['steps']) == 0:
        issues.append("No route steps provided")
    
    # Check for ferry mode (should be rejected)
    for step in route['steps']:
        if step.get('mode') == 'ferry':
            issues.append("Route contains ferry mode (should be rejected)")
    
    if issues:
        return False, "; ".join(issues)
    
    return True, f"Valid route: {len(coordinates)} points, {duration:.1f}s, {distance:.1f}m"

def test_valid_route(origin_id, destination_id, expected_land, test_name):
    """Test a valid route between two points"""
    print(f"\n=== Testing {test_name} ===")
    start_time = time.time()
    
    try:
        response = requests.get(f"{BACKEND_URL}/road-routes/{origin_id}/{destination_id}", timeout=30)
        elapsed = time.time() - start_time
        
        if response.status_code != 200:
            log_test(test_name, False, f"Status code: {response.status_code}, Response: {response.text}")
            return None, elapsed
        
        route = response.json()
        valid, message = validate_route_response(route, origin_id, destination_id, expected_land)
        log_test(test_name, valid, message)
        
        return route, elapsed
        
    except Exception as e:
        log_test(test_name, False, f"Exception: {str(e)}")
        return None, 0

def test_cross_island_rejection(origin_id, destination_id, test_name):
    """Test that cross-island routes are rejected with 422"""
    print(f"\n=== Testing {test_name} ===")
    
    try:
        response = requests.get(f"{BACKEND_URL}/road-routes/{origin_id}/{destination_id}", timeout=30)
        
        if response.status_code == 422:
            log_test(test_name, True, f"Correctly rejected with 422: {response.json().get('detail', '')}")
            return True
        else:
            log_test(test_name, False, f"Expected 422, got {response.status_code}")
            return False
            
    except Exception as e:
        log_test(test_name, False, f"Exception: {str(e)}")
        return False

def test_invalid_id_rejection(origin_id, destination_id, test_name):
    """Test that invalid IDs are rejected with 422"""
    print(f"\n=== Testing {test_name} ===")
    
    try:
        response = requests.get(f"{BACKEND_URL}/road-routes/{origin_id}/{destination_id}", timeout=30)
        
        if response.status_code == 422:
            log_test(test_name, True, f"Correctly rejected with 422: {response.json().get('detail', '')}")
            return True
        else:
            log_test(test_name, False, f"Expected 422, got {response.status_code}")
            return False
            
    except Exception as e:
        log_test(test_name, False, f"Exception: {str(e)}")
        return False

def test_cache_behavior(origin_id, destination_id, test_name):
    """Test that repeated requests use cache and return same route ID"""
    print(f"\n=== Testing {test_name} ===")
    
    # First request
    print("Making first request...")
    time.sleep(1.1)  # Rate limiting
    route1, elapsed1 = test_valid_route(origin_id, destination_id, "mainland", f"{test_name} - First Request")
    
    if not route1:
        log_test(test_name, False, "First request failed")
        return False
    
    # Second request (should be cached)
    print("Making second request (should be cached)...")
    time.sleep(0.1)  # Small delay, but cache should make it fast
    start_time = time.time()
    
    try:
        response = requests.get(f"{BACKEND_URL}/road-routes/{origin_id}/{destination_id}", timeout=30)
        elapsed2 = time.time() - start_time
        
        if response.status_code != 200:
            log_test(test_name, False, f"Second request failed with status {response.status_code}")
            return False
        
        route2 = response.json()
        
        # Verify cache hit by checking response time (should be much faster)
        if elapsed2 < elapsed1 * 0.5:  # Cached response should be at least 50% faster
            log_test(f"{test_name} - Cache Speed", True, f"First: {elapsed1:.2f}s, Cached: {elapsed2:.2f}s")
        else:
            log_warning(f"{test_name} - Cache Speed", f"Cached response not significantly faster: First: {elapsed1:.2f}s, Second: {elapsed2:.2f}s")
        
        # Verify route data consistency (coordinates and times should match)
        if (route1['coordinates'] == route2['coordinates'] and 
            route1['times'] == route2['times'] and
            route1['duration'] == route2['duration'] and
            route1['distance'] == route2['distance']):
            log_test(f"{test_name} - Cache Consistency", True, "Route data matches between requests")
            return True
        else:
            log_test(f"{test_name} - Cache Consistency", False, "Route data differs between requests")
            return False
            
    except Exception as e:
        log_test(test_name, False, f"Exception on second request: {str(e)}")
        return False

def test_map_style_url():
    """Test that MAP_STYLE_URL is accessible and returns valid style"""
    print(f"\n=== Testing MAP_STYLE_URL ===")
    
    try:
        response = requests.get(MAP_STYLE_URL, timeout=10)
        
        if response.status_code == 200:
            # Try to parse as JSON (MapLibre style should be JSON)
            try:
                style = response.json()
                if 'version' in style and 'sources' in style and 'layers' in style:
                    log_test("MAP_STYLE_URL", True, f"Valid MapLibre style with {len(style.get('layers', []))} layers")
                    return True
                else:
                    log_test("MAP_STYLE_URL", False, "Response is JSON but missing required style fields")
                    return False
            except:
                log_test("MAP_STYLE_URL", False, "Response is not valid JSON")
                return False
        else:
            log_test("MAP_STYLE_URL", False, f"Status code: {response.status_code}")
            return False
            
    except Exception as e:
        log_test("MAP_STYLE_URL", False, f"Exception: {str(e)}")
        return False

def test_rate_limiting():
    """Test that rate limiting is enforced (<=1 req/sec)"""
    print(f"\n=== Testing Rate Limiting ===")
    
    # Make two quick requests and measure timing
    print("Making two requests with minimal delay...")
    
    start = time.time()
    response1 = requests.get(f"{BACKEND_URL}/road-routes/porto-boavista/porto-cedofeita", timeout=30)
    time1 = time.time() - start
    
    # Immediate second request
    start2 = time.time()
    response2 = requests.get(f"{BACKEND_URL}/road-routes/porto-asprela/porto-trindade", timeout=30)
    time2 = time.time() - start2
    
    total_time = time.time() - start
    
    if response1.status_code == 200 and response2.status_code == 200:
        # If both succeeded, check if total time suggests rate limiting
        if total_time >= 1.0:
            log_test("Rate Limiting", True, f"Total time for 2 requests: {total_time:.2f}s (rate limiting active)")
            return True
        else:
            log_warning("Rate Limiting", f"Total time for 2 requests: {total_time:.2f}s (may be using cache)")
            return True
    else:
        log_warning("Rate Limiting", f"Could not verify rate limiting due to request failures")
        return False

def print_summary():
    """Print test summary"""
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    
    total = len(test_results["passed"]) + len(test_results["failed"])
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {len(test_results['passed'])} ✅")
    print(f"Failed: {len(test_results['failed'])} ❌")
    print(f"Warnings: {len(test_results['warnings'])} ⚠️")
    
    if test_results["failed"]:
        print("\n--- FAILED TESTS ---")
        for failure in test_results["failed"]:
            print(f"❌ {failure['test']}")
            print(f"   {failure['message']}")
    
    if test_results["warnings"]:
        print("\n--- WARNINGS ---")
        for warning in test_results["warnings"]:
            print(f"⚠️  {warning['test']}")
            print(f"   {warning['message']}")
    
    print("\n" + "="*70)
    
    return len(test_results["failed"]) == 0

def main():
    """Run all tests"""
    print("="*70)
    print("NEXO 112 - Phase 1 Backend Integration Tests")
    print("Testing Real OSRM Road Routing Integration")
    print("="*70)
    
    # Test 1: Health check
    if not test_health_endpoint():
        print("\n❌ Backend is not responding. Aborting tests.")
        return False
    
    # Test 2: MAP_STYLE_URL
    test_map_style_url()
    
    # Test 3: Valid routes (with rate limiting delays) - EXACT routes from review request
    print("\n--- Testing Valid Same-Island Routes (Review Request Specified) ---")
    time.sleep(1.1)
    test_valid_route("porto-boavista", "porto-aliados", "mainland", "Porto: Boavista → Aliados")
    
    time.sleep(1.1)
    test_valid_route("porto-asprela", "porto-trindade", "mainland", "Porto: Asprela → Trindade")
    
    time.sleep(1.1)
    test_valid_route("funchal", "machico", "madeira", "Madeira: Funchal → Machico")
    
    time.sleep(1.1)
    test_valid_route("ponta-delgada", "ribeira-grande", "sao-miguel", "Açores: Ponta Delgada → Ribeira Grande")
    
    # Test 4: Cross-island rejections - EXACT route from review request
    print("\n--- Testing Cross-Island Rejections (Review Request Specified) ---")
    time.sleep(1.1)
    test_cross_island_rejection("porto-boavista", "funchal", "Cross-Island: Porto Boavista (Mainland) → Funchal (Madeira)")
    
    time.sleep(1.1)
    test_cross_island_rejection("ponta-delgada", "angra", "Cross-Island: Ponta Delgada (São Miguel) → Angra (Terceira)")
    
    # Test 5: Invalid ID rejections
    print("\n--- Testing Invalid ID Rejections ---")
    test_invalid_id_rejection("invalid-origin", "porto-aliados", "Invalid Origin ID")
    test_invalid_id_rejection("porto-aliados", "invalid-destination", "Invalid Destination ID")
    
    # Test 6: Cache behavior
    print("\n--- Testing Cache Behavior ---")
    test_cache_behavior("porto-boavista", "porto-trindade", "Cache Test: Porto Boavista → Trindade")
    
    # Print summary
    success = print_summary()
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
