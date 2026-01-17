window.addEventListener('load', () => {
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const responseDiv = document.getElementById('response');
    const chatsList = document.getElementById('chatsList');
    const modelToggle = document.getElementById('modelToggle');
    const modelPopup = document.getElementById('modelPopup');
    const fileInput = document.getElementById('fileInput');
    const attachBtn = document.getElementById('attachBtn');

    let allChats = JSON.parse(localStorage.getItem('ai_all_chats')) || [];
    let currentChatId = localStorage.getItem('current_chat_id') || null;
    let selectedModel = "openai";

    // ПЕРЕКЛЮЧАТЕЛЬ МОДЕЛЕЙ
    modelToggle.onclick = (e) => { e.stopPropagation(); modelPopup.classList.toggle('active'); };
    document.querySelectorAll('.popup-item').forEach(item => {
        item.onclick = () => {
            selectedModel = item.dataset.model;
            modelToggle.innerHTML = `${item.dataset.icon} ${item.dataset.name}`;
            document.querySelectorAll('.popup-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            modelPopup.classList.remove('active');
        };
    });
    document.body.onclick = () => { modelPopup.classList.remove('active'); document.getElementById('sidebar').classList.remove('open'); };

    // ФОТО
    attachBtn.onclick = () => fileInput.click();

    function saveAndRefresh() {
        localStorage.setItem('ai_all_chats', JSON.stringify(allChats));
        localStorage.setItem('current_chat_id', currentChatId);
        renderSidebar(); renderMessages();
    }

    function createNewChat() {
        const newId = Date.now().toString();
        allChats.unshift({ id: newId, title: "Новый чат QIRAI", messages: [] });
        currentChatId = newId;
        saveAndRefresh();
    }

    function renderSidebar() {
        chatsList.innerHTML = "";
        allChats.forEach(chat => {
            const item = document.createElement('div');
            item.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
            item.innerHTML = `<span>${chat.title}</span><span style="color:red;font-weight:bold" onclick="event.stopPropagation(); deleteChat('${chat.id}')">×</span>`;
            item.onclick = () => { currentChatId = chat.id; saveAndRefresh(); };
            chatsList.appendChild(item);
        });
    }

    window.deleteChat = (id) => {
        allChats = allChats.filter(c => c.id !== id);
        currentChatId = allChats.length > 0 ? allChats[0].id : null;
        saveAndRefresh(); if (!currentChatId) createNewChat();
    };

    function renderMessages() {
        responseDiv.innerHTML = "";
        const chat = allChats.find(c => c.id === currentChatId);
        if (chat) chat.messages.forEach(msg => {
            const m = document.createElement('div');
            m.className = `message-bubble ${msg.type === 'user' ? 'user-msg' : 'ai-msg'}`;
            if (msg.isImage) {
                m.innerHTML = `<b>QIRAI</b><br><img src="${msg.text}" class="chat-img">`;
            } else {
                m.innerHTML = `<b>${msg.type==='user'?'Нурилло':'QIRAI Premium'}</b><br><span>${msg.text}</span>`;
            }
            responseDiv.appendChild(m);
        });
        responseDiv.scrollTop = responseDiv.scrollHeight;
    }

    async function askAI(text) {
        const loadingMsg = document.createElement('div');
        loadingMsg.innerText = "QIRAI думает...";
        loadingMsg.className = "message-bubble ai-msg";
        responseDiv.appendChild(loadingMsg);
        responseDiv.scrollTop = responseDiv.scrollHeight;

        const low = text.toLowerCase();
        const isDraw = ["нарисуй", "рисуй", "rasm", "chiz"].some(w => low.includes(w));

        try {
            if (isDraw) {
                // ШАГ 1: ГЕНИАЛЬНЫЙ ПРОМПТ
                const promptGen = await fetch(`https://text.pollinations.ai/${encodeURIComponent("Create detailed 8k English image prompt for: " + text + ". No text, just prompt.")}?model=openai`);
                const engPrompt = await promptGen.text();
                // ШАГ 2: РИСУНОК FLUX
                const imgUrl = `https://pollinations.ai/p/${encodeURIComponent(engPrompt)}?width=1024&height=1024&nologo=true&model=flux&seed=${Date.now()}`;
                responseDiv.removeChild(loadingMsg);
                const chat = allChats.find(c => c.id === currentChatId);
                chat.messages.push({ text: imgUrl, type: 'ai', isImage: true });
                saveAndRefresh();
                return;
            }

            const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(text)}?model=${selectedModel}&system=Ты QIRAI Premium, гениальный ИИ Нурилло. Отвечай на его языке.`);
            const aiText = await res.text();
            responseDiv.removeChild(loadingMsg);
            if (aiText) {
                const chat = allChats.find(c => c.id === currentChatId);
                chat.messages.push({ text: aiText, type: 'ai' });
                if (chat.title.includes("Новый")) chat.title = text.substring(0, 20);
                saveAndRefresh();
            }
        } catch (e) { responseDiv.removeChild(loadingMsg); }
    }

    function handleSend() {
        const val = userInput.value;
        if (val.trim() !== "") {
            if (!currentChatId) createNewChat();
            const chat = allChats.find(c => c.id === currentChatId);
            chat.messages.push({ text: val, type: 'user' });
            userInput.value = "";
            saveAndRefresh();
            askAI(val);
        }
    }
    sendBtn.onclick = handleSend;
    newChatBtn.onclick = createNewChat;
    document.getElementById('clearBtn').onclick = () => { localStorage.clear(); location.reload(); };
    userInput.onkeypress = (e) => { if (e.key === 'Enter') handleSend(); };
    if (allChats.length === 0) createNewChat(); else saveAndRefresh();
    document.getElementById('mobileMenuBtn').onclick = (e) => { e.stopPropagation(); document.getElementById('sidebar').classList.toggle('open'); };
});