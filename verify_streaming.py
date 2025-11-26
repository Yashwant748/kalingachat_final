import requests
import json
import sys

def verify_streaming():
    session = requests.Session()
    
    # Register/Login
    register_url = "http://localhost:5000/api/auth/register"
    login_url = "http://localhost:5000/api/auth/login"
    
    # Try to register
    try:
        # Check schema for registration
        reg_payload = {"username": "streamtest@kalinga.edu", "password": "password123", "name": "Stream Test"}
        session.post(register_url, json=reg_payload)
    except:
        pass
        
    # Login
    res = session.post(login_url, json={"email": "streamtest@kalinga.edu", "password": "password123"})
    
    if res.status_code != 200:
        print(f"Login failed: {res.status_code} {res.text}")
        # Try fallback user
        res = session.post(login_url, json={"email": "test@kalinga.edu", "password": "password123"})
        if res.status_code != 200:
             print("Login failed for both users")
             return

    print("Login successful")

    # Create conversation
    conv_res = session.post("http://localhost:5000/api/conversations", json={"title": "Streaming Test"})
    if conv_res.status_code != 200:
        # Maybe get existing
        convs = session.get("http://localhost:5000/api/conversations").json()
        if convs:
            conv_id = convs[0]['id']
        else:
            print("Could not create or find conversation")
            return
    else:
        conv_id = conv_res.json()['id']

    print(f"Testing streaming on conversation {conv_id}...")
    
    data = {"content": "Count from 1 to 5 slowly."}
    
    with session.post(f"http://localhost:5000/api/conversations/{conv_id}/messages", json=data, stream=True) as response:
        if response.status_code != 200:
            print(f"Request failed: {response.status_code} {response.text}")
            return

        print("Response headers:", response.headers)
        
        for line in response.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                print(f"Chunk: {decoded_line}")

if __name__ == "__main__":
    verify_streaming()
