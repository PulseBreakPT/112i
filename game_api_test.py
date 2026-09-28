"""
Game API Sanity Tests for NEXO 112
Tests basic game operations: create, pause, tick, speed changes, persistence
"""
import requests
import time
import json

BACKEND_URL = "https://minimal-contrast-hub.preview.emergentagent.com/api"

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

def test_health():
    """Test health endpoint"""
    print("\n=== Testing Health Endpoint ===")
    try:
        response = requests.get(f"{BACKEND_URL}/", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'operational' and data.get('name') == 'NEXO 112':
                log_test("Health endpoint", True, f"Status: {data.get('status')}, Name: {data.get('name')}")
                return True
            else:
                log_test("Health endpoint", False, f"Unexpected response: {data}")
                return False
        else:
            log_test("Health endpoint", False, f"Status code: {response.status_code}")
            return False
    except Exception as e:
        log_test("Health endpoint", False, f"Exception: {str(e)}")
        return False

def test_world():
    """Test world endpoint"""
    print("\n=== Testing World Endpoint ===")
    try:
        response = requests.get(f"{BACKEND_URL}/world", timeout=10)
        if response.status_code == 200:
            data = response.json()
            required_fields = ['mode', 'name', 'center', 'zoom', 'map_style', 'services', 'sites', 'regions', 'routing']
            missing = [f for f in required_fields if f not in data]
            if missing:
                log_test("World endpoint", False, f"Missing fields: {missing}")
                return False
            
            # Verify it's the geographic world
            if data.get('mode') == 'portugal-v1' and data.get('name') == 'Portugal':
                log_test("World endpoint", True, f"Mode: {data['mode']}, Name: {data['name']}, Sites: {len(data['sites'])}, Regions: {len(data['regions'])}")
                return True
            else:
                log_test("World endpoint", False, f"Unexpected world: mode={data.get('mode')}, name={data.get('name')}")
                return False
        else:
            log_test("World endpoint", False, f"Status code: {response.status_code}")
            return False
    except Exception as e:
        log_test("World endpoint", False, f"Exception: {str(e)}")
        return False

def test_create_game():
    """Test game creation"""
    print("\n=== Testing Game Creation ===")
    try:
        response = requests.post(f"{BACKEND_URL}/games", timeout=10)
        if response.status_code == 200:
            game = response.json()
            required_fields = ['id', 'mode', 'city', 'money', 'xp', 'level', 'trust', 'elapsed', 'speed', 
                             'completed', 'failed', 'earned', 'next_spawn', 'sequence', 'incidents', 
                             'units', 'bases', 'logs', 'history', 'saved_at']
            missing = [f for f in required_fields if f not in game]
            if missing:
                log_test("Create game", False, f"Missing fields: {missing}")
                return None
            
            log_test("Create game", True, f"Game ID: {game['id']}, Mode: {game['mode']}, City: {game['city']}, Speed: {game['speed']}")
            return game
        else:
            log_test("Create game", False, f"Status code: {response.status_code}, Response: {response.text}")
            return None
    except Exception as e:
        log_test("Create game", False, f"Exception: {str(e)}")
        return None

def test_read_game(game_id):
    """Test reading game state"""
    print(f"\n=== Testing Read Game (ID: {game_id}) ===")
    try:
        response = requests.get(f"{BACKEND_URL}/games/{game_id}", timeout=10)
        if response.status_code == 200:
            game = response.json()
            log_test("Read game", True, f"Game ID: {game['id']}, Elapsed: {game['elapsed']:.2f}s, Speed: {game['speed']}")
            return game
        else:
            log_test("Read game", False, f"Status code: {response.status_code}, Response: {response.text}")
            return None
    except Exception as e:
        log_test("Read game", False, f"Exception: {str(e)}")
        return None

def test_pause_game(game_id):
    """Test pausing game (speed 0)"""
    print(f"\n=== Testing Pause Game (Speed 0) ===")
    try:
        response = requests.post(
            f"{BACKEND_URL}/games/{game_id}/action",
            json={"type": "speed", "data": {"speed": 0}},
            timeout=10
        )
        if response.status_code == 200:
            game = response.json()
            if game['speed'] == 0:
                log_test("Pause game (speed 0)", True, f"Speed set to {game['speed']}")
                return game
            else:
                log_test("Pause game (speed 0)", False, f"Speed is {game['speed']}, expected 0")
                return None
        else:
            log_test("Pause game (speed 0)", False, f"Status code: {response.status_code}, Response: {response.text}")
            return None
    except Exception as e:
        log_test("Pause game (speed 0)", False, f"Exception: {str(e)}")
        return None

def test_tick_while_paused(game_id):
    """Test ticking while paused (should not advance time)"""
    print(f"\n=== Testing Tick While Paused ===")
    try:
        # Get current state
        game_before = test_read_game(game_id)
        if not game_before:
            log_test("Tick while paused", False, "Could not read game state before tick")
            return None
        
        elapsed_before = game_before['elapsed']
        
        # Tick with 2 seconds
        response = requests.post(
            f"{BACKEND_URL}/games/{game_id}/tick",
            json={"seconds": 2.0},
            timeout=10
        )
        if response.status_code == 200:
            game_after = response.json()
            elapsed_after = game_after['elapsed']
            
            # When paused (speed 0), elapsed should not change
            if elapsed_after == elapsed_before:
                log_test("Tick while paused", True, f"Elapsed unchanged: {elapsed_before:.2f}s (speed={game_after['speed']})")
                return game_after
            else:
                log_test("Tick while paused", False, f"Elapsed changed from {elapsed_before:.2f}s to {elapsed_after:.2f}s while paused")
                return None
        else:
            log_test("Tick while paused", False, f"Status code: {response.status_code}, Response: {response.text}")
            return None
    except Exception as e:
        log_test("Tick while paused", False, f"Exception: {str(e)}")
        return None

def test_speed_change_and_tick(game_id):
    """Test changing speed to 1 and ticking"""
    print(f"\n=== Testing Speed Change to 1 and Tick ===")
    try:
        # Set speed to 1
        response = requests.post(
            f"{BACKEND_URL}/games/{game_id}/action",
            json={"type": "speed", "data": {"speed": 1}},
            timeout=10
        )
        if response.status_code != 200:
            log_test("Set speed to 1", False, f"Status code: {response.status_code}")
            return None
        
        game = response.json()
        if game['speed'] != 1:
            log_test("Set speed to 1", False, f"Speed is {game['speed']}, expected 1")
            return None
        
        log_test("Set speed to 1", True, f"Speed set to {game['speed']}")
        elapsed_before = game['elapsed']
        
        # Tick with 2 seconds at speed 1
        response = requests.post(
            f"{BACKEND_URL}/games/{game_id}/tick",
            json={"seconds": 2.0},
            timeout=10
        )
        if response.status_code == 200:
            game_after = response.json()
            elapsed_after = game_after['elapsed']
            elapsed_delta = elapsed_after - elapsed_before
            
            # At speed 1, elapsed should increase by approximately 2 seconds
            if 1.8 <= elapsed_delta <= 2.2:  # Allow small tolerance
                log_test("Tick at speed 1", True, f"Elapsed increased by {elapsed_delta:.2f}s (expected ~2s)")
                return game_after
            else:
                log_test("Tick at speed 1", False, f"Elapsed increased by {elapsed_delta:.2f}s, expected ~2s")
                return None
        else:
            log_test("Tick at speed 1", False, f"Status code: {response.status_code}")
            return None
    except Exception as e:
        log_test("Speed change and tick", False, f"Exception: {str(e)}")
        return None

def test_pause_after_tick(game_id):
    """Test pausing after ticking"""
    print(f"\n=== Testing Pause After Tick ===")
    try:
        response = requests.post(
            f"{BACKEND_URL}/games/{game_id}/action",
            json={"type": "speed", "data": {"speed": 0}},
            timeout=10
        )
        if response.status_code == 200:
            game = response.json()
            if game['speed'] == 0:
                log_test("Pause after tick", True, f"Speed set to {game['speed']}")
                return game
            else:
                log_test("Pause after tick", False, f"Speed is {game['speed']}, expected 0")
                return None
        else:
            log_test("Pause after tick", False, f"Status code: {response.status_code}")
            return None
    except Exception as e:
        log_test("Pause after tick", False, f"Exception: {str(e)}")
        return None

def test_persistence(game_id):
    """Test game persistence (save and read)"""
    print(f"\n=== Testing Game Persistence ===")
    try:
        # Read game state
        game_before = test_read_game(game_id)
        if not game_before:
            log_test("Persistence", False, "Could not read game state")
            return False
        
        # Wait a moment
        time.sleep(1)
        
        # Read again
        game_after = test_read_game(game_id)
        if not game_after:
            log_test("Persistence", False, "Could not read game state after wait")
            return False
        
        # Verify key fields match
        fields_to_check = ['id', 'mode', 'city', 'money', 'xp', 'level', 'trust', 'elapsed', 'speed']
        mismatches = []
        for field in fields_to_check:
            if game_before.get(field) != game_after.get(field):
                mismatches.append(f"{field}: {game_before.get(field)} -> {game_after.get(field)}")
        
        if mismatches:
            log_test("Persistence", False, f"State changed unexpectedly: {', '.join(mismatches)}")
            return False
        
        # Verify saved_at exists and is recent
        if 'saved_at' in game_after:
            log_test("Persistence", True, f"Game state persisted correctly, saved_at: {game_after['saved_at']}")
            return True
        else:
            log_test("Persistence", False, "No saved_at timestamp")
            return False
    except Exception as e:
        log_test("Persistence", False, f"Exception: {str(e)}")
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
    """Run all game API sanity tests"""
    print("="*70)
    print("NEXO 112 - Game API Sanity Tests")
    print("Testing: health, world, create, pause, tick, speed, persistence")
    print("="*70)
    
    # Test 1: Health check
    if not test_health():
        print("\n❌ Backend health check failed. Aborting tests.")
        return False
    
    # Test 2: World endpoint
    if not test_world():
        print("\n❌ World endpoint failed. Continuing with game tests...")
    
    # Test 3: Create a disposable game
    game = test_create_game()
    if not game:
        print("\n❌ Could not create game. Aborting tests.")
        return False
    
    game_id = game['id']
    print(f"\n📝 Created disposable test game: {game_id}")
    
    # Test 4: Pause game (speed 0)
    if not test_pause_game(game_id):
        print("\n❌ Could not pause game. Continuing...")
    
    # Test 5: Tick while paused
    if not test_tick_while_paused(game_id):
        print("\n❌ Tick while paused failed. Continuing...")
    
    # Test 6: Speed change to 1 and tick
    if not test_speed_change_and_tick(game_id):
        print("\n❌ Speed change and tick failed. Continuing...")
    
    # Test 7: Pause after tick
    if not test_pause_after_tick(game_id):
        print("\n❌ Pause after tick failed. Continuing...")
    
    # Test 8: Persistence
    if not test_persistence(game_id):
        print("\n❌ Persistence test failed.")
    
    # Print summary
    success = print_summary()
    
    print(f"\n📝 Test game ID: {game_id} (can be deleted)")
    
    return success

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
