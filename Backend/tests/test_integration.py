import requests
import random
import asyncio
import websockets
import json

BASE_URL = "http://192.168.31.224:5000"
WS_URL = "ws://192.168.31.224:5000"

EXISTING_USER = {
    "name": "test",
    "password": "123"
}

class IntegrationTests:
    
    def __init__(self):
        self.access_token = None
        self.book_id = None
        self.session_id = None
        self.note_id = None
        
        unique_num = random.randint(1000, 9999)
        self.new_user = {
            "name": f"newuser_{unique_num}",
            "last_name": "Testov",
            "email": f"newuser_{unique_num}@example.com",
            "password": "NewPass123"
        }
        
        self.results = {
            "server": False,
            "register": False,
            "login": False,
            "get_books": False,
            "create_session": False,
            "create_note": False,
            "create_quote": False,
            "websocket": False
        }
    
    def test_server_availability(self):
        try:
            response = requests.get(f"{BASE_URL}/docs", timeout=5)
            if response.status_code == 200:
                self.results["server"] = True
                return True
        except:
            pass
        return False
    
    def test_register_user(self):
        response = requests.post(f"{BASE_URL}/auth/signup", json={
            "name": self.new_user["name"],
            "last_name": self.new_user["last_name"],
            "email": self.new_user["email"],
            "password": self.new_user["password"]
        })
        
        if response.status_code in [200, 201]:
            self.results["register"] = True
            return True
        return False
    
    def test_login_user(self):
        response = requests.post(
            f"{BASE_URL}/auth/login",
            data={
                "username": EXISTING_USER["name"],
                "password": EXISTING_USER["password"]
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code == 200:
            data = response.json()
            self.access_token = data.get("access_token")
            self.results["login"] = True
            return True
        return False
    
    def test_get_books(self):
        if not self.access_token:
            return False
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        response = requests.get(f"{BASE_URL}/book/", headers=headers)
        
        if response.status_code == 200:
            books = response.json()
            if len(books) > 0:
                self.book_id = books[0]["id"]
                self.results["get_books"] = True
                return True
        return False
    
    def test_create_session(self):
        if not self.access_token or not self.book_id:
            return False
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        response = requests.post(
            f"{BASE_URL}/session/",
            json={"name": "Тестовая сессия", "book_id": self.book_id},
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            self.session_id = data.get("id")
            self.results["create_session"] = True
            return True
        return False
    
    def test_create_note(self):
        if not self.access_token or not self.session_id:
            return False
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        response = requests.post(
            f"{BASE_URL}/session/note/create",
            json={
                "session_id": self.session_id,
                "selected_text": "Тестовая заметка",
                "color": "yellow",
                "is_private": False,
                "comment": "Тестовый комментарий",
                "start_index": 0,
                "end_index": 20
            },
            headers=headers
        )
        
        if response.status_code == 200:
            self.results["create_note"] = True
            return True
        return False
    
    def test_create_quote(self):
        if not self.access_token or not self.session_id:
            return False
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        response = requests.post(
            f"{BASE_URL}/session/quote/create",
            json={
                "session_id": self.session_id,
                "selected_text": "Тестовая цитата",
                "color": "green",
                "start_index": 100,
                "end_index": 115
            },
            headers=headers
        )
        
        if response.status_code == 200:
            self.results["create_quote"] = True
            return True
        return False
    
    async def test_websocket_connection(self):
        if not self.access_token or not self.session_id:
            return False
        
        try:
            ws_url = f"{WS_URL}/ws/session/{self.session_id}?token={self.access_token}"
            ws = await websockets.connect(ws_url)
            await ws.close()
            self.results["websocket"] = True
            return True
        except:
            return False


async def run_async_tests(api):
    return await api.test_websocket_connection()


def run_tests():
    print("  ИНТЕГРАЦИОННОЕ ТЕСТИРОВАНИЕ")

    api = IntegrationTests()
    
    # Выполнение тестов
    api.test_server_availability()
    api.test_register_user()
    api.test_login_user()
    api.test_get_books()
    api.test_create_session()
    api.test_create_note()
    api.test_create_quote()
    asyncio.run(run_async_tests(api))
    
    test_names = [
        ("Тест на проверку доступности сервера", api.results["server"]),
        ("Тест на проверку регистрации", api.results["register"]),
        ("Тест на проверку возможности входа и получение токена", api.results["login"]),
        ("Тест на проверку получения книг", api.results["get_books"]),
        ("Тест на проверку создания сессии", api.results["create_session"]),
        ("Тест на проверку создания заметки", api.results["create_note"]),
        ("Тест на проверку создания цитаты", api.results["create_quote"]),
        ("Тест на проверку WebSocket соединения", api.results["websocket"])
    ]
    
    for test_name, result in test_names:
        if result:
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name}")
    

if __name__ == "__main__":
    run_tests()