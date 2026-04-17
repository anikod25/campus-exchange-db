from fastapi import FastAPI
# import pydantic
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from database import get_connection


from routers import students, resources, transactions

# creating fastapi application;
app = FastAPI(title="Campus Exchange")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # making a small change for the time being, will keep a specific link once we have a proper server to run at.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# connecting to our routers;

app.include_router(students.router, prefix="/students", tags=["Students"])
app.include_router(resources.router, prefix="/resources", tags=["Resources"])
app.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])

from routers.students import list_departments
app.add_api_route("/departments", list_departments, tags=["Departments"])

@app.get("/dashboard/stats", tags=["System"])
async def dashboard_stats():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT
                (SELECT COUNT(*) FROM Resources) AS total_resources,
                (SELECT COUNT(*) FROM Resources WHERE curr_status='available') AS available,
                (SELECT COUNT(*) FROM Resources WHERE curr_status='borrowed') AS borrowed,
                (SELECT COUNT(*) FROM Students) AS total_students
        """)
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

# heathcheck endpoint
@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "version": "0.1.0"}

# just for testing:
@app.get("/")
async def root():
    return {
        "message": "Campus Exchange",
        "docs": "/docs"
    }