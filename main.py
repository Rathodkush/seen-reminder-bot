from Chatbot import SeenAlertChatbot
from utils.timer import wait

bot = SeenAlertChatbot(timeout=5)

print("\n Two User Chat Started")
print("If reply > 5 seconds → Bot will warn!\n")

while True:
    bot.wait_for_message("UserA")
    wait(1)
    bot.wait_for_message("UserB")
    wait(1)

    print("\n------------------------------------\n")
