CREATE DATABASE IF NOT EXISTS campus_exchange_system;
USE campus_exchange_system;
 
CREATE TABLE Departments (
    dept_id     INT           PRIMARY KEY,
    dept_name   VARCHAR(100)  NOT NULL UNIQUE
);
 
CREATE TABLE Students (
    std_id        INT           PRIMARY KEY,
    name          VARCHAR(100)  NOT NULL,
    mail_id       VARCHAR(150)  NOT NULL UNIQUE,
    year_of_study INT           NOT NULL CHECK (year_of_study BETWEEN 1 AND 4),
    dept_id       INT           NOT NULL,
    CONSTRAINT fk_student_dept
        FOREIGN KEY (dept_id) REFERENCES Departments(dept_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);
 
CREATE TABLE Resources (
    res_id         INT           PRIMARY KEY,
    title          VARCHAR(200)  NOT NULL,
    author_model   VARCHAR(150),
    category       VARCHAR(100),
    donor_id       INT,
    curr_status    VARCHAR(50)   NOT NULL DEFAULT 'available',
    item_condition VARCHAR(50),
    CONSTRAINT fk_resource_donor
        FOREIGN KEY (donor_id) REFERENCES Students(std_id)
        ON DELETE SET NULL ON UPDATE CASCADE
);
 
CREATE TABLE Waitlist (
    waitlist_id INT  PRIMARY KEY,
    res_id      INT  NOT NULL,
    stud_id     INT  NOT NULL,
    reg_date    DATE NOT NULL DEFAULT (CURRENT_DATE),
    priority    INT  NOT NULL DEFAULT 0,
    CONSTRAINT fk_waitlist_resource
        FOREIGN KEY (res_id)   REFERENCES Resources(res_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_waitlist_student
        FOREIGN KEY (stud_id)  REFERENCES Students(std_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_waitlist_res_stud UNIQUE (res_id, stud_id)
);
 
CREATE TABLE Transactions (
    tran_id     INT  PRIMARY KEY,
    res_id      INT  NOT NULL,
    sender_id   INT  NOT NULL,
    receiver_id INT  NOT NULL,
    issue_date  DATE NOT NULL DEFAULT (CURRENT_DATE),
    due_date    DATE,
    return_date DATE,
    CONSTRAINT fk_tran_resource
        FOREIGN KEY (res_id)       REFERENCES Resources(res_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_tran_sender
        FOREIGN KEY (sender_id)    REFERENCES Students(std_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_tran_receiver
        FOREIGN KEY (receiver_id)  REFERENCES Students(std_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_due_after_issue
        CHECK (due_date   IS NULL OR due_date   >= issue_date),
    CONSTRAINT chk_return_after_issue
        CHECK (return_date IS NULL OR return_date >= issue_date)
);
 
INSERT INTO Departments (dept_id, dept_name) VALUES
    (1, 'Computer Science & Engineering'),
    (2, 'Electronics & Communication'),
    (3, 'Mechanical Engineering'),
    (4, 'Civil Engineering');
 
INSERT INTO Students (std_id, name, mail_id, year_of_study, dept_id) VALUES
    (101, 'Aniket Kodgirwar', 'student101@example.com', 2, 1),
    (102, 'Arnav Kulkarni',   'student102@example.com',  1, 1),
    (103, 'Aaryan Kumbhare',  'student103@example.com',  3, 2),
    (104, 'Dhruv Gupta',      'student104@example.com',      4, 3);
 
INSERT INTO Resources (res_id, title, author_model, category, donor_id, curr_status, item_condition) VALUES
    (201, 'Introduction to Algorithms', 'CLRS',         'Textbook',  101, 'available',  'good'),
    (202, 'Operating System Concepts',  'Silberschatz', 'Textbook',  102, 'borrowed',   'fair'),
    (203, 'Arduino Uno R3',             'Arduino',      'Hardware',  103, 'available',  'good'),
    (204, 'Engineering Drawing Board',  NULL,           'Equipment', 104, 'waitlisted', 'fair');
 
INSERT INTO Waitlist (waitlist_id, res_id, stud_id, reg_date, priority) VALUES
    (301, 204, 101, '2025-03-10', 1),
    (302, 204, 102, '2025-03-12', 2);
 
INSERT INTO Transactions (tran_id, res_id, sender_id, receiver_id, issue_date, due_date, return_date) VALUES
    (401, 202, 102, 103, '2025-03-01', '2025-03-15', NULL);
 
DELIMITER $$
 
CREATE FUNCTION fn_is_overdue(p_tran_id INT)
RETURNS TINYINT(1)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_due    DATE;
    DECLARE v_return DATE;
 
    SELECT due_date, return_date
    INTO   v_due, v_return
    FROM   Transactions
    WHERE  tran_id = p_tran_id;
 
    IF v_return IS NULL AND v_due IS NOT NULL AND v_due < CURRENT_DATE THEN
        RETURN 1;
    END IF;
    RETURN 0;
END$$
 
CREATE FUNCTION fn_days_overdue(p_tran_id INT)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_due    DATE;
    DECLARE v_return DATE;
 
    SELECT due_date, return_date
    INTO   v_due, v_return
    FROM   Transactions
    WHERE  tran_id = p_tran_id;
 
    IF v_return IS NULL AND v_due IS NOT NULL AND v_due < CURRENT_DATE THEN
        RETURN DATEDIFF(CURRENT_DATE, v_due);
    END IF;
    RETURN 0;
END$$
 
CREATE FUNCTION fn_resource_status(p_res_id INT)
RETURNS VARCHAR(50)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_open_txn  INT DEFAULT 0;
    DECLARE v_waitlisted INT DEFAULT 0;
 
    SELECT COUNT(*) INTO v_open_txn
    FROM   Transactions
    WHERE  res_id = p_res_id AND return_date IS NULL;
 
    IF v_open_txn > 0 THEN
        RETURN 'borrowed';
    END IF;
 
    SELECT COUNT(*) INTO v_waitlisted
    FROM   Waitlist
    WHERE  res_id = p_res_id;
 
    IF v_waitlisted > 0 THEN
        RETURN 'waitlisted';
    END IF;
 
    RETURN 'available';
END$$
 
CREATE FUNCTION fn_active_borrows(p_std_id INT)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_count INT DEFAULT 0;
 
    SELECT COUNT(*) INTO v_count
    FROM   Transactions
    WHERE  receiver_id  = p_std_id
      AND  return_date  IS NULL;
 
    RETURN v_count;
END$$
 
CREATE FUNCTION fn_next_in_waitlist(p_res_id INT)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_stud_id INT DEFAULT NULL;
 
    SELECT stud_id INTO v_stud_id
    FROM   Waitlist
    WHERE  res_id = p_res_id
    ORDER  BY priority ASC
    LIMIT  1;
 
    RETURN v_stud_id;
END$$
 
CREATE TRIGGER trg_prevent_self
BEFORE INSERT ON Transactions
FOR EACH ROW
BEGIN
    IF NEW.sender_id = NEW.receiver_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A student cannot borrow a resource from themselves.';
    END IF;
END$$
 
CREATE TRIGGER trg_block_borrowed
BEFORE INSERT ON Transactions
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(50);
 
    SELECT curr_status INTO v_status
    FROM   Resources
    WHERE  res_id = NEW.res_id;
 
    IF v_status != 'available' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Resource is not available for borrowing.';
    END IF;
END$$
 
CREATE TRIGGER trg_auto_status
AFTER INSERT ON Transactions
FOR EACH ROW
BEGIN
    UPDATE Resources
    SET    curr_status = 'borrowed'
    WHERE  res_id = NEW.res_id;
END$$
 
CREATE TRIGGER trg_return_status
AFTER UPDATE ON Transactions
FOR EACH ROW
BEGIN
    DECLARE v_next_student INT DEFAULT NULL;
 
    -- Only act when return_date transitions from NULL to a real date
    IF OLD.return_date IS NULL AND NEW.return_date IS NOT NULL THEN
 
        SET v_next_student = fn_next_in_waitlist(NEW.res_id);
 
        IF v_next_student IS NOT NULL THEN
            -- Keep status waitlisted and remove that student from the queue
            UPDATE Resources
            SET    curr_status = 'waitlisted'
            WHERE  res_id = NEW.res_id;
 
            DELETE FROM Waitlist
            WHERE  res_id  = NEW.res_id
              AND  stud_id = v_next_student;
        ELSE
            UPDATE Resources
            SET    curr_status = 'available'
            WHERE  res_id = NEW.res_id;
        END IF;
 
    END IF;
END$$
 
CREATE TRIGGER trg_log_condition
BEFORE UPDATE ON Resources
FOR EACH ROW
BEGIN
    -- Condition ranking: excellent > good > fair > poor
    -- Signal a notice if condition got worse
    IF OLD.item_condition = 'good'      AND NEW.item_condition = 'fair'  THEN
        SET NEW.item_condition = 'fair';  -- allow update but can log here
    ELSEIF OLD.item_condition = 'fair'  AND NEW.item_condition = 'poor'  THEN
        SET NEW.item_condition = 'poor';
    ELSEIF OLD.item_condition = 'good'  AND NEW.item_condition = 'poor'  THEN
        SET NEW.item_condition = 'poor';
    END IF;
    -- To write to an audit table add: INSERT INTO ResourceConditionLog ...
END$$
 
 
CREATE PROCEDURE sp_borrow_resource(
    IN p_res_id      INT,
    IN p_sender_id   INT,
    IN p_receiver_id INT,
    IN p_due_date    DATE
)
BEGIN
    DECLARE v_status     VARCHAR(50);
    DECLARE v_borrows    INT;
    DECLARE v_new_tran_id INT;
    DECLARE v_donor_id   INT;
 
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
 
    START TRANSACTION;
 
    -- Validate resource exists and is available
    SELECT curr_status, donor_id INTO v_status, v_donor_id
    FROM   Resources
    WHERE  res_id = p_res_id
    FOR UPDATE;
 
    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Resource not found.';
    END IF;
 
    IF v_status != 'available' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Resource is not available for borrowing.';
    END IF;
 
    IF v_donor_id = p_receiver_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'You cannot borrow a resource you have donated.';
    END IF;

    -- Validate sender ≠ receiver
    IF p_sender_id = p_receiver_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Sender and receiver cannot be the same student.';
    END IF;
 
    -- Enforce borrow limit
    SET v_borrows = fn_active_borrows(p_receiver_id);
    IF v_borrows >= 3 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student has reached the maximum active borrow limit of 3.';
    END IF;
 
    -- Generate next tran_id
    SELECT IFNULL(MAX(tran_id), 400) + 1 INTO v_new_tran_id FROM Transactions;
 
    -- Insert transaction (trg_auto_status will set status = 'borrowed')
    INSERT INTO Transactions (tran_id, res_id, sender_id, receiver_id, issue_date, due_date)
    VALUES (v_new_tran_id, p_res_id, p_sender_id, p_receiver_id, CURRENT_DATE, p_due_date);
 
    COMMIT;
 
    SELECT v_new_tran_id AS new_tran_id,
           'Resource borrowed successfully.' AS message;
END$$
 
CREATE PROCEDURE sp_return_resource(
    IN p_tran_id INT
)
BEGIN
    DECLARE v_return_date DATE;
    DECLARE v_res_id      INT;
 
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
 
    START TRANSACTION;
 
    SELECT return_date, res_id
    INTO   v_return_date, v_res_id
    FROM   Transactions
    WHERE  tran_id = p_tran_id
    FOR UPDATE;
 
    IF v_return_date IS NOT NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'This transaction has already been returned.';
    END IF;

    UPDATE Transactions
    SET    return_date = CURRENT_DATE
    WHERE  tran_id = p_tran_id;
 
    COMMIT;
 
    SELECT p_tran_id AS tran_id,
           fn_resource_status(v_res_id) AS new_resource_status,
           'Resource returned successfully.' AS message;
END$$
 
CREATE PROCEDURE sp_join_waitlist(
    IN p_res_id   INT,
    IN p_stud_id  INT
)
BEGIN
    DECLARE v_exists      INT DEFAULT 0;
    DECLARE v_next_priority INT DEFAULT 1;
    DECLARE v_new_id       INT;
    DECLARE v_donor_id     INT;
 
    -- Prevent user from waitlisting their own resource
    SELECT donor_id INTO v_donor_id
    FROM   Resources
    WHERE  res_id = p_res_id;
    
    IF v_donor_id = p_stud_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'You cannot join the waitlist for a resource you have donated.';
    END IF;

    -- Check for existing entry
    SELECT COUNT(*) INTO v_exists
    FROM   Waitlist
    WHERE  res_id = p_res_id AND stud_id = p_stud_id;
 
    IF v_exists > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student is already on the waitlist for this resource.';
    END IF;
 
    -- Auto-assign next priority
    SELECT IFNULL(MAX(priority), 0) + 1 INTO v_next_priority
    FROM   Waitlist
    WHERE  res_id = p_res_id;
 
    -- Auto-assign next waitlist_id
    SELECT IFNULL(MAX(waitlist_id), 300) + 1 INTO v_new_id FROM Waitlist;
 
    INSERT INTO Waitlist (waitlist_id, res_id, stud_id, reg_date, priority)
    VALUES (v_new_id, p_res_id, p_stud_id, CURRENT_DATE, v_next_priority);
 
    SELECT v_new_id        AS waitlist_id,
           v_next_priority AS priority,
           'Added to waitlist successfully.' AS message;
END$$
 
CREATE PROCEDURE sp_donate_resource(
    IN p_title          VARCHAR(200),
    IN p_author_model   VARCHAR(150),
    IN p_category       VARCHAR(100),
    IN p_donor_id       INT,
    IN p_condition      VARCHAR(50)
)
BEGIN
    DECLARE v_new_res_id INT;
 
    SELECT IFNULL(MAX(res_id), 200) + 1 INTO v_new_res_id FROM Resources;
 
    INSERT INTO Resources (res_id, title, author_model, category, donor_id, curr_status, item_condition)
    VALUES (v_new_res_id, p_title, p_author_model, p_category, p_donor_id, 'available', p_condition);
 
    SELECT v_new_res_id AS new_res_id,
           'Resource donated and listed successfully.' AS message;
END$$
 
CREATE PROCEDURE sp_overdue_report()
BEGIN
    SELECT
        t.tran_id,
        s.name                           AS borrower_name,
        s.mail_id                        AS borrower_email,
        r.title                          AS resource_title,
        t.issue_date,
        t.due_date,
        fn_days_overdue(t.tran_id)       AS days_overdue
    FROM  Transactions t
    JOIN  Students     s ON s.std_id = t.receiver_id
    JOIN  Resources    r ON r.res_id = t.res_id
    WHERE fn_is_overdue(t.tran_id) = 1
    ORDER BY days_overdue DESC;
END$$
 
DELIMITER ;
 

-- adding a new column for a password for students: 
ALTER TABLE Students ADD COLUMN password_hash VARCHAR(255) NOT NULL;


