# Todo App - FastAPI

A simple Todo application built with FastAPI.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the application:
```bash
uvicorn main:app --reload
```

3. Access the API:
- API documentation: http://localhost:8000/docs
- Alternative documentation: http://localhost:8000/redoc
- Health check: http://localhost:8000/health

## Project Structure
```
todo-app/
├── main.py          # FastAPI application
├── requirements.txt # Project dependencies
└── README.md       # This file
```