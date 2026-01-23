// main.js — Финальная версия (Кнопки для всех + Редактирование)

let selectedModel = "openai";
let selectedImage = null;

// --- 1. ФУНКЦИИ (ГЛОБАЛЬНЫЕ) ---

function scrollToBottom() {
    setTimeout(() => {
        const chatBox = document.getElementById('response');
        if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
    }, 150);
}

// 1.1. Создание HTML сообщения
function createMessageHTML(text, type, isImage) {
    let html = `<div class="msg-tools"><span>${type === 'user' ? 'ВЫ' : 'QIRAI PREMIUM'}</span></div>`;

    if (isImage) {
        html += `<img src="${text}" class="chat-img"><div class="img-actions"><button class="dl-btn" onclick="downloadImg('${text}')">📥 СКАЧАТЬ</button></div>`;
    } else {
        let formatted = (typeof marked !== 'undefined') ? marked.parse(text) : text;
        if (typeof katex !== 'undefined') {
            formatted = formatted.replace(/\\\[(.*?)\\\]/gs, (m, e) => { try { return katex.renderToString(e, {displayMode:true}); } catch{return m;} });
            formatted = formatted.replace(/\\\((.*?)\\\)/gs, (m, e) => { try { return katex.renderToString(e, {displayMode:false}); } catch{return m;} });
        }
        html += `<div class="msg-content">${formatted}</div>`;
    }

    // --- ПАНЕЛЬ КНОПОК ---
    if (!isImage) {
        const safeText = encodeURIComponent(text);
        html += `<div class="msg-actions-bar">`;

        // ЕСЛИ ЭТО ИИ (3 кнопки)
        if (type === 'ai') {
            html += `
            <button class="action-btn" onclick="window.speakText(this)" title="Озвучить">
                <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
            </button>
            <button class="action-btn" onclick="window.copyToClipboard('${safeText}')" title="Копировать">
                <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
            </button>
            <button class="action-btn" onclick="window.regenerateLast()" title="Перегенерировать">
                <svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
            </button>`;
        } 
        
        // ЕСЛИ ЭТО ТЫ (2 кнопки: Редактировать и Копировать)
        else if (type === 'user') {
            html += `
            <button class="action-btn" onclick="window.editUserMessage('${safeText}')" title="Редактировать">
                <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </button>
            <button class="action-btn" onclick="window.copyToClipboard('${safeText}')" title="Копировать">
                <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
            </button>`;
        }
        
        html += `</div>`;
    }
    return html;
}

// 1.2. Отрисовка
window.renderMessages = function() {
    const responseDiv = document.getElementById('response');
    if (!responseDiv) return;
    responseDiv.innerHTML = "";
    
    const chat = window.allChats.find(c => c.id === window.currentChatId);
    if (chat && chat.messages) {
        chat.messages.forEach(msg => {
            const row = document.createElement('div');
            row.className = "msg-row";
            const bubble = document.createElement('div');
            bubble.className = `bubble ${msg.type === 'user' ? 'user-msg' : 'ai-msg'}`;
            bubble.innerHTML = createMessageHTML(msg.text, msg.type, msg.isImage);
            row.appendChild(bubble);
            responseDiv.appendChild(row);
        });
    }
    if(!document.getElementById('hidden-speak-text')) {
       const div = document.createElement('div'); div.id = 'hidden-speak-text'; div.style.display='none';
       document.body.appendChild(div);
    }
    scrollToBottom();
};

// --- 2. ДЕЙСТВИЯ КНОПОК ---

window.speakText = (btn) => {
    if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); return; }
    const text = btn.closest('.bubble').querySelector('.msg-content').innerText;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU'; utterance.rate = 1.1; 
    window.speechSynthesis.speak(utterance);
};

window.copyToClipboard = (encodedText) => {
    navigator.clipboard.writeText(decodeURIComponent(encodedText)).then(() => alert("Скопировано!"));
};

// РЕДАКТИРОВАНИЕ СООБЩЕНИЯ
window.editUserMessage = (encodedText) => {
    const text = decodeURIComponent(encodedText);
    const input = document.getElementById('userInput');
    input.value = text; // Вставляем текст в поле
    input.focus(); // Ставим курсор
    // Можно удалить старое сообщение, если хочешь:
    // confirm("Удалить старое сообщение?") ? deleteLastUserMsg() : null;
};

window.regenerateLast = () => {
    const chat = window.allChats.find(c => c.id === window.currentChatId);
    if (!chat) return;
    let lastUserMsg = null;
    for (let i = chat.messages.length - 1; i >= 0; i--) {
        if (chat.messages[i].type === 'user') { lastUserMsg = chat.messages[i].text; break; }
    }
    if (lastUserMsg) {
        if (chat.messages[chat.messages.length - 1].type === 'ai') chat.messages.pop();
        window.saveData(); window.renderMessages();
        askAI(lastUserMsg);
    }
};

window.downloadImg = async (url) => {
    try {
        const res = await fetch(url);
        const b = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b); a.download = "qirai_img.png"; a.click();
    } catch(e) { window.open(url, '_blank'); }
};

// --- 3. ИНИЦИАЛИЗАЦИЯ ---
window.addEventListener('load', () => {
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

    // Логин
    const savedUser = localStorage.getItem('qirai_username');
    if (savedUser) {
        if(loginScreen) loginScreen.style.display = 'none';
        if(userProfile) {
            userProfile.style.display = 'block';
            if(userNameDisplay) userNameDisplay.innerText = savedUser;
            if(userAvatar) userAvatar.innerText = savedUser[0].toUpperCase();
        }
    } else {
        if(loginScreen) loginScreen.style.display = 'flex';
    }

    if(loginBtn) {
        loginBtn.onclick = () => {
            const name = nameInput.value.trim();
            if (name) { localStorage.setItem('qirai_username', name); location.reload(); }
            else { alert("Введите имя!"); }
        };
    }
    if(logoutBtn) {
        logoutBtn.onclick = () => {
            if(confirm("Выйти?")) { localStorage.removeItem('qirai_username'); location.reload(); }
        };
    }

    if (window.allChats.length === 0) { if(window.createNewChat) window.createNewChat(); } 
    else { if(window.renderSidebar) window.renderSidebar(); window.renderMessages(); }

    const newChatBtn = document.getElementById('newChatBtn');
    if(newChatBtn) newChatBtn.onclick = window.createNewChat;

    const clearBtn = document.getElementById('clearBtn');
    if(clearBtn) clearBtn.onclick = () => {
        if(confirm("Удалить ВСЮ историю?")) {
            localStorage.removeItem('ai_chats_v6');
            window.allChats = [];
            window.createNewChat();
        }
    };

    const handleSend = async () => {
        const val = userInput.value.trim();
        if(!val && !selectedImage) return;
        if(!window.currentChatId) window.createNewChat();
        const chat = window.allChats.find(c => c.id === window.currentChatId);
        
        if(selectedImage) chat.messages.push({ text: selectedImage, type: 'user', isImage: true });
        if(val) chat.messages.push({ text: val, type: 'user' });
        
        const tempImg = selectedImage;
        userInput.value = ""; selectedImage = null; 
        if(document.getElementById('imagePreviewContainer')) document.getElementById('imagePreviewContainer').style.display = 'none';
        
        window.saveData(); window.renderMessages();
        await askAI(val, tempImg);
    };

    if(sendBtn) sendBtn.onclick = handleSend;
    if(userInput) userInput.onkeydown = (e) => { 
        if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } 
    };

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
    if(document.getElementById('removePreview')) {
        document.getElementById('removePreview').onclick = () => {
            selectedImage = null;
            document.getElementById('imagePreviewContainer').style.display = 'none';
        };
    }

    if(mobileMenuBtn) {
        mobileMenuBtn.onclick = (e) => { e.stopPropagation(); document.getElementById('sidebar').classList.toggle('open'); };
    }
    document.body.onclick = () => {
        const sb = document.getElementById('sidebar'); if(sb) sb.classList.remove('open');
        const mp = document.getElementById('modelPopup'); if(mp) mp.style.display = 'none';
        document.querySelectorAll('.drop-menu').forEach(m => m.style.display = 'none');
    };

    if(modelToggle) {
        modelToggle.onclick = (e) => { e.stopPropagation(); document.getElementById('modelPopup').style.display = 'flex'; };
    }
    document.querySelectorAll('.popup-item').forEach(i => {
        i.onclick = () => { 
            selectedModel = i.dataset.model; 
            if(modelToggle) modelToggle.innerText = i.dataset.name; 
            document.getElementById('modelPopup').style.display = 'none'; 
        };
    });
});

// --- 4. ЗАПРОС К AI ---
async function askAI(text, imgData) {
    const loadId = 'loading-' + Date.now();
    const responseDiv = document.getElementById('response');
    const load = document.createElement('div');
    load.id = loadId;
    load.innerHTML = `<div class="msg-row"><div class="bubble ai-msg" style="color:#888">Thinking...</div></div>`;
    responseDiv.appendChild(load);
    scrollToBottom();

    try {
        if (/draw|нарисуй|img|create image/i.test(text)) {
            let prompt = text.replace(/draw|нарисуй|img|create image/gi, '').trim();
            try { const tr = await fetch(`https://text.pollinations.ai/${encodeURIComponent("Translate to English: " + prompt)}`); if(tr.ok) prompt = await tr.text(); } catch(e){}
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true&seed=${Date.now()}`;
            if(document.getElementById(loadId)) document.getElementById(loadId).remove();
            const chat = window.allChats.find(c => c.id === window.currentChatId);
            chat.messages.push({ text: url, type: 'ai', isImage: true });
            window.saveData(); window.renderMessages();
            return;
        }

        let sys = "You are QIRAI Premium. Fluent in all languages. Answer in the user's language.";
        if(selectedModel === 'p1') sys = "You are Grok. Rebellious and sarcastic.";

        const res = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                messages: [{role: 'system', content: sys}, {role: 'user', content: [{type:'text', text: text}, imgData ? {type:'image_url', image_url: {url: imgData}} : null].filter(Boolean)}],
                model: selectedModel
            })
        });

        const textRes = await res.text();
        if(document.getElementById(loadId)) document.getElementById(loadId).remove();
        let cleanText = textRes;
        try { cleanText = JSON.parse(textRes).choices[0].message.content; } catch(e){}
        const chat = window.allChats.find(c => c.id === window.currentChatId);
        chat.messages.push({ text: cleanText, type: 'ai' });
        if(chat.title === "Новый чат") chat.title = text.substring(0,25);
        window.saveData(); window.renderMessages();

    } catch(e) {
        if(document.getElementById(loadId)) document.getElementById(loadId).remove();
        alert("Error: " + e.message);
    }
}