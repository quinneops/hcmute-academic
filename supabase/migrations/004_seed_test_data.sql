-- Test Data Seed for Academic Nexus App
-- Generated: 2026-03-29
-- Purpose: Comprehensive test data for all roles and features

-- ============================================================================
-- HELPER: Disable RLS for seeding (service role)
-- ============================================================================
-- Note: Run this with service role key or as postgres superuser
-- ALTER DATABASE postgres SET "app.settings.always_allow_write" TO 'true';

-- ============================================================================
-- 1. SEMESTERS
-- ============================================================================

INSERT INTO semesters (id, name, academic_year, semester_number, start_date, end_date, registration_start, registration_end, is_active, is_current) VALUES
  ('00000000-0000-0000-0000-000000000001', 'HK1 2024-2025', '2024-2025', 1, '2024-08-01', '2024-12-31', '2024-07-01', '2024-08-15', false, false),
  ('00000000-0000-0000-0000-000000000002', 'HK2 2024-2025', '2024-2025', 2, '2025-01-01', '2025-05-31', '2024-12-01', '2025-01-15', true, true),
  ('00000000-0000-0000-0000-000000000003', 'HK3 2024-2025', '2024-2025', 3, '2025-06-01', '2025-08-31', '2025-05-01', '2025-06-15', false, false),
  ('00000000-0000-0000-0000-000000000004', 'HK1 2025-2026', '2025-2026', 1, '2025-08-01', '2025-12-31', '2025-07-01', '2025-08-15', false, false);

-- ============================================================================
-- 2. SUBMISSION ROUNDS (for current semester)
-- ============================================================================

INSERT INTO submission_rounds (semester_id, round_number, name, description, start_date, end_date, grace_period_hours, max_file_size_mb, allowed_file_types, is_active, weight_percentage) VALUES
  ('00000000-0000-0000-0000-000000000002', 1, 'Đề cương chi tiết', 'Nộp đề cương chi tiết và bảo vệ đề cương', '2025-01-05', '2025-02-15', 24, 20, '{pdf,docx}', true, 15.00),
  ('00000000-0000-0000-0000-000000000002', 2, 'Báo cáo tiến độ 1', 'Nộp báo cáo tiến độ 30%', '2025-02-20', '2025-03-20', 24, 20, '{pdf}', true, 20.00),
  ('00000000-0000-0000-0000-000000000002', 3, 'Báo cáo tiến độ 2', 'Nộp báo cáo tiến độ 60%', '2025-03-25', '2025-04-20', 24, 20, '{pdf}', true, 25.00),
  ('00000000-0000-0000-0000-000000000002', 4, 'Khóa luận tốt nghiệp', 'Nộp khóa luận hoàn chỉnh và bảo vệ', '2025-04-25', '2025-05-25', 48, 50, '{pdf}', true, 40.00);

-- ============================================================================
-- 3. PROFILES (Users will be created via auth, these are metadata)
-- Note: In production, profiles are auto-created by trigger on auth.users
-- For testing, we'll create auth users first, then these profile records
-- ============================================================================

-- ADMIN users
INSERT INTO profiles (id, email, full_name, role, student_code, lecturer_code, department, faculty, phone, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@ute.edu.vn', 'Nguyễn Văn Admin', 'admin', NULL, NULL, 'Phòng Quản lý Đào tạo', 'Công nghệ Thông tin', '0901001001', true),
  ('11111111-1111-1111-1111-111111111112', 'admin2@ute.edu.vn', 'Trần Thị Hạnh', 'admin', NULL, NULL, 'Phòng Công tác Sinh viên', 'Kỹ thuật Cơ khí', '0901001002', true);

-- LECTURER users
INSERT INTO profiles (id, email, full_name, role, student_code, lecturer_code, department, faculty, phone, is_active, last_login_at) VALUES
  ('22222222-2222-2222-2222-222222222221', 'thay.nguyen@ute.edu.vn', 'TS. Nguyễn Minh Trí', 'lecturer', NULL, 'GV001', 'Công nghệ Phần mềm', 'Công nghệ Thông tin', '0902001001', true, NOW()),
  ('22222222-2222-2222-2222-222222222222', 'co.tran@ute.edu.vn', 'ThS. Trần Thị Lan Anh', 'lecturer', NULL, 'GV002', 'Hệ thống Thông tin', 'Công nghệ Thông tin', '0902001002', true, NOW()),
  ('22222222-2222-2222-2222-222222222223', 'thay.le@ute.edu.vn', 'PGS.TS. Lê Hoàng Dũng', 'lecturer', NULL, 'GV003', 'Khoa học Máy tính', 'Công nghệ Thông tin', '0902001003', true, NOW()),
  ('22222222-2222-2222-2222-222222222224', 'co.pham@ute.edu.vn', 'ThS. Phạm Thị Mai', 'lecturer', NULL, 'GV004', 'Mạng Máy tính', 'Công nghệ Thông tin', '0902001004', true, NOW());

-- STUDENT users
INSERT INTO profiles (id, email, full_name, role, student_code, lecturer_code, department, faculty, phone, is_active, last_login_at) VALUES
  ('33333333-3333-3333-3333-333333333331', 'sv20001@student.ute.vn', 'Nguyễn Văn A', 'student', '20001', NULL, NULL, 'Công nghệ Thông tin', '0903001001', true, NOW()),
  ('33333333-3333-3333-3333-333333333332', 'sv20002@student.ute.vn', 'Trần Thị B', 'student', '20002', NULL, NULL, 'Công nghệ Thông tin', '0903001002', true, NOW()),
  ('33333333-3333-3333-3333-333333333333', 'sv20003@student.ute.vn', 'Lê Văn C', 'student', '20003', NULL, NULL, 'Công nghệ Thông tin', '0903001003', true, NOW()),
  ('33333333-3333-3333-3333-333333333334', 'sv20004@student.ute.vn', 'Phạm Thị D', 'student', '20004', NULL, NULL, 'Công nghệ Thông tin', '0903001004', true, NOW()),
  ('33333333-3333-3333-3333-333333333335', 'sv20005@student.ute.vn', 'Hoàng Văn E', 'student', '20005', NULL, NULL, 'Công nghệ Thông tin', '0903001005', true, NOW()),
  ('33333333-3333-3333-3333-333333333336', 'sv20006@student.ute.vn', 'Vũ Thị F', 'student', '20006', NULL, NULL, 'Công nghệ Thông tin', '0903001006', true, NOW()),
  ('33333333-3333-3333-3333-333333333337', 'sv20007@student.ute.vn', 'Đỗ Văn G', 'student', '20007', NULL, NULL, 'Công nghệ Thông tin', '0903001007', true, NOW()),
  ('33333333-3333-3333-3333-333333333338', 'sv20008@student.ute.vn', 'Bùi Thị H', 'student', '20008', NULL, NULL, 'Công nghệ Thông tin', '0903001008', true, NOW());

-- ============================================================================
-- 4. PROPOSALS (Thesis topics)
-- ============================================================================

INSERT INTO proposals (id, title, description, category, tags, supervisor_id, co_supervisor_id, semester_id, status, max_students, requirements, estimated_duration, is_industrial, company_name, company_mentor, views_count, registrations_count, published_at) VALUES
  -- Proposals by TS. Nguyễn Minh Trí
  ('44444444-4444-4444-4444-444444444441', 'Xây dựng hệ thống gợi ý bài học sử dụng Machine Learning', 'Phát triển hệ thống gợi ý bài học cá nhân hóa cho sinh viên dựa trên lịch sử học tập và sở thích', 'Machine Learning', '{ml,recommendation,python,tensorflow}', '22222222-2222-2222-2222-222222222221', NULL, '00000000-0000-0000-0000-000000000002', 'approved', 2, 'Yêu cầu kiến thức Python, Machine Learning cơ bản', 12, false, NULL, NULL, 45, 2, '2025-01-10'),
  ('44444444-4444-4444-4444-444444444442', 'Phân tích cảm xúc văn bản tiếng Việt dùng Deep Learning', 'Xây dựng mô hình phân tích cảm xúc cho văn bản tiếng Việt trên mạng xã hội', 'NLP', '{nlp,deep-learning,vietnamese,sentiment}', '22222222-2222-2222-2222-222222222221', NULL, '00000000-0000-0000-0000-000000000002', 'approved', 1, 'Kiến thức về NLP và Deep Learning', 14, false, NULL, NULL, 32, 1, '2025-01-12'),

  -- Proposals by ThS. Trần Thị Lan Anh
  ('44444444-4444-4444-4444-444444444443', 'Ứng dụng quản lý thư viện thông minh với QR Code', 'Hệ thống quản lý mượn trả sách tự động sử dụng QR Code và mobile app', 'Web Application', '{web,qr-code,library,react}', '22222222-2222-2222-2222-222222222222', NULL, '00000000-0000-0000-0000-000000000002', 'approved', 2, 'Biết ReactJS, NodeJS', 10, false, NULL, NULL, 28, 2, '2025-01-08'),
  ('44444444-4444-4444-4444-444444444444', 'Hệ thống đặt chỗ trực tuyến cho phòng máy', 'Ứng dụng web cho phép sinh viên đặt chỗ phòng máy tính trước', 'Web Application', '{booking,web,realtime}', '22222222-2222-2222-2222-222222222222', NULL, '00000000-0000-0000-0000-000000000002', 'approved', 1, 'Kiến thức WebSocket, database', 8, false, NULL, NULL, 19, 1, '2025-01-15'),

  -- Proposals by PGS.TS. Lê Hoàng Dũng
  ('44444444-4444-4444-4444-444444444445', 'Cải tiến thuật toán nén ảnh cho thiết bị di động', 'Nghiên cứu và triển khai thuật toán nén ảnh hiệu quả cho mobile', 'Mobile', '{mobile,image-compression,algorithm}', '22222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222221', '00000000-0000-0000-0000-000000000002', 'approved', 2, 'Mạnh về toán, biết Swift hoặc Kotlin', 16, false, NULL, NULL, 51, 2, '2025-01-05'),
  ('44444444-4444-4444-4444-444444444446', 'Blockchain ứng dụng trong quản lý văn bằng', 'Xây dựng hệ thống lưu trữ và xác thực văn bằng sử dụng Blockchain', 'Blockchain', '{blockchain,ethereum,solidity}', '22222222-2222-2222-2222-222222222223', NULL, '00000000-0000-0000-0000-000000000002', 'approved', 1, 'Tìm hiểu về Blockchain, Smart Contract', 14, false, NULL, NULL, 67, 1, '2025-01-03'),

  -- Proposals by ThS. Phạm Thị Mai
  ('44444444-4444-4444-4444-444444444447', 'Hệ thống phát hiện xâm nhập mạng dùng AI', 'Ứng dụng AI để phát hiện các cuộc tấn công mạng bất thường', 'Security', '{security,ai,network,intrusion}', '22222222-2222-2222-2222-222222222224', NULL, '00000000-0000-0000-0000-000000000002', 'approved', 2, 'Kiến thức về mạng máy tính, AI cơ bản', 12, false, NULL, NULL, 38, 1, '2025-01-11'),
  ('44444444-4444-4444-4444-444444444448', 'Ứng dụng IoT giám sát môi trường lớp học', 'Hệ thống cảm biến theo dõi nhiệt độ, độ ẩm, chất lượng không khí', 'IoT', '{iot,sensor,monitoring}', '22222222-2222-2222-2222-222222222224', NULL, '00000000-0000-0000-0000-000000000002', 'pending', 1, 'Biết Arduino/Raspberry Pi', 10, false, NULL, NULL, 15, 0, NULL),

  -- Draft proposals (not yet published)
  ('44444444-4444-4444-4444-444444444449', 'Nghiên cứu về Edge Computing', 'Đề tài nghiên cứu lý thuyết về Edge Computing', 'Research', '{research,edge-computing}', '22222222-2222-2222-2222-222222222221', NULL, '00000000-0000-0000-0000-000000000002', 'draft', 1, 'Nghiên cứu sinh', 20, false, NULL, NULL, 0, 0, NULL);

-- ============================================================================
-- 5. REGISTRATIONS (Student registrations for proposals)
-- ============================================================================

INSERT INTO registrations (id, student_id, proposal_id, status, registration_number, motivation_letter, proposed_title, revised_description, submitted_at, reviewed_at, reviewed_by, review_notes, approved_at, completed_at, final_score, final_grade) VALUES
  -- Student 20001 - Registered for proposal 441 (approved)
  ('55555555-5555-5555-5555-555555555551', '33333333-3333-3333-3333-333333333331', '44444444-4444-4444-4444-444444444441', 'completed', 'REG-2025-001', 'Em rất quan tâm đến Machine Learning và muốn ứng dụng vào giáo dục', 'Hệ thống gợi ý học tập thông minh', NULL, '2025-01-16 10:30:00', '2025-01-17 14:00:00', '22222222-2222-2222-2222-222222222221', 'Sinh viên có động lực tốt', '2025-01-17 14:30:00', '2025-05-20 09:00:00', 8.75, 'B+'),

  -- Student 20002 - Also registered for proposal 441 (group project)
  ('55555555-5555-5555-5555-555555555552', '33333333-3333-3333-3333-333333333332', '44444444-4444-4444-4444-444444444441', 'completed', 'REG-2025-002', 'Em muốn phát triển kỹ năng AI/ML', 'Hệ thống gợi ý học tập thông minh', NULL, '2025-01-16 11:00:00', '2025-01-17 14:00:00', '22222222-2222-2222-2222-222222222221', 'Nhóm 2 sinh viên', '2025-01-17 14:30:00', '2025-05-20 09:00:00', 8.50, 'B+'),

  -- Student 20003 - Registered for proposal 442
  ('55555555-5555-5555-5555-555555555553', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444442', 'completed', 'REG-2025-003', 'Em quan tâm đến xử lý ngôn ngữ tự nhiên', 'Phân tích cảm xúc bài đăng Facebook', NULL, '2025-01-18 09:15:00', '2025-01-19 10:00:00', '22222222-2222-2222-2222-222222222221', 'OK', '2025-01-19 10:30:00', '2025-05-21 13:30:00', 9.00, 'A'),

  -- Student 20004 & 20005 - Group project for proposal 443
  ('55555555-5555-5555-5555-555555555554', '33333333-3333-3333-3333-333333333334', '44444444-4444-4444-4444-444444444443', 'completed', 'REG-2025-004', 'Thích làm mobile app', 'QLTV QR Code Mobile', NULL, '2025-01-10 14:20:00', '2025-01-11 09:00:00', '22222222-2222-2222-2222-222222222222', 'Phù hợp', '2025-01-11 09:30:00', '2025-05-18 08:00:00', 8.25, 'B'),
  ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333335', '44444444-4444-4444-4444-444444444443', 'completed', 'REG-2025-005', 'Muốn làm việc nhóm', 'QLTV QR Code Mobile', NULL, '2025-01-10 15:00:00', '2025-01-11 09:00:00', '22222222-2222-2222-2222-222222222222', 'Nhóm 2 người', '2025-01-11 09:30:00', '2025-05-18 08:00:00', 8.25, 'B'),

  -- Student 20006 - Registered for proposal 444
  ('55555555-5555-5555-5555-555555555556', '33333333-3333-3333-3333-333333333336', '44444444-4444-4444-4444-444444444444', 'completed', 'REG-2025-006', 'Thích làm hệ thống realtime', 'Đặt chỗ phòng máy online', NULL, '2025-01-16 16:00:00', '2025-01-17 08:30:00', '22222222-2222-2222-2222-222222222222', 'OK', '2025-01-17 09:00:00', '2025-05-19 10:15:00', 7.75, 'C+'),

  -- Student 20007 & 20008 - Group for proposal 445
  ('55555555-5555-5555-5555-555555555557', '33333333-3333-3333-3333-333333333337', '44444444-4444-4444-4444-444444444445', 'completed', 'REG-2025-007', 'Mạnh về toán và algorithm', 'Nén ảnh mobile', NULL, '2025-01-08 11:00:00', '2025-01-09 14:00:00', '22222222-2222-2222-2222-222222222223', 'Sinh viên khá', '2025-01-09 14:30:00', '2025-05-22 14:00:00', 8.90, 'A-'),
  ('55555555-5555-5555-5555-555555555558', '33333333-3333-3333-3333-333333333338', '44444444-4444-4444-4444-444444444445', 'completed', 'REG-2025-008', 'Thích lập trình mobile', 'Nén ảnh mobile', NULL, '2025-01-08 11:30:00', '2025-01-09 14:00:00', '22222222-2222-2222-2222-222222222223', 'Nhóm đủ 2 người', '2025-01-09 14:30:00', '2025-05-22 14:00:00', 8.90, 'A-'),

  -- Pending registrations
  ('55555555-5555-5555-5555-555555555559', '33333333-3333-3333-3333-333333333331', '44444444-4444-4444-4444-444444444446', 'pending', 'REG-2025-009', 'Muốn tìm hiểu blockchain', NULL, NULL, '2025-01-20 10:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('55555555-5555-5555-5555-555555555560', '33333333-3333-3333-3333-333333333332', '44444444-4444-4444-4444-444444444447', 'pending', 'REG-2025-010', 'Quan tâm an ninh mạng', NULL, NULL, '2025-01-21 09:30:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- ============================================================================
-- 6. SUBMISSIONS (Student submissions for each round)
-- ============================================================================

INSERT INTO submissions (id, registration_id, round_id, round_number, file_url, file_name, file_size, file_mime_type, status, submitted_at, late_penalty, graded_at, graded_by, version, comments) VALUES
  -- Registration 551 - Student 20001
  ('66666666-6666-6666-6666-666666666661', '55555555-5555-5555-5555-555555555551', '00000000-0000-0000-0000-000000000011', 1, '/storage/submissions/hk2-2024-2025/reg-001/de-cuong.pdf', 'de_cuong_chi_tiet.pdf', 2458624, 'application/pdf', 'graded', '2025-02-10 23:45:00', 0.00, '2025-02-15 10:00:00', '22222222-2222-2222-2222-222222222221', 1, 'Đề cương tốt, cần bổ sung phương pháp'),
  ('66666666-6666-6666-6666-666666666662', '55555555-5555-5555-5555-555555555551', '00000000-0000-0000-0000-000000000012', 2, '/storage/submissions/hk2-2024-2025/reg-001/tien-do-1.pdf', 'bao_cao_tien_do_1.pdf', 3125789, 'application/pdf', 'graded', '2025-03-15 20:30:00', 0.00, '2025-03-18 14:00:00', '22222222-2222-2222-2222-222222222221', 1, 'Tiến độ đạt yêu cầu'),
  ('66666666-6666-6666-6666-666666666663', '55555555-5555-5555-5555-555555555551', '00000000-0000-0000-0000-000000000013', 3, '/storage/submissions/hk2-2024-2025/reg-001/tien-do-2.pdf', 'bao_cao_tien_do_2.pdf', 4521036, 'application/pdf', 'graded', '2025-04-18 18:00:00', 0.00, '2025-04-22 09:00:00', '22222222-2222-2222-2222-222222222221', 1, 'Hoàn thành tốt'),
  ('66666666-6666-6666-6666-666666666664', '55555555-5555-5555-5555-555555555551', '00000000-0000-0000-0000-000000000014', 4, '/storage/submissions/hk2-2024-2025/reg-001/khoa-luan.pdf', 'khuan_luan_tot_nghiep.pdf', 8945621, 'application/pdf', 'graded', '2025-05-20 08:00:00', 0.00, '2025-05-25 16:00:00', '22222222-2222-2222-2222-222222222221', 1, 'Khóa luận xuất sắc'),

  -- Registration 553 - Student 20003 (got A)
  ('66666666-6666-6666-6666-666666666665', '55555555-5555-5555-5555-555555555553', '00000000-0000-0000-0000-000000000011', 1, '/storage/submissions/hk2-2024-2025/reg-003/de-cuong.pdf', 'de_cuong.pdf', 1856234, 'application/pdf', 'graded', '2025-02-12 22:00:00', 0.00, '2025-02-16 11:00:00', '22222222-2222-2222-2222-222222222221', 1, 'Tốt'),
  ('66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555553', '00000000-0000-0000-0000-000000000012', 2, '/storage/submissions/hk2-2024-2025/reg-003/tien-do-1.pdf', 'tien_do_1.pdf', 2745123, 'application/pdf', 'graded', '2025-03-18 19:00:00', 0.00, '2025-03-20 15:00:00', '22222222-2222-2222-2222-222222222221', 1, 'Rất tốt'),
  ('66666666-6666-6666-6666-666666666667', '55555555-5555-5555-5555-555555555553', '00000000-0000-0000-0000-000000000013', 3, '/storage/submissions/hk2-2024-2025/reg-003/tien-do-2.pdf', 'tien_do_2.pdf', 3987456, 'application/pdf', 'graded', '2025-04-19 14:00:00', 0.00, '2025-04-23 10:00:00', '22222222-2222-2222-2222-222222222221', 1, 'Hoàn thành xuất sắc'),
  ('66666666-6666-6666-6666-666666666668', '55555555-5555-5555-5555-555555555553', '00000000-0000-0000-0000-000000000014', 4, '/storage/submissions/hk2-2024-2025/reg-003/khoa-luan.pdf', 'khoa_luan.pdf', 7456123, 'application/pdf', 'graded', '2025-05-21 07:30:00', 0.00, '2025-05-26 14:00:00', '22222222-2222-2222-2222-222222222221', 1, 'Xuất sắc'),

  -- Late submission example
  ('66666666-6666-6666-6666-666666666669', '55555555-5555-5555-5555-555555555556', '00000000-0000-0000-0000-000000000012', 2, '/storage/submissions/hk2-2024-2025/reg-006/tien-do-1.pdf', 'tien_do_1.pdf', 2123456, 'application/pdf', 'late', '2025-03-22 08:00:00', 2.00, '2025-03-25 10:00:00', '22222222-2222-2222-2222-222222222222', 1, 'Nộp trễ 2 ngày');

-- ============================================================================
-- 7. GRADES
-- ============================================================================

INSERT INTO grades (submission_id, grader_id, grader_role, criteria_scores, criteria_1_score, criteria_2_score, criteria_3_score, criteria_4_score, total_score, weight_percentage, feedback, private_notes, is_published, graded_at) VALUES
  -- Grades for registration 551 (Student 20001 - final 8.75)
  ('66666666-6666-6666-6666-666666666661', '22222222-2222-2222-2222-222222222221', 'supervisor', '{"content": 8.0, "methodology": 8.5, "presentation": 8.0, "qa": 8.0}', 8.0, 8.5, 8.0, 8.0, 8.10, 15.00, 'Đề cương rõ ràng, cần cải thiện phương pháp nghiên cứu', NULL, true, '2025-02-15 10:00:00'),
  ('66666666-6666-6666-6666-666666666662', '22222222-2222-2222-2222-222222222221', 'supervisor', '{"content": 8.5, "methodology": 8.0, "presentation": 8.5, "qa": 8.0}', 8.5, 8.0, 8.5, 8.0, 8.25, 20.00, 'Tiến độ tốt', NULL, true, '2025-03-18 14:00:00'),
  ('66666666-6666-6666-6666-666666666663', '22222222-2222-2222-2222-222222222221', 'supervisor', '{"content": 8.5, "methodology": 8.5, "presentation": 8.0, "qa": 8.5}', 8.5, 8.5, 8.0, 8.5, 8.40, 25.00, 'Hoàn thành tốt các mục tiêu', NULL, true, '2025-04-22 09:00:00'),
  ('66666666-6666-6666-6666-666666666664', '22222222-2222-2222-2222-222222222221', 'supervisor', '{"content": 9.0, "methodology": 8.5, "presentation": 9.0, "qa": 8.5}', 9.0, 8.5, 9.0, 8.5, 8.75, 40.00, 'Khóa luận chất lượng cao, bảo vệ tốt', 'Sinh viên xuất sắc', true, '2025-05-25 16:00:00'),

  -- Grades for registration 553 (Student 20003 - final 9.0)
  ('66666666-6666-6666-6666-666666666665', '22222222-2222-2222-2222-222222222221', 'supervisor', '{"content": 9.0, "methodology": 8.5, "presentation": 8.5, "qa": 9.0}', 9.0, 8.5, 8.5, 9.0, 8.75, 15.00, 'Đề cương xuất sắc', NULL, true, '2025-02-16 11:00:00'),
  ('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222221', 'supervisor', '{"content": 9.0, "methodology": 9.0, "presentation": 8.5, "qa": 9.0}', 9.0, 9.0, 8.5, 9.0, 8.90, 20.00, 'Rất tốt', NULL, true, '2025-03-20 15:00:00'),
  ('66666666-6666-6666-6666-666666666667', '22222222-2222-2222-2222-222222222221', 'supervisor', '{"content": 9.0, "methodology": 9.0, "presentation": 9.0, "qa": 9.0}', 9.0, 9.0, 9.0, 9.0, 9.00, 25.00, 'Xuất sắc', NULL, true, '2025-04-23 10:00:00'),
  ('66666666-6666-6666-6666-666666666668', '22222222-2222-2222-2222-222222222221', 'supervisor', '{"content": 9.5, "methodology": 9.0, "presentation": 9.0, "qa": 9.0}', 9.5, 9.0, 9.0, 9.0, 9.10, 40.00, 'Khóa luận xuất sắc nhất kỳ', 'Ứng cử viên bằng giỏi', true, '2025-05-26 14:00:00'),

  -- Grades for late submission (559 - reduced score)
  ('66666666-6666-6666-6666-666666666669', '22222222-2222-2222-2222-222222222222', 'supervisor', '{"content": 7.0, "methodology": 7.5, "presentation": 7.0, "qa": 7.0}', 7.0, 7.5, 7.0, 7.0, 7.10, 20.00, 'Nội dung ổn nhưng nộp trễ', 'Trừ 2 điểm vì nộp trễ', true, '2025-03-25 10:00:00');

-- ============================================================================
-- 8. COUNCILS (Defense councils)
-- ============================================================================

INSERT INTO councils (id, name, code, semester_id, chair_id, secretary_id, room, scheduled_date, scheduled_time, status, notes) VALUES
  ('77777777-7777-7777-7777-777777777771', 'Hội đồng 1', 'HD-2025-001', '00000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 'P.601', '2025-05-25', '07:30', 'completed', 'Hội đồng bảo vệ khóa luận sáng 25/5'),
  ('77777777-7777-7777-7777-777777777772', 'Hội đồng 2', 'HD-2025-002', '00000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222224', 'P.602', '2025-05-25', '13:00', 'completed', 'Hội đồng bảo vệ khóa luận chiều 25/5'),
  ('77777777-7777-7777-7777-777777777773', 'Hội đồng 3', 'HD-2025-003', '00000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222224', '22222222-2222-2222-2222-222222222221', 'P.603', '2025-05-26', '07:30', 'completed', 'Hội đồng bảo vệ khóa luận sáng 26/5');

-- ============================================================================
-- 9. COUNCIL MEMBERS
-- ============================================================================

INSERT INTO council_members (council_id, member_id, role) VALUES
  -- Council 1
  ('77777777-7777-7777-7777-777777777771', '22222222-2222-2222-2222-222222222223', 'chair'),
  ('77777777-7777-7777-7777-777777777771', '22222222-2222-2222-2222-222222222222', 'secretary'),
  ('77777777-7777-7777-7777-777777777771', '22222222-2222-2222-2222-222222222221', 'member'),

  -- Council 2
  ('77777777-7777-7777-7777-777777777772', '22222222-2222-2222-2222-222222222221', 'chair'),
  ('77777777-7777-7777-7777-777777777772', '22222222-2222-2222-2222-222222222224', 'secretary'),
  ('77777777-7777-7777-7777-777777777772', '22222222-2222-2222-2222-222222222223', 'member'),

  -- Council 3
  ('77777777-7777-7777-7777-777777777773', '22222222-2222-2222-2222-222222222224', 'chair'),
  ('77777777-7777-7777-7777-777777777773', '22222222-2222-2222-2222-222222222221', 'secretary'),
  ('77777777-7777-7777-7777-777777777773', '22222222-2222-2222-2222-222222222222', 'opponent1');

-- ============================================================================
-- 10. DEFENSE SESSIONS
-- ============================================================================

INSERT INTO defense_sessions (council_id, registration_id, sequence_number, scheduled_at, duration_minutes, room, status, actual_start_time, actual_end_time, result_score, result_grade) VALUES
  -- Council 1 - Morning May 25
  ('77777777-7777-7777-7777-777777777771', '55555555-5555-5555-5555-555555555551', 1, '2025-05-25 07:30:00', 45, 'P.601', 'completed', '2025-05-25 07:35:00', '2025-05-25 08:15:00', 8.75, 'B+'),
  ('77777777-7777-7777-7777-777777777771', '55555555-5555-5555-5555-555555555552', 2, '2025-05-25 08:30:00', 45, 'P.601', 'completed', '2025-05-25 08:35:00', '2025-05-25 09:20:00', 8.50, 'B+'),
  ('77777777-7777-7777-7777-777777777771', '55555555-5555-5555-5555-555555555553', 3, '2025-05-25 09:30:00', 45, 'P.601', 'completed', '2025-05-25 09:35:00', '2025-05-25 10:25:00', 9.00, 'A'),

  -- Council 2 - Afternoon May 25
  ('77777777-7777-7777-7777-777777777772', '55555555-5555-5555-5555-555555555554', 1, '2025-05-25 13:00:00', 45, 'P.602', 'completed', '2025-05-25 13:05:00', '2025-05-25 13:50:00', 8.25, 'B'),
  ('77777777-7777-7777-7777-777777777772', '55555555-5555-5555-5555-555555555555', 2, '2025-05-25 14:00:00', 45, 'P.602', 'completed', '2025-05-25 14:05:00', '2025-05-25 14:45:00', 8.25, 'B'),
  ('77777777-7777-7777-7777-777777777772', '55555555-5555-5555-5555-555555555556', 3, '2025-05-25 15:00:00', 45, 'P.602', 'completed', '2025-05-25 15:05:00', '2025-05-25 15:50:00', 7.75, 'C+'),

  -- Council 3 - Morning May 26
  ('77777777-7777-7777-7777-777777777773', '55555555-5555-5555-5555-555555555557', 1, '2025-05-26 07:30:00', 45, 'P.603', 'completed', '2025-05-26 07:35:00', '2025-05-26 08:20:00', 8.90, 'A-'),
  ('77777777-7777-7777-7777-777777777773', '55555555-5555-5555-5555-555555555558', 2, '2025-05-26 08:30:00', 45, 'P.603', 'completed', '2025-05-26 08:35:00', '2025-05-26 09:15:00', 8.90, 'A-');

-- ============================================================================
-- 11. FEEDBACK (Lecturer feedback to students)
-- ============================================================================

INSERT INTO feedback (registration_id, lecturer_id, round_number, content, attachment_url, is_read, read_at, parent_id) VALUES
  -- Feedback for registration 551
  ('55555555-5555-5555-5555-555555555551', '22222222-2222-2222-2222-222222222221', 1, 'Đề cương của em khá tốt. Tuy nhiên cần làm rõ hơn về phương pháp thu thập dữ liệu và cách đánh giá mô hình. Đề xuất em tham khảo thêm các paper về recommendation systems.', NULL, true, '2025-02-16 08:00:00', NULL),
  ('55555555-5555-5555-5555-555555555551', '22222222-2222-2222-2222-222222222221', 2, 'Tiến độ đạt yêu cầu. Mô hình initial đã chạy được. Tiếp tục cải thiện accuracy.', NULL, true, '2025-03-19 10:00:00', NULL),
  ('55555555-5555-5555-5555-555555555551', '22222222-2222-2222-2222-222222222221', 3, 'Hệ thống đã hoàn thiện 80%. Cần tập trung vào UI/UX và viết báo cáo.', NULL, true, '2025-04-23 14:00:00', NULL),

  -- Feedback for registration 553 (excellent student)
  ('55555555-5555-5555-5555-555555555553', '22222222-2222-2222-2222-222222222221', 1, 'Đề cương rất tốt! Em thể hiện sự hiểu biết sâu về NLP. Giữ vững phong độ.', NULL, true, '2025-02-17 09:00:00', NULL),
  ('55555555-5555-5555-5555-555555555553', '22222222-2222-2222-2222-222222222221', 2, 'Kết quả initial rất ấn tượng (F1=0.82). Thử thêm BERT xem sao.', NULL, true, '2025-03-19 11:00:00', NULL),
  ('55555555-5555-5555-5555-555555555553', '22222222-2222-2222-2222-222222222221', 4, 'Chúc mừng em hoàn thành xuất sắc khóa luận! Điểm số rất cao. Chuẩn bị tốt cho buổi bảo vệ.', NULL, true, '2025-05-22 16:00:00', NULL),

  -- Feedback for late submission
  ('55555555-5555-5555-5555-555555555556', '22222222-2222-2222-2222-222222222222', 2, 'Em nộp trễ 2 ngày nên bị trừ điểm. Lần sau chú ý deadline. Nội dung tạm ổn.', NULL, true, '2025-03-25 11:00:00', NULL);

-- ============================================================================
-- 12. NOTIFICATIONS
-- ============================================================================

INSERT INTO notifications (user_id, title, content, type, priority, action_url, action_label, metadata, created_at) VALUES
  -- Notifications for student 20001
  ('33333333-3333-3333-3333-333333333331', 'Đề cương đã được phê duyệt', 'Đề cương khóa luận của em đã được giảng viên hướng dẫn phê duyệt.', 'academic', 'normal', '/student/proposals', 'Xem đề cương', '{"proposal_id": "44444444-4444-4444-4444-444444444441"}', '2025-01-17 14:35:00'),
  ('33333333-3333-3333-3333-333333333331', 'Phản hồi mới từ giảng viên', 'TS. Nguyễn Minh Trí đã gửi phản hồi cho đề cương của em.', 'feedback', 'high', '/student/feedback', 'Xem phản hồi', '{"feedback_id": "88888888-8888-8888-8888-888888888881"}', '2025-02-15 10:05:00'),
  ('33333333-3333-3333-3333-333333333331', 'Nhắc nộp tiến độ 1', 'Hạn nộp báo cáo tiến độ 1 còn 3 ngày.', 'deadline', 'high', '/student/submissions', 'Nộp ngay', '{"round_id": "00000000-0000-0000-0000-000000000012"}', '2025-03-17 08:00:00'),
  ('33333333-3333-3333-3333-333333333331', 'Lịch bảo vệ khóa luận', 'Em sẽ bảo vệ khóa luận vào 07:30 ngày 25/05/2025 tại P.601.', 'academic', 'urgent', '/student/defense', 'Xem chi tiết', '{"defense_id": "99999999-9999-9999-9999-999999999991"}', '2025-05-20 16:00:00'),
  ('33333333-3333-3333-3333-333333333331', 'Điểm bảo vệ đã công bố', 'Điểm bảo vệ khóa luận của em: 8.75 (B+)', 'feedback', 'normal', '/student/grades', 'Xem điểm', '{"final_score": 8.75}', '2025-05-25 12:00:00'),

  -- Notifications for student 20003 (excellent)
  ('33333333-3333-3333-3333-333333333333', 'Đề cương đã được phê duyệt', 'Đề cương khóa luận của em đã được giảng viên hướng dẫn phê duyệt.', 'academic', 'normal', '/student/proposals', 'Xem đề cương', '{"proposal_id": "44444444-4444-4444-4444-444444444442"}', '2025-01-19 10:35:00'),
  ('33333333-3333-3333-3333-333333333333', 'Chúc mừng! Khóa luận xuất sắc', 'Khóa luận của em được đánh giá xuất sắc với điểm 9.0. Chúc mừng em!', 'feedback', 'high', '/student/grades', 'Xem kết quả', '{"final_score": 9.0}', '2025-05-26 15:00:00'),

  -- Unread notification example
  ('33333333-3333-3333-3333-333333333331', 'Khảo sát chất lượng đào tạo', 'Nhà trường mời em tham gia khảo sát chất lượng đào tạo.', 'system', 'low', '/survey', 'Tham gia', NULL, NOW());

-- ============================================================================
-- 13. AUDIT LOGS (Sample activity logs)
-- ============================================================================

INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, created_at) VALUES
  ('33333333-3333-3333-3333-333333333331', 'LOGIN', 'profile', '33333333-3333-3333-3333-333333333331', NULL, '192.168.1.100'::INET, '2025-01-16 08:00:00'),
  ('33333333-3333-3333-3333-333333333331', 'REGISTRATION_CREATE', 'registration', '55555555-5555-5555-5555-555555555551', '{"proposal_id": "44444444-4444-4444-4444-444444444441"}', '192.168.1.100'::INET, '2025-01-16 10:30:00'),
  ('33333333-3333-3333-3333-333333333331', 'SUBMISSION_CREATE', 'submission', '66666666-6666-6666-6666-666666666661', '{"round": 1, "file": "de_cuong.pdf"}', '192.168.1.100'::INET, '2025-02-10 23:45:00'),

  ('22222222-2222-2222-2222-222222222221', 'LOGIN', 'profile', '22222222-2222-2222-2222-222222222221', NULL, '10.0.0.50'::INET, '2025-01-17 07:30:00'),
  ('22222222-2222-2222-2222-222222222221', 'REGISTRATION_REVIEW', 'registration', '55555555-5555-5555-5555-555555555551', '{"status": "approved"}', '10.0.0.50'::INET, '2025-01-17 14:00:00'),
  ('22222222-2222-2222-2222-222222222221', 'GRADE_CREATE', 'grade', '66666666-6666-6666-6666-666666666661', '{"score": 8.10}', '10.0.0.50'::INET, '2025-02-15 10:00:00'),

  ('11111111-1111-1111-1111-111111111111', 'LOGIN', 'profile', '11111111-1111-1111-1111-111111111111', NULL, '10.0.0.1'::INET, '2025-01-15 07:00:00'),
  ('11111111-1111-1111-1111-111111111111', 'COUNCIL_CREATE', 'council', '77777777-7777-7777-7777-777777777771', '{"name": "Hội đồng 1"}', '10.0.0.1'::INET, '2025-05-01 09:00:00');

-- ============================================================================
-- 14. ADDITIONAL LECTURER PROFILE FIELDS
-- ============================================================================

-- Add lecturer-specific fields (these would normally be in a separate migration)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS title TEXT; -- TS., ThS., PGS.TS., etc.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS office TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS position TEXT; -- For admins
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Update lecturer profiles with titles
UPDATE profiles SET
  title = 'TS.',
  bio = 'Tiến sĩ Khoa học Máy tính, chuyên ngành Machine Learning và AI. 10 năm kinh nghiệm nghiên cứu và giảng dạy.',
  office = 'P.501'
WHERE id = '22222222-2222-2222-2222-222222222221';

UPDATE profiles SET
  title = 'ThS.',
  bio = 'Thạc sĩ Hệ thống Thông tin. Quan tâm đến Web Application và Mobile Development.',
  office = 'P.502'
WHERE id = '22222222-2222-2222-2222-222222222222';

UPDATE profiles SET
  title = 'PGS.TS.',
  bio = 'Phó Giáo sư Khoa học Máy tính. Nghiên cứu về Blockchain, Distributed Systems.',
  office = 'P.503'
WHERE id = '22222222-2222-2222-2222-222222222223';

UPDATE profiles SET
  title = 'ThS.',
  bio = 'Thạc sĩ An ninh Mạng. Chuyên gia về Network Security và AI for Security.',
  office = 'P.504'
WHERE id = '22222222-2222-2222-2222-222222222224';

-- Update admin profiles
UPDATE profiles SET
  position = 'Trưởng phòng Quản lý Đào tạo'
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE profiles SET
  position = 'Phó phòng Công tác Sinh viên'
WHERE id = '11111111-1111-1111-1111-111111111112';

-- ============================================================================
-- VERIFICATION QUERIES (Run these to check data integrity)
-- ============================================================================
-- Run separately after this migration:
-- SELECT COUNT(*) FROM profiles WHERE role = 'student';
-- SELECT COUNT(*) FROM profiles WHERE role = 'lecturer';
-- SELECT COUNT(*) FROM profiles WHERE role = 'admin';
-- SELECT COUNT(*) FROM proposals WHERE status = 'approved';
-- SELECT COUNT(*) FROM registrations;
-- SELECT COUNT(*) FROM submissions;
-- SELECT * FROM admin_dashboard_stats;

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================
