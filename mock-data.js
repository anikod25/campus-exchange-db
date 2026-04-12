const MOCK_STATS = {
  total_resources: 4,
  available: 2,
  borrowed: 1,
  total_students: 4
};

const MOCK_TRANSACTIONS = [
  { tran_id: 401, res_id: 202, sender_id: 102, receiver_id: 103,
    issue_date: "2025-03-01", due_date: "2025-03-15", return_date: null,
    resource_title: "Operating System Concepts",
    sender_name: "Priya Sharma", receiver_name: "Rohan Kulkarni" }
];

const MOCK_RESOURCES = [
  { res_id: 201, title: "Introduction to Algorithms", author_model: "CLRS",
    category: "Textbook", donor_id: 101, donor_name: "Aarav Mehta",
    curr_status: "available", item_condition: "good" },
  { res_id: 202, title: "Operating System Concepts", author_model: "Silberschatz",
    category: "Textbook", donor_id: 102, donor_name: "Priya Sharma",
    curr_status: "borrowed", item_condition: "fair" },
  { res_id: 203, title: "Arduino Uno R3", author_model: "Arduino",
    category: "Hardware", donor_id: 103, donor_name: "Rohan Kulkarni",
    curr_status: "available", item_condition: "good" },
  { res_id: 204, title: "Engineering Drawing Board", author_model: null,
    category: "Equipment", donor_id: 104, donor_name: "Sneha Patil",
    curr_status: "waitlisted", item_condition: "fair" }
];

const MOCK_STUDENTS = [
  { std_id: 101, name: "Aniket Kodgirwar",    mail_id: "student101@example.com",    year_of_study: 2, dept_id: 1, dept_name: "Computer Science & Engineering" },
  { std_id: 102, name: "Arnav Kulkarni",   mail_id: "student102@example.com",   year_of_study: 1, dept_id: 1, dept_name: "Computer Science & Engineering" },
  { std_id: 103, name: "Aaryan Kumbhare", mail_id: "student103@example.com", year_of_study: 3, dept_id: 2, dept_name: "Electronics & Communication" },
  { std_id: 104, name: "Dhruv Gupta",    mail_id: "student104@example.com",    year_of_study: 4, dept_id: 3, dept_name: "Mechanical Engineering" }
];

const MOCK_WAITLIST = [
  { waitlist_id: 301, res_id: 204, stud_id: 101, reg_date: "2025-03-10", priority: 1,
    student_name: "Aarav Mehta", resource_title: "Engineering Drawing Board" },
  { waitlist_id: 302, res_id: 204, stud_id: 102, reg_date: "2025-03-12", priority: 2,
    student_name: "Priya Sharma", resource_title: "Engineering Drawing Board" }
];
