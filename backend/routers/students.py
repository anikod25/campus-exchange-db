from fastapi import APIRouter, HTTPException
from database import get_connection
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"])

router = APIRouter()

# register and login classes
class StudentRegister(BaseModel):
    std_id: int
    name: str
    mail_id: EmailStr
    password: str
    year_of_study: int
    dept_id: int


class StudentLogin(BaseModel):
    mail_id: EmailStr
    password: str

# methods for creating accounts in db, login

@router.post("/register")
def register(student: StudentRegister):
    if not (1 <= student.year_of_study <= 4):
        raise HTTPException(status_code=422, detail="year_of_study must be between 1 and 4.")

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        hashed = pwd_context.hash(student.password)
        cursor.execute(
            """INSERT INTO Students (std_id, name, mail_id, password_hash, year_of_study, dept_id)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (student.std_id, student.name, student.mail_id,
             hashed, student.year_of_study, student.dept_id)
        )
        conn.commit()
        return {"message": "Student registered successfully.", "std_id": student.std_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.post("/login")
def login(credentials: StudentLogin):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT * FROM Students WHERE mail_id = %s", (credentials.mail_id,)
        )
        student = cursor.fetchone()
        if not student or not pwd_context.verify(credentials.password, student["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        student.pop("password_hash", None)
        return {"message": "Login successful.", "student": student}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# fixing the positioning of this function.

@router.get("/")
def list_students():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """SELECT s.std_id, s.name, s.mail_id, s.year_of_study, d.dept_name
               FROM Students s
               JOIN Departments d ON d.dept_id = s.dept_id
               ORDER BY s.std_id"""
        )
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


# adding departments

@router.get("/departments")
def list_departments():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM Departments ORDER BY dept_id")
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

@router.get("/{std_id}")
def get_student(std_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """SELECT s.std_id, s.name, s.mail_id, s.year_of_study, d.dept_name
               FROM Students s
               JOIN Departments d ON d.dept_id = s.dept_id
               WHERE s.std_id = %s""",
            (std_id,)
        )
        student = cursor.fetchone()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found.")
        return student
    finally:
        cursor.close()
        conn.close()


