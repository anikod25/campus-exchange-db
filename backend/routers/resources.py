from fastapi import APIRouter, HTTPException
from database import get_connection
from typing import Optional
from pydantic import BaseModel #, EmailStr
#from passlib.context import CryptContext

router = APIRouter()

class DonateRequest(BaseModel):
    title: str
    author_model: Optional[str] = None
    category: Optional[str] = None
    donor_id: int
    condition: str

# Donate: calls sp_donate_resource

@router.post("/donate")
def donate_resource(req: DonateRequest):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.callproc("sp_donate_resource", [
            req.title, req.author_model, req.category,
            req.donor_id, req.condition
        ])
        
        ret_val = None
        for result in cursor.stored_results():
            ret_val = result.fetchone()
            
        conn.commit()
        return ret_val
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# List down all the available resources

@router.get("/")
def list_resources(category: Optional[str] = None, 
                   status: Optional[str] = None,
                   condition: Optional[str] = None):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT r.*, s.name AS donor_name
            FROM Resources r
            LEFT JOIN Students s ON s.std_id = r.donor_id
            WHERE 1=1
        """
        params = []
        if category:
            query += " AND r.category = %s"
            params.append(category)
        if status:
            query += " AND r.curr_status = %s"
            params.append(status)
        if condition: 
            query += " AND r.item_condition = %s"
            params.append(condition)
        query += " ORDER BY r.res_id"
        cursor.execute(query, params)
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


# Get a single id:

@router.get("/{res_id}")
def get_resource(res_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """SELECT r.*, s.name AS donor_name
               FROM Resources r
               LEFT JOIN Students s ON s.std_id = r.donor_id
               WHERE r.res_id = %s""",
            (res_id,)
        )
        resource = cursor.fetchone()
        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found.")
        return resource
    finally:
        cursor.close()
        conn.close()

# availability status using: fn_resource_status

@router.get("/{res_id}/status")
def resource_status(res_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT fn_resource_status(%s)", (res_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Resource not found.")
        return {"res_id": res_id, "status": row[0]}
    finally:
        cursor.close()
        conn.close()


