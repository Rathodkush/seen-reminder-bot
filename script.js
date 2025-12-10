class SeenReminderBot {
    constructor() {
        this.messages = [];
        this.reminderTimeout = 10; // minutes
        this.autoPriority = true;
        this.dailyReminders = true;
        this.reminderIntervals = {};
        this.loadFromStorage();
        this.initializeReminders();
    }

    // Load messages from localStorage
    loadFromStorage() {
        const stored = localStorage.getItem('seenReminderMessages');
        if (stored) {
            this.messages = JSON.parse(stored).map(msg => ({
                ...msg,
                timestamp: new Date(msg.timestamp)
            }));
        }
    }

    // Save messages to localStorage
    saveToStorage() {
        localStorage.setItem('seenReminderMessages', JSON.stringify(this.messages));
    }

    // Add a new message
    addMessage(sender, message, priority, platform) {
        const newMessage = {
            id: Date.now().toString(),
            sender: sender,
            message: message,
            priority: priority || this.detectPriority(message),
            platform: platform || 'other',
            timestamp: new Date(),
            completed: false,
            replied: false
        };
        this.messages.push(newMessage);
        this.saveToStorage();
        this.startReminder(newMessage.id);
        return newMessage;
    }

    // Detect priority using AI-like keyword detection
    detectPriority(message) {
        if (!this.autoPriority) return 'medium';
        
        const lowerMessage = message.toLowerCase();
        const highPriorityKeywords = ['urgent', 'asap', 'important', 'emergency', 'deadline', 'meeting', 'call', 'now', 'immediately'];
        const lowPriorityKeywords = ['thanks', 'thank you', 'ok', 'okay', 'sure', 'cool', 'nice'];
        
        if (highPriorityKeywords.some(keyword => lowerMessage.includes(keyword))) {
            return 'high';
        }
        if (lowPriorityKeywords.some(keyword => lowerMessage.includes(keyword))) {
            return 'low';
        }
        return 'medium';
    }

    // Start reminder timer for a message
    startReminder(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message || message.completed) return;

        // Clear existing reminder if any
        if (this.reminderIntervals[messageId]) {
            clearTimeout(this.reminderIntervals[messageId]);
        }

        // Set new reminder
        const timeoutMs = this.reminderTimeout * 60 * 1000;
        this.reminderIntervals[messageId] = setTimeout(() => {
            this.showReminder(message);
        }, timeoutMs);
    }

    // Show reminder alert
    showReminder(message) {
        if (message.completed) return;

        const alert = document.createElement('div');
        alert.className = 'reminder-alert';
        alert.innerHTML = `
            <h4>🤖 Reminder: Pending Message</h4>
            <p><strong>${message.sender}</strong> sent you a message ${this.getTimeAgo(message.timestamp)} ago.</p>
            <p style="margin-top: 8px; font-style: italic;">"${this.truncateMessage(message.message, 50)}"</p>
        `;
        document.body.appendChild(alert);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            alert.remove();
        }, 10000);

        // Restart reminder
        this.startReminder(message.id);
    }

    // Initialize reminders for all pending messages
    initializeReminders() {
        this.messages.forEach(msg => {
            if (!msg.completed) {
                const timeSince = (Date.now() - msg.timestamp.getTime()) / 1000 / 60; // minutes
                if (timeSince >= this.reminderTimeout) {
                    // Show immediate reminder if already past timeout
                    setTimeout(() => this.showReminder(msg), 1000);
                } else {
                    // Schedule reminder for remaining time
                    const remainingTime = (this.reminderTimeout - timeSince) * 60 * 1000;
                    this.reminderIntervals[msg.id] = setTimeout(() => {
                        this.showReminder(msg);
                    }, remainingTime);
                }
            }
        });
    }

    // Mark message as completed
    markCompleted(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (message) {
            message.completed = true;
            message.replied = true;
            if (this.reminderIntervals[messageId]) {
                clearTimeout(this.reminderIntervals[messageId]);
                delete this.reminderIntervals[messageId];
            }
            this.saveToStorage();
        }
    }

    // Get pending messages
    getPendingMessages(priorityFilter = 'all') {
        const pending = this.messages.filter(m => !m.completed);
        if (priorityFilter === 'all') return pending;
        return pending.filter(m => m.priority === priorityFilter);
    }

    // Get daily summary
    getDailySummary() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayMessages = this.messages.filter(m => m.timestamp >= today);
        const pending = todayMessages.filter(m => !m.completed);
        const replied = todayMessages.filter(m => m.completed);
        const highPriority = pending.filter(m => m.priority === 'high');

        return {
            total: todayMessages.length,
            pending: pending.length,
            replied: replied.length,
            highPriority: highPriority.length,
            unresponded: pending.map(m => ({
                sender: m.sender,
                message: m.message,
                time: this.getTimeAgo(m.timestamp),
                priority: m.priority
            }))
        };
    }

    // Generate quick reply suggestions
    generateQuickReplies(message) {
        const replies = [
            "I'm a bit busy right now, but I saw your message. I'll reply shortly.",
            "Thanks for reaching out! I'll get back to you soon.",
            "Give me a moment, I'm working on something. Will respond soon!",
            "I saw your message. Let me get back to you in a bit."
        ];

        // Context-aware suggestions
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('meeting') || lowerMessage.includes('call')) {
            replies.unshift("I'll check my schedule and get back to you about this.");
        }
        if (lowerMessage.includes('urgent') || lowerMessage.includes('important')) {
            replies.unshift("I see this is important. Let me address this right away.");
        }
        if (lowerMessage.includes('thanks') || lowerMessage.includes('thank')) {
            replies.unshift("You're welcome! Happy to help.");
        }

        return replies.slice(0, 4);
    }

    // Utility functions
    getTimeAgo(timestamp) {
        const now = new Date();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'just now';
    }

    truncateMessage(message, maxLength) {
        if (message.length <= maxLength) return message;
        return message.substring(0, maxLength) + '...';
    }
}

// Initialize bot
const bot = new SeenReminderBot();

// DOM Elements
const inboxView = document.getElementById('inbox-view');
const summaryView = document.getElementById('summary-view');
const settingsView = document.getElementById('settings-view');
const messagesList = document.getElementById('messages-list');
const navButtons = document.querySelectorAll('.nav-btn');
const filterButtons = document.querySelectorAll('.filter-btn');
const addMessageBtn = document.getElementById('add-message-btn');
const addMessageModal = document.getElementById('add-message-modal');
const messageDetailModal = document.getElementById('message-detail-modal');
const pendingCount = document.getElementById('pending-count');

// Navigation
navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        
        // Update active nav button
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Show corresponding view
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`${view}-view`).classList.add('active');
        
        if (view === 'summary') {
            updateSummary();
        }
    });
});

// Filter buttons
let currentFilter = 'all';
filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.priority;
        renderMessages();
    });
});

// Render messages
function renderMessages() {
    const pending = bot.getPendingMessages(currentFilter);
    messagesList.innerHTML = '';

    if (pending.length === 0) {
        messagesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💬</div>
                <p>No pending messages. Great job staying on top of things!</p>
            </div>
        `;
        return;
    }

    pending.forEach(message => {
        const messageItem = document.createElement('div');
        messageItem.className = `message-item ${message.priority}-priority`;
        messageItem.innerHTML = `
            <div class="message-header-row">
                <div class="message-sender">
                    <span>${bot.escapeHtml(message.sender)}</span>
                    <span class="message-platform">${message.platform}</span>
                </div>
                <span class="priority-badge ${message.priority}">${message.priority}</span>
            </div>
            <div class="message-text">${bot.escapeHtml(message.message)}</div>
            <div class="message-footer">
                <span class="message-time">${bot.getTimeAgo(message.timestamp)}</span>
            </div>
        `;
        messageItem.addEventListener('click', () => showMessageDetail(message));
        messagesList.appendChild(messageItem);
    });

    updatePendingCount();
}

// Show message detail modal
function showMessageDetail(message) {
    const detailSender = document.getElementById('detail-sender-name');
    const detailMessage = document.getElementById('detail-message-text');
    const detailPriority = document.getElementById('detail-priority');
    const detailPlatform = document.getElementById('detail-platform');
    const detailTime = document.getElementById('detail-time');
    const replySuggestions = document.getElementById('reply-suggestions');

    detailSender.textContent = message.sender;
    detailMessage.textContent = message.message;
    detailPriority.textContent = message.priority;
    detailPriority.className = `priority-badge ${message.priority}`;
    detailPlatform.textContent = message.platform;
    detailTime.textContent = bot.getTimeAgo(message.timestamp);

    // Generate reply suggestions
    const replies = bot.generateQuickReplies(message.message);
    replySuggestions.innerHTML = '';
    replies.forEach(reply => {
        const suggestion = document.createElement('div');
        suggestion.className = 'reply-suggestion';
        suggestion.textContent = reply;
        suggestion.addEventListener('click', () => {
            // Copy to clipboard or use in reply
            navigator.clipboard.writeText(reply).then(() => {
                suggestion.style.background = '#d4edda';
                setTimeout(() => {
                    suggestion.style.background = '';
                }, 1000);
            });
        });
        replySuggestions.appendChild(suggestion);
    });

    // Set up modal buttons
    document.getElementById('mark-completed').onclick = () => {
        bot.markCompleted(message.id);
        messageDetailModal.classList.remove('active');
        renderMessages();
        updateSummary();
    };

    document.getElementById('reply-now').onclick = () => {
        messageDetailModal.classList.remove('active');
        // Could open a reply interface here
    };

    messageDetailModal.classList.add('active');
}

// Update pending count
function updatePendingCount() {
    const count = bot.getPendingMessages().length;
    pendingCount.textContent = count;
    if (count === 0) {
        pendingCount.style.display = 'none';
    } else {
        pendingCount.style.display = 'inline-block';
    }
}

// Update summary view
function updateSummary() {
    const summary = bot.getDailySummary();
    
    document.getElementById('total-messages').textContent = summary.total;
    document.getElementById('pending-messages').textContent = summary.pending;
    document.getElementById('replied-messages').textContent = summary.replied;
    document.getElementById('high-priority').textContent = summary.highPriority;

    const summaryList = document.getElementById('summary-list');
    summaryList.innerHTML = '';

    if (summary.unresponded.length === 0) {
        summaryList.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No unresponded messages today!</p>';
    } else {
        summary.unresponded.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'message-item';
            itemDiv.innerHTML = `
                <div class="message-header-row">
                    <div class="message-sender">${bot.escapeHtml(item.sender)}</div>
                    <span class="priority-badge ${item.priority}">${item.priority}</span>
                </div>
                <div class="message-text">${bot.escapeHtml(item.message)}</div>
                <div class="message-footer">
                    <span class="message-time">${item.time}</span>
                </div>
            `;
            summaryList.appendChild(itemDiv);
        });
    }
}

// Add message modal
addMessageBtn.addEventListener('click', () => {
    addMessageModal.classList.add('active');
    document.getElementById('sender-name').focus();
});

document.getElementById('close-modal').addEventListener('click', () => {
    addMessageModal.classList.remove('active');
});

document.getElementById('cancel-add').addEventListener('click', () => {
    addMessageModal.classList.remove('active');
});

document.getElementById('save-message').addEventListener('click', () => {
    const sender = document.getElementById('sender-name').value.trim();
    const message = document.getElementById('message-text').value.trim();
    const priority = document.getElementById('message-priority').value;
    const platform = document.getElementById('message-platform').value;

    if (!sender || !message) {
        alert('Please fill in all required fields.');
        return;
    }

    bot.addMessage(sender, message, priority, platform);
    addMessageModal.classList.remove('active');
    
    // Reset form
    document.getElementById('sender-name').value = '';
    document.getElementById('message-text').value = '';
    document.getElementById('message-priority').value = 'medium';
    document.getElementById('message-platform').value = 'whatsapp';

    // Switch to inbox and render
    navButtons[0].click();
    renderMessages();
});

// Message detail modal close
document.getElementById('close-detail-modal').addEventListener('click', () => {
    messageDetailModal.classList.remove('active');
});

// Click outside modal to close
[addMessageModal, messageDetailModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// Settings
document.getElementById('reminder-timeout').addEventListener('change', (e) => {
    bot.reminderTimeout = parseInt(e.target.value);
    localStorage.setItem('reminderTimeout', bot.reminderTimeout);
    bot.initializeReminders();
});

document.getElementById('auto-priority').addEventListener('change', (e) => {
    bot.autoPriority = e.target.checked;
    localStorage.setItem('autoPriority', bot.autoPriority);
});

document.getElementById('daily-reminders').addEventListener('change', (e) => {
    bot.dailyReminders = e.target.checked;
    localStorage.setItem('dailyReminders', bot.dailyReminders);
});

// Load settings
const savedTimeout = localStorage.getItem('reminderTimeout');
if (savedTimeout) {
    bot.reminderTimeout = parseInt(savedTimeout);
    document.getElementById('reminder-timeout').value = savedTimeout;
}

const savedAutoPriority = localStorage.getItem('autoPriority');
if (savedAutoPriority !== null) {
    bot.autoPriority = savedAutoPriority === 'true';
    document.getElementById('auto-priority').checked = bot.autoPriority;
}

const savedDailyReminders = localStorage.getItem('dailyReminders');
if (savedDailyReminders !== null) {
    bot.dailyReminders = savedDailyReminders === 'true';
    document.getElementById('daily-reminders').checked = bot.dailyReminders;
}

// Refresh summary button
document.getElementById('refresh-summary').addEventListener('click', updateSummary);

// Add escapeHtml method to bot
bot.escapeHtml = function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

// Initial render
renderMessages();
updatePendingCount();

// Add some sample messages for demonstration
if (bot.messages.length === 0) {
    const now = new Date();
    bot.addMessage('John', 'Hey, can we schedule a meeting for tomorrow? It\'s urgent!', 'high', 'whatsapp');
    setTimeout(() => {
        bot.addMessage('Sarah', 'Thanks for your help earlier!', 'low', 'instagram');
    }, 100);
    setTimeout(() => {
        bot.addMessage('Boss', 'Please review the project proposal and get back to me by EOD', 'high', 'email');
    }, 200);
    setTimeout(() => {
        renderMessages();
    }, 300);
}
