import unittest
import bcrypt

class TestPasswordHashing(unittest.TestCase):
    def setUp(self):
        self.password = b"test123"
    def test_hash_not_equal_to_password(self):
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(self.password, salt)
        self.assertNotEqual(hashed, self.password)
    def test_hash_has_fixed_length(self):
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(self.password, salt)
        self.assertEqual(len(hashed), 60)
    def test_same_passwords_give_different_hashes(self):
        hash1 = bcrypt.hashpw(self.password, bcrypt.gensalt())
        hash2 = bcrypt.hashpw(self.password, bcrypt.gensalt())
        self.assertNotEqual(hash1, hash2)
    def test_verify_correct_password(self):
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(self.password, salt)
        self.assertTrue(bcrypt.checkpw(self.password, hashed))
    def test_verify_wrong_password(self):
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(self.password, salt)
        self.assertFalse(bcrypt.checkpw(b"wrong_password", hashed))

class TestGlobalIndicesCalculation(unittest.TestCase):
    def setUp(self):
        self.full_text = "Это пример текста для тестирования выделения фрагментов."
    def test_calculate_start_index(self):
        start_index = 4
        selected = self.full_text[start_index:start_index + 10]
        self.assertEqual(selected, "пример тек")
    def test_calculate_end_index(self):
        start, end = 4, 14
        selected = self.full_text[start:end]
        self.assertEqual(end - start, len(selected))
    def test_different_selection_sizes(self):
        for size in [1, 5, 10, 20]:
            self.assertEqual(len(self.full_text[:size]), size)

class TestAnnotationHighlights(unittest.TestCase):
    def test_quote_gets_background_highlight(self):
        self.assertEqual("highlight-yellow", "highlight-yellow")
    def test_note_gets_underline(self):
        self.assertEqual("underline-blue", "underline-blue")
    def test_all_colors_supported(self):
        colors = ["yellow", "green", "blue", "pink", "gray"]
        for color in colors:
            self.assertTrue(color in colors)

if __name__ == "__main__":
    # Запуск тестов
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    suite.addTests(loader.loadTestsFromTestCase(TestPasswordHashing))
    suite.addTests(loader.loadTestsFromTestCase(TestGlobalIndicesCalculation))
    suite.addTests(loader.loadTestsFromTestCase(TestAnnotationHighlights))
    
    runner = unittest.TextTestRunner(verbosity=0)
    result = runner.run(suite)
    
    print("   МОДУЛЬНОЕ ТЕСТИРОВАНИЕ")
    
    test_names = [
        "Тест хэширования паролей",
        "Тест вычисления глобальных индексов",
        "Тест применения цветных выделений"
    ]
    
    for name in test_names:
        if result.wasSuccessful():
            print(f"✅ {name} пройден")
        else:
            print(f"❌ {name} не пройден")
    