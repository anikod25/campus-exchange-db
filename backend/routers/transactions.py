from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import date
from database import get_connection
import sys

router = APIRouter()

class BorrowRequest(BaseModel):
    res_id: int
    sender_id: int
    receiver_id: int
    due_date: date

class WaitlistRequest(BaseModel):
    res_id: int
    stud_id: int


@router.post("/borrow")
def borrow_resource(req: BorrowRequest):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Get the actual donor from database
        cursor.execute("SELECT donor_id FROM Resources WHERE res_id = %s", (req.res_id,))
        res = cursor.fetchone()
        if not res:
            raise HTTPException(status_code=404, detail="Resource not found.")
            
        true_donor_id = res["donor_id"]
        
        # The frontend sends sender_id as the borrower making the request
        borrower_id = req.sender_id  # The person making the borrow request
        donor_id = true_donor_id     # The actual resource owner

        if donor_id == borrower_id:
            raise HTTPException(status_code=400, detail="You cannot borrow a resource you have donated.")

        # Convert date to string for MySQL
        due_date_str = str(req.due_date)
        
        print(f"[BORROW] Calling sp_borrow_resource({req.res_id}, {donor_id}, {borrower_id}, {due_date_str})", file=sys.stderr)
        
        # Call stored procedure
        cursor.callproc("sp_borrow_resource", [req.res_id, donor_id, borrower_id, due_date_str])
        
        ret_val = None
        for result in cursor.stored_results():
            ret_val = result.fetchone()
        
        if ret_val is None:
            raise HTTPException(status_code=400, detail="Stored procedure did not return a result")
        
        print(f"[BORROW] Success: {ret_val}", file=sys.stderr)
        conn.commit()
        return ret_val
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BORROW] ERROR: {str(e)}", file=sys.stderr)
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.post("/return/{tran_id}")
def return_resource(tran_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.callproc("sp_return_resource", [tran_id])
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


@router.post("/validate/{tran_id}")
def validate_borrowing(tran_id: int):
    """Mark a borrowing as validated/confirmed by the donor"""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("UPDATE Transactions SET validated = 1 WHERE tran_id = %s", (tran_id,))
        conn.commit()
        return {"message": "Borrowing validated successfully.", "tran_id": tran_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.post("/waitlist")
def join_waitlist(req: WaitlistRequest):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT donor_id FROM Resources WHERE res_id = %s", (req.res_id,))
        res = cursor.fetchone()
        if not res:
            raise HTTPException(status_code=404, detail="Resource not found.")
        if res["donor_id"] == req.stud_id:
            raise HTTPException(status_code=400, detail="You cannot join the waitlist for a resource you have donated.")

        cursor.callproc("sp_join_waitlist", [req.res_id, req.stud_id])
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



# GET all transactions (for transactions tab)
@router.get("/")
def list_transactions(user_id: Optional[int] = None, is_admin: Optional[bool] = False):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if user_id and not is_admin:
            # Non-admin: only their own transactions
            cursor.execute("""
                SELECT t.*, r.title AS resource_title,
                       s.name AS sender_name, rc.name AS receiver_name
                FROM Transactions t
                JOIN Resources r ON r.res_id = t.res_id
                JOIN Students s  ON s.std_id = t.sender_id
                JOIN Students rc ON rc.std_id = t.receiver_id
                WHERE t.sender_id = %s OR t.receiver_id = %s
                ORDER BY t.issue_date DESC
            """, (user_id, user_id))
        else:
            # Admin: all transactions
            cursor.execute("""
                SELECT t.*, r.title AS resource_title,
                       s.name AS sender_name, rc.name AS receiver_name
                FROM Transactions t
                JOIN Resources r ON r.res_id = t.res_id
                JOIN Students s  ON s.std_id = t.sender_id
                JOIN Students rc ON rc.std_id = t.receiver_id
                ORDER BY t.issue_date DESC
            """)
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

@router.get("/waitlist")
def list_waitlist():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT w.*, r.title AS resource_title, s.name AS student_name
            FROM Waitlist w
            JOIN Resources r ON r.res_id = w.res_id
            JOIN Students s ON s.std_id = w.stud_id
            ORDER BY w.res_id, w.priority
        """)
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

@router.get("/overdue")
def overdue_report():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.callproc("sp_overdue_report")
        for result in cursor.stored_results():
            return result.fetchall()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.get("/student/{std_id}")
def student_transactions(std_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """SELECT t.*, r.title AS resource_title,
                      sender.name   AS sender_name,
                      receiver.name AS receiver_name
               FROM Transactions t
               JOIN Resources r  ON r.res_id  = t.res_id
               JOIN Students sender   ON sender.std_id   = t.sender_id
               JOIN Students receiver ON receiver.std_id = t.receiver_id
               WHERE t.sender_id = %s OR t.receiver_id = %s
               ORDER BY t.issue_date DESC""",
            (std_id, std_id)
        )
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


@router.get("/active-borrows/{std_id}")
def active_borrows(std_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT fn_active_borrows(%s)", (std_id,))
        row = cursor.fetchone()
        return {"std_id": std_id, "active_borrows": row[0]}
    finally:
        cursor.close()
        conn.close()



# DELETE from waitlist
@router.delete("/waitlist/{waitlist_id}")
def remove_from_waitlist(waitlist_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM Waitlist WHERE waitlist_id = %s", (waitlist_id,))
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Waitlist entry not found.")
        return {"message": "Removed from waitlist successfully."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()