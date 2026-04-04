-- Migration: 010_add_proposal_creator
-- Description: Thêm cột created_by vào bảng proposals để hỗ trợ sinh viên tự tạo đề tài

-- Cột này lưu student_id của người đề xuất (nếu có). Trạng thái sẽ là 'pending_supervisor'
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS type TEXT; -- Dùng chung KLTN/BCTT cho proposal nếu cần

-- Cập nhật comment cho cột mới
COMMENT ON COLUMN proposals.created_by IS 'Lưu student_id của người tự đề xuất. Nếu NULL thì do giảng viên tạo.';
