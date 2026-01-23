// ui.js - Визуальная часть

// Функция отрисовки боковой панели
window.renderSidebar = function() {
    const list = document.getElementById('chatsList');
    if(!list) return;
    list.innerHTML = "";
    
    window.allChats.forEach(chat => {
        const item = document.createElement('div');
        item.className = `history-item ${chat.id === window.currentChatId ? 'active' : ''}`;
        item.innerHTML = `
            <span style="flex:1; overflow:hidden; text-overflow:ellipsis;">${chat.title}</span>
            <div class="chat-menu-btn" onclick="event.stopPropagation(); toggleMenu('${chat.id}')">⋮</div>
            <div class="drop-menu" id="menu-${chat.id}">
                <div class="drop-item" onclick="event.stopPropagation(); rename('${chat.id}')">✏️ Назвать</div>
                <div class="drop-item" style="color:#ff4444" onclick="event.stopPropagation(); del('${chat.id}')">🗑️ Удалить</div>
            </div>
        `;
        item.onclick = () => { 
            window.currentChatId = chat.id; 
            window.saveData(); 
            window.renderMessages(); 
        };
        list.appendChild(item);
    });
};

// Функция вывода сообщения
window.showOnScreen = function(text, type, isImage = false) {
    const responseDiv = document.getElementById('response');
    if (!text || !responseDiv) return;

    const row = document.createElement('div');
    row.className = "msg-row";
    const m = document.createElement('div');
    m.className = `bubble ${type === 'user' ? 'user-msg' : 'ai-msg'}`;
    
    let header = `<div class="msg-tools"><span>${type === 'user' ? 'You' : 'Intelix'}</span>`;
    if(type === 'ai') header += `<span class="icon-btn" onclick="copyText(this)">📄</span>`;
    header += `</div>`;

    let contentHtml = '';

    if (isImage) {
        contentHtml = `<img src="${text}" class="chat-img"><div class="img-actions"><button class="dl-btn" onclick="downloadImg('${text}')">📥 СКАЧАТЬ</button></div>`;
    } else {
        let formattedText = (typeof marked !== 'undefined') ? marked.parse(text) : text;

        if (typeof katex !== 'undefined') {
            formattedText = formattedText.replace(/\\\[(.*?)\\\]/gs, (match, equation) => {
                try { return katex.renderToString(equation, { displayMode: true }); } catch(e) { return match; }
            });
            formattedText = formattedText.replace(/\\\((.*?)\\\)/gs, (match, equation) => {
                try { return katex.renderToString(equation, { displayMode: false }); } catch(e) { return match; }
            });
        }
        contentHtml = `<div class="msg-content">${formattedText}</div><div class="raw-text" style="display:none;">${text}</div>`;
    }

    m.innerHTML = header + contentHtml;
    row.appendChild(m);
    responseDiv.appendChild(row);
    // Автопрокрутка
    setTimeout(() => responseDiv.scrollTop = responseDiv.scrollHeight, 100);
};

window.renderMessages = function() {
    const responseDiv = document.getElementById('response');
    responseDiv.innerHTML = "";
    const chat = window.allChats.find(c => c.id === window.currentChatId);
    if (chat && chat.messages) {
        chat.messages.forEach(msg => window.showOnScreen(msg.text, msg.type, msg.isImage));
    }
};

// Вспомогательные функции (меню, удаление)
window.toggleMenu = (id) => {
    document.querySelectorAll('.drop-menu').forEach(m => { if(m.id !== `menu-${id}`) m.style.display = 'none'; });
    const m = document.getElementById(`menu-${id}`);
    m.style.display = (m.style.display === 'flex') ? 'none' : 'flex';
};
window.rename = (id) => {
    const chat = window.allChats.find(c => c.id === id);
    const n = prompt("Имя чата:", chat.title);
    if(n) { chat.title = n; window.saveData(); }
};
window.del = (id) => {
    if(confirm("Удалить?")) {
        window.allChats = window.allChats.filter(c => c.id !== id);
        if(window.currentChatId === id) window.currentChatId = window.allChats.length > 0 ? window.allChats[0].id : null;
        if(!window.currentChatId) window.createNewChat(); else window.saveData();
    }
};
window.copyText = (btn) => { 
    const text = btn.closest('.bubble').querySelector('.raw-text').innerText;
    navigator.clipboard.writeText(text); alert("Скопировано!"); 
};