#!/usr/bin/env python3
"""
Flask backend for CyberChat AI
Connects to Ollama TinyLLaMA model
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import sqlite3
import json
import logging
from datetime import datetime
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Database setup
DB_PATH = 'chatbot.db'
OLLAMA_URL = 'http://localhost:11434/api/generate'

def init_db():
    """Initialize SQLite database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            sender TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations (id)
        )
    ''')
    
    conn.commit()
    conn.close()

def get_ollama_response(prompt, model="tinyllama"):
    """Get response from Ollama API"""
    try:
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "num_predict": 2000
            }
        }
        
        logger.info(f"Sending request to Ollama: {prompt[:100]}...")
        response = requests.post(OLLAMA_URL, json=payload, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        ai_response = data.get('response', 'I apologize, but I could not generate a response.')
        
        logger.info(f"Received response from Ollama: {ai_response[:100]}...")
        return ai_response
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Ollama API error: {e}")
        raise Exception(f"AI service unavailable: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise Exception(f"Failed to get AI response: {str(e)}")

@app.route('/api/health', methods=['GET'])
def health_check():
    """Check if Ollama service is available"""
    try:
        response = requests.get('http://localhost:11434/api/tags', timeout=5)
        if response.status_code == 200:
            return jsonify({"status": "connected", "ollama": True})
        else:
            return jsonify({"status": "disconnected", "ollama": False})
    except:
        return jsonify({"status": "disconnected", "ollama": False})

@app.route('/api/conversations', methods=['GET'])
def get_conversations():
    """Get all conversations"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, title, created_at, updated_at 
            FROM conversations 
            ORDER BY updated_at DESC
        ''')
        
        conversations = []
        for row in cursor.fetchall():
            conversations.append({
                'id': row[0],
                'title': row[1],
                'createdAt': row[2],
                'updatedAt': row[3]
            })
        
        conn.close()
        return jsonify(conversations)
        
    except Exception as e:
        logger.error(f"Error getting conversations: {e}")
        return jsonify({"error": "Failed to get conversations"}), 500

@app.route('/api/conversations', methods=['POST'])
def create_conversation():
    """Create new conversation"""
    try:
        data = request.get_json()
        title = data.get('title', 'New Chat')
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO conversations (title) VALUES (?)
        ''', (title,))
        
        conversation_id = cursor.lastrowid
        
        cursor.execute('''
            SELECT id, title, created_at, updated_at 
            FROM conversations WHERE id = ?
        ''', (conversation_id,))
        
        row = cursor.fetchone()
        conversation = {
            'id': row[0],
            'title': row[1],
            'createdAt': row[2],
            'updatedAt': row[3]
        }
        
        conn.commit()
        conn.close()
        
        return jsonify(conversation)
        
    except Exception as e:
        logger.error(f"Error creating conversation: {e}")
        return jsonify({"error": "Failed to create conversation"}), 500

@app.route('/api/conversations/<int:conversation_id>/messages', methods=['GET'])
def get_messages(conversation_id):
    """Get messages for a conversation"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, conversation_id, content, sender, timestamp 
            FROM messages 
            WHERE conversation_id = ? 
            ORDER BY timestamp ASC
        ''', (conversation_id,))
        
        messages = []
        for row in cursor.fetchall():
            messages.append({
                'id': row[0],
                'conversationId': row[1],
                'content': row[2],
                'sender': row[3],
                'timestamp': row[4]
            })
        
        conn.close()
        return jsonify(messages)
        
    except Exception as e:
        logger.error(f"Error getting messages: {e}")
        return jsonify({"error": "Failed to get messages"}), 500

@app.route('/api/conversations/<int:conversation_id>/messages', methods=['POST'])
def send_message(conversation_id):
    """Send message and get AI response"""
    try:
        data = request.get_json()
        content = data.get('content', '').strip()
        
        if not content:
            return jsonify({"error": "Message content is required"}), 400
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Create user message
        cursor.execute('''
            INSERT INTO messages (conversation_id, content, sender) 
            VALUES (?, ?, ?)
        ''', (conversation_id, content, 'user'))
        
        user_message_id = cursor.lastrowid
        
        # Update conversation timestamp
        cursor.execute('''
            UPDATE conversations 
            SET updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        ''', (conversation_id,))
        
        # Get user message details
        cursor.execute('''
            SELECT id, conversation_id, content, sender, timestamp 
            FROM messages WHERE id = ?
        ''', (user_message_id,))
        
        user_row = cursor.fetchone()
        user_message = {
            'id': user_row[0],
            'conversationId': user_row[1],
            'content': user_row[2],
            'sender': user_row[3],
            'timestamp': user_row[4]
        }
        
        try:
            # Get AI response
            ai_response = get_ollama_response(content)
            
            # Create AI message
            cursor.execute('''
                INSERT INTO messages (conversation_id, content, sender) 
                VALUES (?, ?, ?)
            ''', (conversation_id, ai_response, 'ai'))
            
            ai_message_id = cursor.lastrowid
            
            # Get AI message details
            cursor.execute('''
                SELECT id, conversation_id, content, sender, timestamp 
                FROM messages WHERE id = ?
            ''', (ai_message_id,))
            
            ai_row = cursor.fetchone()
            ai_message = {
                'id': ai_row[0],
                'conversationId': ai_row[1],
                'content': ai_row[2],
                'sender': ai_row[3],
                'timestamp': ai_row[4]
            }
            
        except Exception as ollama_error:
            logger.error(f"Ollama error: {ollama_error}")
            
            # Create fallback AI message
            fallback_content = "I'm sorry, I'm having trouble connecting to the AI service right now. Please try again in a moment."
            cursor.execute('''
                INSERT INTO messages (conversation_id, content, sender) 
                VALUES (?, ?, ?)
            ''', (conversation_id, fallback_content, 'ai'))
            
            ai_message_id = cursor.lastrowid
            
            cursor.execute('''
                SELECT id, conversation_id, content, sender, timestamp 
                FROM messages WHERE id = ?
            ''', (ai_message_id,))
            
            ai_row = cursor.fetchone()
            ai_message = {
                'id': ai_row[0],
                'conversationId': ai_row[1],
                'content': ai_row[2],
                'sender': ai_row[3],
                'timestamp': ai_row[4]
            }
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'userMessage': user_message,
            'aiMessage': ai_message
        })
        
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        return jsonify({"error": "Failed to send message"}), 500

@app.route('/api/conversations/<int:conversation_id>', methods=['DELETE'])
def delete_conversation(conversation_id):
    """Delete conversation and all its messages"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Delete messages first
        cursor.execute('DELETE FROM messages WHERE conversation_id = ?', (conversation_id,))
        
        # Delete conversation
        cursor.execute('DELETE FROM conversations WHERE id = ?', (conversation_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({"success": True})
        
    except Exception as e:
        logger.error(f"Error deleting conversation: {e}")
        return jsonify({"error": "Failed to delete conversation"}), 500

if __name__ == '__main__':
    init_db()
    logger.info("Starting CyberChat AI Flask backend...")
    app.run(host='0.0.0.0', port=8000, debug=True)
