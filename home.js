window.addEventListener('load', () => {
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const responseDiv = document.getElementById('response');
    const chatsList = document.getElementById('chatsList');
    const newChatBtn = document.getElementById('newChatBtn');

    let allChats = JSON.parse(localStorage.getItem('ai_all_chats')) || [];
    let currentChatId = localStorage.getItem('current_chat_id') || null;

    // --- СИСТЕМА СОХРАНЕНИЯ ---
    function saveAndRefresh() {
        localStorage.setItem('ai_all_chats', JSON.stringify(allChats));
        localStorage.setItem('current_chat_id', currentChatId);
        renderSidebar();
        renderMessages();
    }

    function createNewChat() {
        const newId = Date.now().toString();
        allChats.unshift({ id: newId, title: "Yangi chat / Новый чат", messages: [] });
        currentChatId = newId;
        saveAndRefresh();
    }

    function renderSidebar() {
        if (!chatsList) return;
        chatsList.innerHTML = "";
        allChats.forEach(chat => {
            const item = document.createElement('div');
            item.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
            
            const titleSpan = document.createElement('span');
            titleSpan.innerText = chat.title.length > 20 ? chat.title.substring(0, 20) + "..." : chat.title;
            
            // Кнопка удаления чата
            const delBtn = document.createElement('button');
            delBtn.innerHTML = "&times;";
            delBtn.style.cssText = "background:none; border:none; color:red; font-size:1.2rem; cursor:pointer; margin-left:10px;";
            delBtn.onclick = (e) => {
                e.stopPropagation();
                if(confirm("Удалить этот чат?")) {
                    allChats = allChats.filter(c => c.id !== chat.id);
                    if(currentChatId === chat.id) currentChatId = allChats.length > 0 ? allChats[0].id : null;
                    saveAndRefresh();
                    if(!currentChatId) createNewChat();
                }
            };

            item.onclick = () => { currentChatId = chat.id; saveAndRefresh(); };
            item.appendChild(titleSpan);
            item.appendChild(delBtn);
            chatsList.appendChild(item);
        });
    }

    function renderMessages() {
        if (!responseDiv) return;
        responseDiv.innerHTML = "";
        const chat = allChats.find(c => c.id === currentChatId);
        if (chat) {
            chat.messages.forEach(msg => showOnScreen(msg.text, msg.type, msg.isImage));
        }
    }

    // --- ПОКАЗ СООБЩЕНИЙ (Использует твой CSS) ---
    function showOnScreen(text, type, isImage = false) {
        const messageBubble = document.createElement('div');
        messageBubble.classList.add('message-bubble');
        
        // Назначаем класс (справа для тебя, слева для ИИ)
        if (type === 'user') {
            messageBubble.classList.add('user-msg');
        } else {
            messageBubble.classList.add('ai-msg');
        }

        const label = document.createElement('b');
        label.style.fontSize = "0.7rem";
        label.style.opacity = "0.5";
        label.style.marginBottom = "5px";
        label.style.display = "block";
        label.innerText = type === 'user' ? "Вы" : "Jarvis";
        messageBubble.appendChild(label);

        if (isImage) {
            const img = document.createElement('img');
            img.src = text;
            img.className = "chat-image";
            messageBubble.appendChild(img);
        } else {
            const content = document.createElement('span');
            content.innerText = text;
            messageBubble.appendChild(content);
        }
        
        responseDiv.prepend(messageBubble);
    }

    // --- МОЗГИ ГЕНИЯ ---
    async function askAI(text) {
        const loadingMsg = document.createElement('div');
        loadingMsg.innerText = "Jarvis думает...";
        loadingMsg.className = "message-bubble ai-msg";
        responseDiv.prepend(loadingMsg);

        const lowerText = text.toLowerCase();
        const isDraw = lowerText.includes("нарисуй") || lowerText.includes("рисуй") || lowerText.includes("chiz");

        try {
            // Если просим рисовать
            if (isDraw) {
                // Сначала просим ИИ сделать крутой промпт на английском (это секрет успеха)
                const promptRes = await fetch("https://text.pollinations.ai/" + encodeURIComponent("Detailed 8k image prompt in English for: " + text + ". No intro, just prompt."));
                const englishPrompt = await promptRes.text();
                
                const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(englishPrompt)}?width=1024&height=1024&nologo=true&model=flux`;
                
                responseDiv.removeChild(loadingMsg);
                const chat = allChats.find(c => c.id === currentChatId);
                chat.messages.push({ text: imgUrl, type: 'ai', isImage: true });
                if (chat.title.includes("Новый")) chat.title = "🎨 " + text.substring(0, 15);
                saveAndRefresh();
                return;
            }

            // Обычный умный разговор
            const url = "https://text.pollinations.ai/" + encodeURIComponent(text + " (Отвечай на языке пользователя, ты - Jarvis)");
            const res = await fetch(url);
            const aiText = await res.text();
            
            responseDiv.removeChild(loadingMsg);
            
            if (aiText) {
                const chat = allChats.find(c => c.id === currentChatId);
                chat.messages.push({ text: aiText, type: 'ai', isImage: false });
                if (chat.title.includes("Новый")) chat.title = text.substring(0, 20);
                saveAndRefresh();
                
                // Озвучка
                window.speechSynthesis.speak(new SpeechSynthesisUtterance(aiText));
            }
        } catch (e) {
            if (loadingMsg.parentNode) responseDiv.removeChild(loadingMsg);
            showOnScreen("Сэр, возникли проблемы со связью. Попробуйте еще раз!", "ai");
        }
    }

    function handleSend() {
        if (!currentChatId) createNewChat();
        const val = userInput.value;
        if (val.trim() !== "") {
            const chat = allChats.find(c => c.id === currentChatId);
            chat.messages.push({ text: val, type: 'user', isImage: false });
            userInput.value = "";
            saveAndRefresh();
            askAI(val);
        }
    }

    sendBtn.onclick = handleSend;
    newChatBtn.onclick = createNewChat;
    userInput.onkeypress = (e) => { if (e.key === 'Enter') handleSend(); };

    if (allChats.length === 0) createNewChat();
    else { renderSidebar(); renderMessages(); }
});