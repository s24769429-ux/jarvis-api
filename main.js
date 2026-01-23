// main.js — Главная логика (Вход, Чат, Прокрутка)

let selectedModel = "openai";
let selectedImage = null;

// Функция для прокрутки чата вниз (Ремонт спуска)
function scrollToBottom() {
    setTimeout(() => {
        const chatBox = document.getElementById('response');
        if (chatBox) {
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    }, 150); // Небольшая задержка, чтобы успело отрисоваться
}

window.addEventListener('load', () => {
    
    // --- 1. ЭЛЕМЕНТЫ ---
    const loginScreen = document.getElementById('login-screen');
    const nameInput = document.getElementById('usernameInput');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userProfile = document.getElementById('user-profile');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userAvatar = document.getElementById('userAvatar');
    
    const sendBtn = document.getElementById('sendBtn');
    const userInput = document.getElementById('userInput');
    const attachBtn = document.getElementById('attachBtn');
    const fileInput = document.getElementById('fileInput');
    const modelToggle = document.getElementById('modelToggle');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');

    // --- 2. СИСТЕМА ВХОДА (ИМЯ) ---
    const savedUser = localStorage.getItem('qirai_username');

    if (savedUser) {
        // Если пользователь уже входил
        if(loginScreen) loginScreen.style.display = 'none';
        if(userProfile) {
            userProfile.style.display = 'block';
            if(userNameDisplay) userNameDisplay.innerText = savedUser;
            if(userAvatar) userAvatar.innerText = savedUser[0].toUpperCase();
        }
    } else {
        // Если новенький
        if(loginScreen) loginScreen.style.display = 'flex';
    }

    // Кнопка ВОЙТИ
    if(loginBtn) {
        loginBtn.onclick = () => {
            const name = nameInput.value.trim();
            if (name) {
                localStorage.setItem('qirai_username', name);
                location.reload(); 
            } else {
                alert("Пожалуйста, введите имя!");
            }
        };
    }

    // Кнопка ВЫЙТИ
    if(logoutBtn) {
        logoutBtn.onclick = () => {
            if(confirm("Выйти из аккаунта?")) {
                localStorage.removeItem('qirai_username');
                location.reload();
            }
        };
    }

    // --- 3. ЗАГРУЗКА ЧАТОВ ---
    // (Используем функции из storage.js и ui.js)
    if (window.allChats.length === 0) {
        if(typeof window.createNewChat === 'function') window.createNewChat();
    } else {
        if(typeof window.renderSidebar === 'function') window.renderSidebar();
        if(typeof window.renderMessages === 'function') window.renderMessages();
        scrollToBottom(); // Спускаемся вниз при загрузке
    }

    // --- 4. КНОПКИ УПРАВЛЕНИЯ ---

    // Новый чат
    const newChatBtn = document.getElementById('newChatBtn');
    if(newChatBtn) newChatBtn.onclick = window.createNewChat;

    // Очистить историю
    const clearBtn = document.getElementById('clearBtn');
    if(clearBtn) clearBtn.onclick = () => {
        if(confirm("Удалить ВСЮ историю переписок?")) {
            localStorage.removeItem('ai_chats_v6');
            window.allChats = [];
            window.createNewChat();
        }
    };

    // Мобильное меню
    if(mobileMenuBtn) {
        mobileMenuBtn.onclick = (e) => {
            e.stopPropagation();
            document.getElementById('sidebar').classList.toggle('open');
        };
    }

    // Клик мимо меню закрывает его
    document.body.onclick = () => {
        const sb = document.getElementById('sidebar');
        if(sb) sb.classList.remove('open');
        const mp = document.getElementById('modelPopup');
        if(mp) mp.style.display = 'none';
        document.querySelectorAll('.drop-menu').forEach(m => m.style.display = 'none');
    };

    // --- 5. ОТПРАВКА СООБЩЕНИЙ ---
    
    const handleSend = async () => {
        const val = userInput.value.trim();
        if(!val && !selectedImage) return;

        if(!window.currentChatId) window.createNewChat();
        const chat = window.allChats.find(c => c.id === window.currentChatId);
        
        // Добавляем сообщение юзера
        if(selectedImage) chat.messages.push({ text: selectedImage, type: 'user', isImage: true });
        if(val) chat.messages.push({ text: val, type: 'user' });
        
        // Чистим поле ввода
        const tempImg = selectedImage;
        userInput.value = ""; 
        selectedImage = null; 
        document.getElementById('imagePreviewContainer').style.display = 'none';
        
        // Сохраняем, рисуем и КРУТИМ ВНИЗ
        window.saveData();
        window.renderMessages();
        scrollToBottom(); 

        // Запрос к ИИ
        await askAI(val, tempImg);
    };

    if(sendBtn) sendBtn.onclick = handleSend;
    if(userInput) userInput.onkeydown = (e) => { 
        if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } 
    };

    // Прикрепление картинки
    if(attachBtn && fileInput) {
        attachBtn.onclick = () => fileInput.click();
        fileInput.onchange = () => {
            if(fileInput.files[0]) {
                const r = new FileReader();
                r.onload = (e) => { 
                    selectedImage = e.target.result; 
                    document.getElementById('imagePreview').src = selectedImage; 
                    document.getElementById('imagePreviewContainer').style.display = 'flex'; 
                };
                r.readAsDataURL(fileInput.files[0]);
            }
        };
    }
    document.getElementById('removePreview').onclick = () => {
        selectedImage = null;
        document.getElementById('imagePreviewContainer').style.display = 'none';
    };

    // Выбор модели
    if(modelToggle) {
        modelToggle.onclick = (e) => { 
            e.stopPropagation(); 
            document.getElementById('modelPopup').style.display = 'flex'; 
        };
    }
    document.querySelectorAll('.popup-item').forEach(i => {
        i.onclick = () => { 
            selectedModel = i.dataset.model; 
            if(modelToggle) modelToggle.innerText = i.dataset.name; 
            document.getElementById('modelPopup').style.display = 'none'; 
        };
    });
});

// --- 6. МОЗГИ (AI) ---
async function askAI(text, imgData) {
    const loadId = 'loading-' + Date.now();
    const responseDiv = document.getElementById('response');
    
    // Индикатор загрузки
    const load = document.createElement('div');
    load.id = loadId;
    load.innerHTML = `<div class="msg-row"><div class="bubble ai-msg" style="color:#888">Thinking...</div></div>`;
    responseDiv.appendChild(load);
    scrollToBottom(); // Крутим вниз к индикатору

    try {
        // Проверка на рисование
        if (/draw|нарисуй|img|create image/i.test(text)) {
            let prompt = text.replace(/draw|нарисуй|img|create image/gi, '').trim();
            try {
               const transRes = await fetch(`https://text.pollinations.ai/${encodeURIComponent("Translate to English: " + prompt)}`);
               if(transRes.ok) prompt = await transRes.text();
            } catch(e) {}
            
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true&seed=${Date.now()}`;
            
            if(document.getElementById(loadId)) document.getElementById(loadId).remove();
            
            const chat = window.allChats.find(c => c.id === window.currentChatId);
            chat.messages.push({ text: url, type: 'ai', isImage: true });
            
            window.saveData();
            window.renderMessages();
            scrollToBottom(); // Крутим вниз к картинке
            return;
        }

        // Промпт для ИИ (Мультиязычность)
        let sys = "You are QIRAI Premium. You are helpful, smart, and friendly. You are fluent in all languages. ALWAYS answer in the same language the user speaks to you.";
        
        if(selectedModel === 'p1') {
            sys = "You are Grok. You are rebellious and sarcastic. You speak all languages fluently. Answer in the same language the user uses.";
        }

        const res = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                messages: [
                    {role: 'system', content: sys},
                    {role: 'user', content: [{type:'text', text: text}, imgData ? {type:'image_url', image_url: {url: imgData}} : null].filter(Boolean)}
                ],
                model: selectedModel
            })
        });

        const textRes = await res.text();
        if(document.getElementById(loadId)) document.getElementById(loadId).remove();

        // Чистим ответ
        let cleanText = textRes;
        try { cleanText = JSON.parse(textRes).choices[0].message.content; } catch(e){}

        const chat = window.allChats.find(c => c.id === window.currentChatId);
        chat.messages.push({ text: cleanText, type: 'ai' });
        
        // Меняем название чата
        if(chat.title === "Новый чат") chat.title = text.substring(0,25);
        
        window.saveData();
        window.renderMessages();
        scrollToBottom(); // Крутим вниз к ответу

    } catch(e) {
        if(document.getElementById(loadId)) document.getElementById(loadId).remove();
        alert("Connection Error: " + e.message);
    }
}