from fastapi import FastAPI, HTTPException, status, Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

app = FastAPI(
    title="Todo App API",
    description="A simple Todo application built with FastAPI",
    version="0.1.0"
)

# テンプレートと静的ファイルの設定
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "todo-app"
    }


class TodoBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Todo項目のタイトル")
    description: Optional[str] = Field(None, max_length=1000, description="Todo項目の詳細説明")
    completed: bool = Field(False, description="完了状態")


class TodoCreate(TodoBase):
    pass


class TodoUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    completed: Optional[bool] = None


class Todo(TodoBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


# メモリ内データストア
todos_db: List[dict] = []
todo_counter: int = 0


# APIルート - すべてのTodo項目を取得
@app.get("/api/todos", response_model=List[Todo])
def get_todos(completed: Optional[bool] = None):
    if completed is None:
        return todos_db
    return [todo for todo in todos_db if todo["completed"] == completed]


# APIルート - 特定のTodo項目を取得
@app.get("/api/todos/{todo_id}", response_model=Todo)
def get_todo(todo_id: int):
    for todo in todos_db:
        if todo["id"] == todo_id:
            return todo
    raise HTTPException(status_code=404, detail="Todo not found")


# APIルート - 新しいTodo項目を作成
@app.post("/api/todos", response_model=Todo, status_code=status.HTTP_201_CREATED)
def create_todo(todo: TodoCreate):
    global todo_counter
    todo_counter += 1
    now = datetime.now()
    
    new_todo = {
        "id": todo_counter,
        "title": todo.title,
        "description": todo.description,
        "completed": todo.completed,
        "created_at": now,
        "updated_at": now
    }
    
    todos_db.append(new_todo)
    return new_todo


# APIルート - Todo項目を更新
@app.put("/api/todos/{todo_id}", response_model=Todo)
def update_todo(todo_id: int, todo_update: TodoUpdate):
    for index, todo in enumerate(todos_db):
        if todo["id"] == todo_id:
            if todo_update.title is not None:
                todo["title"] = todo_update.title
            if todo_update.description is not None:
                todo["description"] = todo_update.description
            if todo_update.completed is not None:
                todo["completed"] = todo_update.completed
            
            todo["updated_at"] = datetime.now()
            todos_db[index] = todo
            return todo
    
    raise HTTPException(status_code=404, detail="Todo not found")


# APIルート - 完了状態を切り替え
@app.patch("/api/todos/{todo_id}/toggle", response_model=Todo)
def toggle_todo(todo_id: int):
    for index, todo in enumerate(todos_db):
        if todo["id"] == todo_id:
            todo["completed"] = not todo["completed"]
            todo["updated_at"] = datetime.now()
            todos_db[index] = todo
            return todo
    
    raise HTTPException(status_code=404, detail="Todo not found")


# APIルート - Todo項目を削除
@app.delete("/api/todos/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_todo(todo_id: int):
    for index, todo in enumerate(todos_db):
        if todo["id"] == todo_id:
            del todos_db[index]
            return
    
    raise HTTPException(status_code=404, detail="Todo not found")