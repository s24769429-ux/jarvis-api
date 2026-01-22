window.addEventListener('load', () => {
    // 1. Инициализация переменных
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const responseDiv = document.getElementById('response');
    const chatsList = document.getElementById('chatsList');
    const newChatBtn = document.getElementById('newChatBtn');
    const clearBtn = document.getElementById('clearBtn'); // Добавили кнопку очистки
    const modelToggle = document.getElementById('modelToggle');
    const modelPopup = document.getElementById('modelPopup');
    const fileInput = document.getElementById('fileInput');
    const attachBtn = document.getElementById('attachBtn');
    const imgPreviewCont = document.getElementById('imagePreviewContainer');
    const imgPreview = document.getElementById('imagePreview');
    const removePreview = document.getElementById('removePreview');

    let currentChatId = localStorage.getItem('current_chat_id') || null;
    let selectedModel = "openai"; 
    let selectedImage = null;
    let allChats = JSON.parse(localStorage.getItem('ai_chats_v5')) || [];

    // 2. Функция сохранения данных
    function save() {
        localStorage.setItem('ai_chats_v5', JSON.stringify(allChats));
        localStorage.setItem('current_chat_id', currentChatId);
        renderSidebar(); 
        renderMessages();
    }

    // 3. Создание нового чата
    function createNewChat() {
        const id = Date.now().toString();
        allChats.unshift({ id: id, title: "Новый чат", messages: [] });
        currentChatId = id;
        save();
        // Очищаем поле ввода и превью при новом чате
        userInput.value = '';
        selectedImage = null;
        imgPreviewCont.style.display = 'none';
    }

    // 4. Отрисовка боковой панели (Истории)
    function renderSidebar() {
        chatsList.innerHTML = "";
        allChats.forEach(chat => {
            const item = document.createElement('div');
            item.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
            item.innerHTML = `
                <span style="flex:1; overflow:hidden; text-overflow:ellipsis;">${chat.title}</span>
                <div class="chat-menu-btn" onclick="event.stopPropagation(); toggleMenu('${chat.id}')">⋮</div>
                <div class="drop-menu" id="menu-${chat.id}">
                    <div class="drop-item" onclick="event.stopPropagation(); rename('${chat.id}')">✏️ Назвать</div>
                    <div class="drop-item" style="color:#ff4444" onclick="event.stopPropagation(); del('${chat.id}')">🗑️ Удалить</div>
                </div>
            `;
            item.onclick = () => { currentChatId = chat.id; save(); };
            chatsList.appendChild(item);
        });
    }

    // Глобальные функции для меню (удаление, переименование)
    window.toggleMenu = (id) => {
        document.querySelectorAll('.drop-menu').forEach(m => { if(m.id !== `menu-${id}`) m.style.display = 'none'; });
        const m = document.getElementById(`menu-${id}`);
        m.style.display = (m.style.display === 'flex') ? 'none' : 'flex';
    };

    window.rename = (id) => {
        const chat = allChats.find(c => c.id === id);
        const n = prompt("Имя чата:", chat.title);
        if(n) { chat.title = n; save(); }
    };

    window.del = (id) => {
        if(confirm("Удалить этот чат?")) {
            allChats = allChats.filter(c => c.id !== id);
            // Если удалили текущий чат, переключаемся на первый доступный или создаем новый
            if (currentChatId === id) {
                currentChatId = allChats.length > 0 ? allChats[0].id : null;
            }
            if(!currentChatId) createNewChat(); else save();
        }
    };

    // 5. Отрисовка сообщений
 function showOnScreen(text, type, isImage = false) {
        if (!text) return;
        const row = document.createElement('div');
        row.className = "msg-row";
        const m = document.createElement('div');
        m.className = `bubble ${type === 'user' ? 'user-msg' : 'ai-msg'}`;
        
        let header = `<div class="msg-tools"><span>${type === 'user' ? 'ВЫ' : 'QIRAI PREMIUM'}</span>`;
        if(type === 'ai') {
            header += `<span class="icon-btn" onclick="copyText(this)">📄 КОПИРОВАТЬ</span>`;
        }
        header += `</div>`;

        let contentHtml = '';

        if (isImage) {
            contentHtml = `<img src="${text}" class="chat-img"><div class="img-actions"><button class="dl-btn" onclick="downloadImg('${text}')">📥 СКАЧАТЬ</button></div>`;
        } else {
            // 1. Сначала обрабатываем Markdown (жирный текст, заголовки)
            // Используем библиотеку marked, если она загрузилась, иначе просто текст
            let formattedText = (typeof marked !== 'undefined') ? marked.parse(text) : text;

            // 2. Обрабатываем математику (LaTeX)
            if (typeof katex !== 'undefined') {
                // Заменяем блоки \[ ... \] на красивые формулы
                formattedText = formattedText.replace(/\\\[(.*?)\\\]/gs, (match, equation) => {
                    try { return katex.renderToString(equation, { displayMode: true }); }
                    catch(e) { return match; }
                });
                // Заменяем строчные блоки \( ... \)
                formattedText = formattedText.replace(/\\\((.*?)\\\)/gs, (match, equation) => {
                    try { return katex.renderToString(equation, { displayMode: false }); }
                    catch(e) { return match; }
                });
            }

            // Вставляем отформатированный текст + скрытый оригинал для копирования
            contentHtml = `<div class="msg-content">${formattedText}</div><div class="raw-text" style="display:none;">${text}</div>`;
        }

        m.innerHTML = header + contentHtml;
        row.appendChild(m);
        responseDiv.appendChild(row);
        responseDiv.scrollTop = responseDiv.scrollHeight;
    }
    // Улучшенная функция копирования
    window.copyText = (btn) => { 
        const bubble = btn.closest('.bubble');
        const textDiv = bubble.querySelector('.raw-text');
        const textToCopy = textDiv ? textDiv.innerText : bubble.innerText;
        navigator.clipboard.writeText(textToCopy); 
        alert("Текст скопирован!"); 
    };

    window.downloadImg = async (url) => {
        try {
            const res = await fetch(url);
            const b = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(b); a.download = "qirai_img.png"; a.click();
        } catch(e) { window.open(url, '_blank'); }
    };

    // 6. Логика запроса к AI
   async function askAI(text, imgData = null) {
        // Создаем индикатор загрузки
        const load = document.createElement('div');
        load.innerHTML = `<div class="msg-row"><div class="bubble ai-msg" style="color:#555">⏳ Думаю...</div></div>`;
        responseDiv.appendChild(load);
        responseDiv.scrollTop = responseDiv.scrollHeight;

        try {
            const isDraw = /нарисуй|рисуй|draw|img/i.test(text.toLowerCase());
            
            if (isDraw) {
                // Логика рисования
                const prompt = text.replace(/нарисуй|рисуй|draw|img/gi, '').trim() || "cat";
                
                // 1. Переводим промпт (добавили обработку ошибок)
                let engP = prompt;
                try {
                    const transRes = await fetch(`https://text.pollinations.ai/${encodeURIComponent("Translate to English: " + prompt)}?model=openai`);
                    if (transRes.ok) engP = await transRes.text();
                } catch (err) {
                    console.warn("Ошибка перевода, используем оригинал");
                }

                // 2. Генерируем ссылку
                const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(engP.trim())}?nologo=true&seed=${Date.now()}`;
                
                // Проверяем, грузится ли картинка (трюк с Image объектом)
                const testImg = new Image();
                testImg.src = url;
                
                responseDiv.removeChild(load); // Убираем загрузку
                
                // Добавляем сообщение с картинкой
                const chat = allChats.find(c => c.id === currentChatId);
                chat.messages.push({ text: url, type: 'ai', isImage: true });
                save();
                renderMessages(); // Перерисовываем чат
                return;
            }

            // Логика текста (осталась прежней)
            let sys = "Ты QIRAI Premium. Твой создатель Нурилло.";
            if(selectedModel === 'p1') sys = "Ты Grok...";

            const res = await fetch('https://text.pollinations.ai/', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    messages: [
                        {role: 'system', content: sys},
                        {role: 'user', content: [{type: 'text', text: text}, imgData ? {type: 'image_url', image_url: {url: imgData}} : null].filter(Boolean)}
                    ],
                    model: selectedModel
                })
            });

            const aiRaw = await res.text();
            responseDiv.removeChild(load);

            let aiText = aiRaw;
            try { const json = JSON.parse(aiRaw); aiText = json.choices[0].message.content || json.content || aiRaw; } catch(e) { }

            if(aiText) {
                const chat = allChats.find(c => c.id === currentChatId);
                chat.messages.push({ text: aiText, type: 'ai' });
                if (chat.title === "Новый чат") chat.title = text.substring(0, 20);
                save();
                renderMessages();
            }
        } catch (e) { 
            if(load.parentNode) responseDiv.removeChild(load);
            alert("Ошибка соединения: " + e.message);
        }
    }

    function renderMessages() {
        responseDiv.innerHTML = "";
        const chat = allChats.find(c => c.id === currentChatId);
        if (chat && chat.messages) {
            chat.messages.forEach(msg => showOnScreen(msg.text, msg.type, msg.isImage));
        }
        responseDiv.scrollTop = responseDiv.scrollHeight;
    }

    // 7. ОБРАБОТЧИКИ СОБЫТИЙ (ВОТ ЗДЕСЬ БЫЛА ОШИБКА)
    
    // --> ВОТ ЭТОЙ СТРОКИ НЕ ХВАТАЛО:
    newChatBtn.onclick = createNewChat; 

    // --> И ВОТ ЭТОЙ (ДЛЯ ОЧИСТКИ):
    if(clearBtn) {
        clearBtn.onclick = () => {
            if(confirm("Вы уверены, что хотите удалить ВСЮ историю переписок?")) {
                localStorage.removeItem('ai_chats_v5');
                allChats = [];
                createNewChat();
            }
        };
    }

    sendBtn.onclick = () => {
        const val = userInput.value.trim();
        if(val || selectedImage) {
            if(!currentChatId) createNewChat();
            const chat = allChats.find(c => c.id === currentChatId);
            if(selectedImage) chat.messages.push({ text: selectedImage, type: 'user', isImage: true });
            if(val) chat.messages.push({ text: val, type: 'user' });
            
            const temp = selectedImage;
            userInput.value = ""; userInput.style.height = '26px';
            selectedImage = null; imgPreviewCont.style.display = 'none';
            save();
            askAI(val || "Что на фото?", temp);
        }
    };

    userInput.onkeydown = (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBtn.click(); } };
    userInput.oninput = function() { this.style.height = '26px'; this.style.height = this.scrollHeight + 'px'; };
    
    attachBtn.onclick = () => fileInput.click();
    fileInput.onchange = () => {
        if(fileInput.files[0]) {
            const r = new FileReader();
            r.onload = (e) => { selectedImage = e.target.result; imgPreview.src = selectedImage; imgPreviewCont.style.display = 'flex'; };
            r.readAsDataURL(fileInput.files[0]);
        }
    };
    removePreview.onclick = () => { selectedImage = null; imgPreviewCont.style.display = 'none'; };

    modelToggle.onclick = (e) => { e.stopPropagation(); modelPopup.style.display = (modelPopup.style.display === 'flex') ? 'none' : 'flex'; };
    document.querySelectorAll('.popup-item').forEach(i => {
        i.onclick = () => { selectedModel = i.dataset.model; modelToggle.innerText = i.dataset.name; modelPopup.style.display = 'none'; };
    });
    
    document.getElementById('mobileMenuBtn').onclick = (e) => { e.stopPropagation(); document.getElementById('sidebar').classList.toggle('open'); };
    document.body.onclick = () => { 
        document.querySelectorAll('.drop-menu').forEach(m => m.style.display = 'none');
        document.getElementById('sidebar').classList.remove('open');
        modelPopup.style.display = 'none';
    };

    // Запуск при старте
    if (allChats.length === 0) createNewChat(); else {
        renderSidebar(); // Отрисовываем историю
        renderMessages(); // Отрисовываем текущий чат
    }
});