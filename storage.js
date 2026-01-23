// storage.js - Управление данными
const STORAGE_KEY = 'ai_chats_v6'; // v6 - новая версия
const CURRENT_CHAT_KEY = 'current_chat_id';

// Глобальные переменные (чтобы их видели другие файлы)
window.allChats = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
window.currentChatId = localStorage.getItem(CURRENT_CHAT_KEY) || null;

window.saveData = function() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.allChats));
    localStorage.setItem(CURRENT_CHAT_KEY, window.currentChatId);
    if (typeof renderSidebar === 'function') renderSidebar(); 
};

window.createNewChat = function() {
    const id = Date.now().toString();
    window.allChats.unshift({ id: id, title: "Новый чат", messages: [] });
    window.currentChatId = id;
    window.saveData();
    // Очистка полей ввода
    const input = document.getElementById('userInput');
    if(input) input.value = '';
    const preview = document.getElementById('imagePreviewContainer');
    if(preview) preview.style.display = 'none';
    
    // Перерисовка
    if (typeof renderMessages === 'function') renderMessages();
};