// API Base URL
const API_BASE_URL = '/api';

// 現在のフィルター状態
let currentFilter = 'all';

// DOMが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', () => {
    loadTodos();
    setupEventListeners();
});

// イベントリスナーの設定
function setupEventListeners() {
    // TODO追加フォーム
    document.getElementById('add-todo-form').addEventListener('submit', handleAddTodo);
    
    // フィルターボタン
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', handleFilterChange);
    });
}

// TODOリストの読み込み
async function loadTodos() {
    try {
        const response = await fetch(`${API_BASE_URL}/todos`);
        const todos = await response.json();
        renderTodos(todos);
    } catch (error) {
        console.error('TODOの読み込みに失敗しました:', error);
    }
}

// TODOリストの表示
function renderTodos(todos) {
    const todoList = document.getElementById('todo-list');
    const emptyState = document.getElementById('empty-state');
    
    // フィルタリング
    const filteredTodos = filterTodos(todos, currentFilter);
    
    if (filteredTodos.length === 0) {
        todoList.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    todoList.innerHTML = filteredTodos.map(todo => createTodoHTML(todo)).join('');
    
    // 各TODO項目にイベントリスナーを追加
    attachTodoEventListeners();
}

// TODOのフィルタリング
function filterTodos(todos, filter) {
    switch (filter) {
        case 'active':
            return todos.filter(todo => !todo.completed);
        case 'completed':
            return todos.filter(todo => todo.completed);
        default:
            return todos;
    }
}

// TODO項目のHTML生成
function createTodoHTML(todo) {
    const createdDate = new Date(todo.created_at).toLocaleDateString('ja-JP');
    return `
        <div class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
            <div class="todo-content">
                <h3>${escapeHtml(todo.title)}</h3>
                ${todo.description ? `<p>${escapeHtml(todo.description)}</p>` : ''}
                <small>作成日: ${createdDate}</small>
            </div>
            <button class="delete-btn">削除</button>
        </div>
    `;
}

// HTMLエスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// TODO項目のイベントリスナー追加
function attachTodoEventListeners() {
    // チェックボックス
    document.querySelectorAll('.todo-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleToggleTodo);
    });
    
    // 削除ボタン
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', handleDeleteTodo);
    });
    
    // TODO内容クリックで編集
    document.querySelectorAll('.todo-content').forEach(content => {
        content.addEventListener('click', handleEditTodo);
    });
}

// 新規TODO追加
async function handleAddTodo(e) {
    e.preventDefault();
    
    const titleInput = document.getElementById('todo-title');
    const descriptionInput = document.getElementById('todo-description');
    
    const todoData = {
        title: titleInput.value.trim(),
        description: descriptionInput.value.trim(),
        completed: false
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/todos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(todoData)
        });
        
        if (response.ok) {
            titleInput.value = '';
            descriptionInput.value = '';
            loadTodos();
        }
    } catch (error) {
        console.error('TODOの追加に失敗しました:', error);
    }
}

// 完了状態の切り替え
async function handleToggleTodo(e) {
    const todoItem = e.target.closest('.todo-item');
    const todoId = todoItem.dataset.id;
    
    try {
        const response = await fetch(`${API_BASE_URL}/todos/${todoId}/toggle`, {
            method: 'PATCH'
        });
        
        if (response.ok) {
            loadTodos();
        }
    } catch (error) {
        console.error('完了状態の切り替えに失敗しました:', error);
    }
}

// TODO削除
async function handleDeleteTodo(e) {
    const todoItem = e.target.closest('.todo-item');
    const todoId = todoItem.dataset.id;
    
    if (!confirm('このTODOを削除しますか？')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/todos/${todoId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadTodos();
        }
    } catch (error) {
        console.error('TODOの削除に失敗しました:', error);
    }
}

// TODO編集
function handleEditTodo(e) {
    const todoItem = e.currentTarget.closest('.todo-item');
    const todoId = todoItem.dataset.id;
    const title = e.currentTarget.querySelector('h3').textContent;
    const description = e.currentTarget.querySelector('p')?.textContent || '';
    
    // 編集フォームを作成
    const editForm = document.createElement('form');
    editForm.className = 'edit-form';
    editForm.innerHTML = `
        <input type="text" value="${escapeHtml(title)}" required>
        <textarea rows="2">${escapeHtml(description)}</textarea>
        <div class="edit-form-buttons">
            <button type="submit" class="save-btn">保存</button>
            <button type="button" class="cancel-btn">キャンセル</button>
        </div>
    `;
    
    // 既存のコンテンツを隠す
    todoItem.classList.add('editing');
    
    // 編集フォームを挿入
    const checkbox = todoItem.querySelector('.todo-checkbox');
    const deleteBtn = todoItem.querySelector('.delete-btn');
    todoItem.insertBefore(editForm, deleteBtn);
    
    // フォームのイベントリスナー
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateTodo(todoId, editForm);
    });
    
    editForm.querySelector('.cancel-btn').addEventListener('click', () => {
        todoItem.classList.remove('editing');
        editForm.remove();
    });
    
    // 最初の入力欄にフォーカス
    editForm.querySelector('input').focus();
}

// TODO更新
async function updateTodo(todoId, form) {
    const title = form.querySelector('input').value.trim();
    const description = form.querySelector('textarea').value.trim();
    
    const updateData = {
        title: title,
        description: description
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/todos/${todoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });
        
        if (response.ok) {
            loadTodos();
        }
    } catch (error) {
        console.error('TODOの更新に失敗しました:', error);
    }
}

// フィルター変更
function handleFilterChange(e) {
    // アクティブなボタンを更新
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // フィルターを更新して再表示
    currentFilter = e.target.dataset.filter;
    loadTodos();
}