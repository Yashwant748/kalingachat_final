import requests
import json
import time

BASE_URL = "http://localhost:5000/api"
SESSION = requests.Session()

def login(email, password):
    print(f"Logging in as {email}...")
    res = SESSION.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if res.status_code == 200:
        print("Login successful.")
        return True
    else:
        print(f"Login failed: {res.status_code} {res.text}")
        return False

def create_conversation():
    print("Creating new conversation...")
    res = SESSION.post(f"{BASE_URL}/conversations", json={"title": "Test Chat"})
    if res.status_code == 201:
        data = res.json()
        print(f"Conversation created: ID {data['id']}")
        return data['id']
    else:
        print(f"Failed to create conversation: {res.status_code} {res.text}")
        return None

def send_message(conversation_id, content):
    print(f"\nSending message: {content}")
    res = SESSION.post(f"{BASE_URL}/conversations/{conversation_id}/messages", json={"content": content})
    if res.status_code == 200:
        data = res.json()
        ai_response = data['aiMessage']['content']
        print("-" * 20)
        print("AI Response:")
        print(ai_response)
        print("-" * 20)
        return ai_response
    else:
        print(f"Failed to send message: {res.status_code} {res.text}")
        return None

def main():
    if not login("test@kalinga.edu", "password"):
        return

    cid = create_conversation()
    if not cid:
        return

    questions = [
        "Explain recursion with a simple example and code snippet.",
        "Explain machine learning in 5 short bullet points.",
        "Tell me about Kalinga University."
    ]

    for q in questions:
        send_message(cid, q)
        time.sleep(2)

if __name__ == "__main__":
    main()
