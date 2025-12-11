# chatbot.py
import time
import threading

class SeenAlertChatbot:
    def __init__(self, timeout=5):
        self.timeout = timeout
        self.last_user = None
        self.last_time = time.time()
        self.stop_timer = False

  
    def start_timer(self, waiting_for_user):
        start = time.time()

        while not self.stop_timer:
            if time.time() - start >= self.timeout:
                print(f"\n🤖 BOT ALERT: {self.last_user}, don't leave {waiting_for_user} on seen!\n")
                return
            time.sleep(0.2)

  
    def process_message(self, user, message):
        current_time = time.time()

        # OLD LOGIC: Normal seen detection
        if self.last_user and self.last_user != user:
            time_diff = current_time - self.last_time
            if time_diff > self.timeout:
                print(f"\n🤖 BOT ALERT: {self.last_user}, don't leave people on seen!\n")

        print(f"{user}: {message}")

        self.last_user = user
        self.last_time = current_time

   
    def wait_for_message(self, user):
        self.stop_timer = False

        # Start timer thread
        timer_thread = threading.Thread(target=self.start_timer, args=(user,))
        timer_thread.start()

        # Get user input (blocking)
        message = input(f"{user} → ")

        # Stop timer
        self.stop_timer = True
        timer_thread.join()

        # Use old logic processing
        self.process_message(user, message)
