from fastapi import WebSocket
from typing import Dict, List, Any

notification_connections = {}

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, session_id: int, websocket: WebSocket):
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)
        print(f"Session {session_id}: {len(self.active_connections[session_id])} connections")

    def disconnect(self, session_id: int, websocket: WebSocket):
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
        print(f"Session {session_id}: disconnected")

    async def broadcast(self, session_id: int, message: Dict[str, Any]):
        if session_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Failed to send to connection: {e}")
                    disconnected.append(connection)
            
            for conn in disconnected:
                if conn in self.active_connections[session_id]:
                    self.active_connections[session_id].remove(conn)
            
            print(f"Broadcast to session {session_id}: {len(self.active_connections[session_id])} recipients")

manager = ConnectionManager()