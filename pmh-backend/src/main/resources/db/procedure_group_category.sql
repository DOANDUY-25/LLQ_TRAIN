-- =============================================================================
-- HỆ THỐNG QUẢN LÝ THAM SỐ PMH
-- MODULE: THAM SỐ DANH MỤC THEO NHÓM (PMH_GROUP_CATEGORY)
-- STORED PROCEDURES & PACKAGE TRÊN ORACLE DATABASE (12c / 19c+)
-- =============================================================================

-- =============================================================================
-- 1. THỦ TỤC TÌM KIẾM VÀ PHÂN TRANG (SEARCH & PAGINATION)
-- Nhận các tiêu chí tìm kiếm, trả về SYS_REFCURSOR kết quả và tổng số bản ghi
-- =============================================================================
CREATE OR REPLACE PROCEDURE SP_GROUP_CATEGORY_SEARCH (
    p_param_type    IN  VARCHAR2,
    p_param_name    IN  VARCHAR2,
    p_param_value   IN  VARCHAR2,
    p_status_csv    IN  VARCHAR2,    -- Danh sách status cách nhau bằng dấu phẩy: '1,3,4'
    p_is_active_csv IN  VARCHAR2,    -- Danh sách isActive: '1,0'
    p_page          IN  NUMBER,      -- 0-indexed
    p_size          IN  NUMBER,      -- Số bản ghi mỗi trang
    p_total_count   OUT NUMBER,      -- Tổng số bản ghi thỏa điều kiện
    p_recordset     OUT SYS_REFCURSOR-- Cursor danh sách kết quả
) AS
    v_page NUMBER := NVL(p_page, 0);
    v_size NUMBER := NVL(p_size, 10);
BEGIN
    -- 1. Đếm tổng số bản ghi
    SELECT COUNT(*)
    INTO p_total_count
    FROM PMH_GROUP_CATEGORY g
    WHERE (p_param_type IS NULL OR UPPER(g.PARAM_TYPE) LIKE '%' || UPPER(TRIM(p_param_type)) || '%')
      AND (p_param_name IS NULL OR UPPER(g.PARAM_NAME) LIKE '%' || UPPER(TRIM(p_param_name)) || '%')
      AND (p_param_value IS NULL OR UPPER(g.PARAM_VALUE) LIKE '%' || UPPER(TRIM(p_param_value)) || '%')
      AND (p_status_csv IS NULL OR INSTR(',' || p_status_csv || ',', ',' || TO_CHAR(g.STATUS) || ',') > 0)
      AND (p_is_active_csv IS NULL OR INSTR(',' || p_is_active_csv || ',', ',' || TO_CHAR(g.IS_ACTIVE) || ',') > 0);

    -- 2. Mở cursor trả về kết quả phân trang
    OPEN p_recordset FOR
    SELECT g.ID,
           g.PARAM_NAME,
           g.PARAM_VALUE,
           g.PARAM_TYPE,
           g.DESCRIPTION,
           g.COMPONENT_CODE,
           g.EFFECTIVE_DATE,
           g.END_EFFECTIVE_DATE,
           g.NEW_DATA,
           g.STATUS,
           g.IS_ACTIVE,
           g.IS_DISPLAY,
           g.CREATED_BY,
           g.CREATED_DATE,
           g.UPDATED_BY,
           g.UPDATED_DATE,
           g.VERSION
    FROM PMH_GROUP_CATEGORY g
    WHERE (p_param_type IS NULL OR UPPER(g.PARAM_TYPE) LIKE '%' || UPPER(TRIM(p_param_type)) || '%')
      AND (p_param_name IS NULL OR UPPER(g.PARAM_NAME) LIKE '%' || UPPER(TRIM(p_param_name)) || '%')
      AND (p_param_value IS NULL OR UPPER(g.PARAM_VALUE) LIKE '%' || UPPER(TRIM(p_param_value)) || '%')
      AND (p_status_csv IS NULL OR INSTR(',' || p_status_csv || ',', ',' || TO_CHAR(g.STATUS) || ',') > 0)
      AND (p_is_active_csv IS NULL OR INSTR(',' || p_is_active_csv || ',', ',' || TO_CHAR(g.IS_ACTIVE) || ',') > 0)
    ORDER BY g.UPDATED_DATE DESC NULLS LAST, g.ID DESC
    OFFSET (v_page * v_size) ROWS FETCH NEXT v_size ROWS ONLY;

EXCEPTION
    WHEN OTHERS THEN
        p_total_count := 0;
        OPEN p_recordset FOR SELECT * FROM PMH_GROUP_CATEGORY WHERE 1 = 0;
        RAISE;
END SP_GROUP_CATEGORY_SEARCH;
/

-- =============================================================================
-- 2. THỦ TỤC XEM CHI TIẾT THEO ID (GET DETAIL)
-- =============================================================================
CREATE OR REPLACE PROCEDURE SP_GROUP_CATEGORY_DETAIL (
    p_id        IN  NUMBER,
    p_recordset OUT SYS_REFCURSOR
) AS
BEGIN
    OPEN p_recordset FOR
    SELECT g.ID,
           g.PARAM_NAME,
           g.PARAM_VALUE,
           g.PARAM_TYPE,
           g.DESCRIPTION,
           g.COMPONENT_CODE,
           g.EFFECTIVE_DATE,
           g.END_EFFECTIVE_DATE,
           g.NEW_DATA,
           g.STATUS,
           g.IS_ACTIVE,
           g.IS_DISPLAY,
           g.CREATED_BY,
           g.CREATED_DATE,
           g.UPDATED_BY,
           g.UPDATED_DATE,
           g.VERSION
    FROM PMH_GROUP_CATEGORY g
    WHERE g.ID = p_id;
END SP_GROUP_CATEGORY_DETAIL;
/

-- =============================================================================
-- 3. THỦ TỤC THÊM MỚI (CREATE)
-- Sinh ID từ PMH_GROUP_CATEGORY_SEQ, gán STATUS=1, IS_DISPLAY=1, IS_ACTIVE=1
-- =============================================================================
CREATE OR REPLACE PROCEDURE SP_GROUP_CATEGORY_CREATE (
    p_param_name          IN  VARCHAR2,
    p_param_value         IN  VARCHAR2,
    p_param_type          IN  VARCHAR2,
    p_description         IN  VARCHAR2,
    p_component_code      IN  VARCHAR2,
    p_effective_date      IN  TIMESTAMP,
    p_end_effective_date  IN  TIMESTAMP,
    p_created_by          IN  VARCHAR2,
    p_new_id              OUT NUMBER,
    p_response_code       OUT VARCHAR2,
    p_response_message    OUT VARCHAR2
) AS
    v_count NUMBER := 0;
BEGIN
    -- 1. Kiểm tra trùng (PARAM_NAME + PARAM_TYPE + COMPONENT_CODE)
    SELECT COUNT(*)
    INTO v_count
    FROM PMH_GROUP_CATEGORY
    WHERE UPPER(PARAM_NAME) = UPPER(TRIM(p_param_name))
      AND UPPER(PARAM_TYPE) = UPPER(TRIM(p_param_type))
      AND UPPER(COMPONENT_CODE) = UPPER(TRIM(p_component_code));

    IF v_count > 0 THEN
        p_response_code := 'DUPLICATE';
        p_response_message := 'Tham số danh mục với Tên ''' || p_param_name || ''', Loại ''' || p_param_type || ''', Cấu phần ''' || p_component_code || ''' đã tồn tại!';
        RETURN;
    END IF;

    -- 2. Sinh ID từ Sequence
    SELECT PMH_GROUP_CATEGORY_SEQ.NEXTVAL INTO p_new_id FROM DUAL;

    -- 3. Thêm mới bản ghi
    INSERT INTO PMH_GROUP_CATEGORY (
        ID,
        PARAM_NAME,
        PARAM_VALUE,
        PARAM_TYPE,
        DESCRIPTION,
        COMPONENT_CODE,
        EFFECTIVE_DATE,
        END_EFFECTIVE_DATE,
        NEW_DATA,
        STATUS,
        IS_ACTIVE,
        IS_DISPLAY,
        CREATED_BY,
        CREATED_DATE,
        UPDATED_BY,
        UPDATED_DATE,
        VERSION
    ) VALUES (
        p_new_id,
        TRIM(p_param_name),
        TRIM(p_param_value),
        TRIM(p_param_type),
        p_description,
        UPPER(TRIM(p_component_code)),
        p_effective_date,
        p_end_effective_date,
        NULL,
        1,  -- Status = 1: Mới
        1,  -- IsActive = 1: Hoạt động
        1,  -- IsDisplay = 1: Chưa duyệt lần nào
        NVL(p_created_by, 'system'),
        SYSTIMESTAMP,
        NVL(p_created_by, 'system'),
        SYSTIMESTAMP,
        0
    );

    p_response_code := 'SUCCESS';
    p_response_message := 'Thêm mới tham số danh mục thành công';
EXCEPTION
    WHEN OTHERS THEN
        p_response_code := 'ERROR';
        p_response_message := 'Lỗi tạo mới: ' || SQLERRM;
END SP_GROUP_CATEGORY_CREATE;
/

-- =============================================================================
-- 4. THỦ TỤC CẬP NHẬT (UPDATE)
-- Quy tắc:
--  - Status = 1 (Mới): Cập nhật trực tiếp vào dữ liệu
--  - Status = 5/7 (Từ chối / Hủy duyệt): Lưu JSON vào NEW_DATA
--  - Status = 3/4 (Chờ duyệt / Đã duyệt): Chặn, báo lỗi
-- =============================================================================
CREATE OR REPLACE PROCEDURE SP_GROUP_CATEGORY_UPDATE (
    p_id                  IN  NUMBER,
    p_param_name          IN  VARCHAR2,
    p_param_value         IN  VARCHAR2,
    p_param_type          IN  VARCHAR2,
    p_description         IN  VARCHAR2,
    p_component_code      IN  VARCHAR2,
    p_effective_date      IN  TIMESTAMP,
    p_end_effective_date  IN  TIMESTAMP,
    p_new_data_json       IN  VARCHAR2,
    p_updated_by          IN  VARCHAR2,
    p_response_code       OUT VARCHAR2,
    p_response_message    OUT VARCHAR2
) AS
    v_status NUMBER;
    v_count  NUMBER := 0;
BEGIN
    -- 1. Tìm bản ghi hiện tại
    BEGIN
        SELECT STATUS INTO v_status
        FROM PMH_GROUP_CATEGORY
        WHERE ID = p_id;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            p_response_code := 'NOT_FOUND';
            p_response_message := 'Không tìm thấy tham số danh mục với ID: ' || p_id;
            RETURN;
    END;

    -- 2. Kiểm tra theo trạng thái
    IF v_status = 1 THEN
        -- Status 1 (Mới): Kiểm tra trùng lặp (loại trừ ID hiện tại)
        SELECT COUNT(*)
        INTO v_count
        FROM PMH_GROUP_CATEGORY
        WHERE UPPER(PARAM_NAME) = UPPER(TRIM(p_param_name))
          AND UPPER(PARAM_TYPE) = UPPER(TRIM(p_param_type))
          AND UPPER(COMPONENT_CODE) = UPPER(TRIM(p_component_code))
          AND ID <> p_id;

        IF v_count > 0 THEN
            p_response_code := 'DUPLICATE';
            p_response_message := 'Tham số danh mục với Tên ''' || p_param_name || ''', Loại ''' || p_param_type || ''', Cấu phần ''' || p_component_code || ''' đã tồn tại!';
            RETURN;
        END IF;

        -- Cập nhật trực tiếp
        UPDATE PMH_GROUP_CATEGORY
        SET PARAM_NAME         = TRIM(p_param_name),
            PARAM_VALUE        = TRIM(p_param_value),
            PARAM_TYPE         = TRIM(p_param_type),
            DESCRIPTION        = p_description,
            COMPONENT_CODE     = UPPER(TRIM(p_component_code)),
            EFFECTIVE_DATE     = p_effective_date,
            END_EFFECTIVE_DATE = p_end_effective_date,
            NEW_DATA           = NULL,
            UPDATED_BY         = NVL(p_updated_by, 'system'),
            UPDATED_DATE       = SYSTIMESTAMP,
            VERSION            = NVL(VERSION, 0) + 1
        WHERE ID = p_id;

        p_response_code := 'SUCCESS';
        p_response_message := 'Cập nhật trực tiếp tham số danh mục thành công';

    ELSIF v_status IN (5, 7) THEN
        -- Status 5 (Từ chối) hoặc 7 (Hủy duyệt): Lưu JSON vào NEW_DATA
        UPDATE PMH_GROUP_CATEGORY
        SET NEW_DATA     = p_new_data_json,
            UPDATED_BY   = NVL(p_updated_by, 'system'),
            UPDATED_DATE = SYSTIMESTAMP,
            VERSION      = NVL(VERSION, 0) + 1
        WHERE ID = p_id;

        p_response_code := 'SUCCESS';
        p_response_message := 'Đã lưu thông tin chỉnh sửa vào NEW_DATA (chờ phê duyệt)';

    ELSIF v_status = 3 THEN
        p_response_code := 'INVALID_STATUS';
        p_response_message := 'Bản ghi đang ở trạng thái Chờ duyệt, không được phép chỉnh sửa!';
    ELSIF v_status = 4 THEN
        p_response_code := 'INVALID_STATUS';
        p_response_message := 'Bản ghi đang ở trạng thái Đã duyệt! Vui lòng Hủy duyệt trước khi sửa.';
    ELSE
        p_response_code := 'INVALID_STATUS';
        p_response_message := 'Không được phép sửa bản ghi ở trạng thái hiện tại (Status=' || v_status || ')!';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        p_response_code := 'ERROR';
        p_response_message := 'Lỗi cập nhật: ' || SQLERRM;
END SP_GROUP_CATEGORY_UPDATE;
/

-- =============================================================================
-- 5. THỦ TỤC XÓA (DELETE)
-- Chỉ được xóa khi IS_DISPLAY = 1 và STATUS = 1
-- =============================================================================
CREATE OR REPLACE PROCEDURE SP_GROUP_CATEGORY_DELETE (
    p_id               IN  NUMBER,
    p_response_code    OUT VARCHAR2,
    p_response_message OUT VARCHAR2
) AS
    v_status     NUMBER;
    v_is_display NUMBER;
BEGIN
    SELECT STATUS, IS_DISPLAY
    INTO v_status, v_is_display
    FROM PMH_GROUP_CATEGORY
    WHERE ID = p_id;

    IF v_is_display = 2 THEN
        p_response_code := 'FORBIDDEN';
        p_response_message := 'Bản ghi đã từng được phê duyệt (IS_DISPLAY=2), không được phép xóa!';
        RETURN;
    END IF;

    IF v_status <> 1 THEN
        p_response_code := 'FORBIDDEN';
        p_response_message := 'Chỉ được phép xóa bản ghi ở trạng thái Mới (Status=1)!';
        RETURN;
    END IF;

    DELETE FROM PMH_GROUP_CATEGORY WHERE ID = p_id;

    p_response_code := 'SUCCESS';
    p_response_message := 'Xóa tham số danh mục thành công';

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        p_response_code := 'NOT_FOUND';
        p_response_message := 'Không tìm thấy tham số danh mục với ID: ' || p_id;
    WHEN OTHERS THEN
        p_response_code := 'ERROR';
        p_response_message := 'Lỗi xóa bản ghi: ' || SQLERRM;
END SP_GROUP_CATEGORY_DELETE;
/

-- =============================================================================
-- 6. THỦ TỤC GỬI DUYỆT (SUBMIT APPROVAL)
-- Chuyển trạng thái 1, 5, 7 -> 3 (PENDING)
-- Nhận chuỗi ID dạng CSV (ví dụ: '101,102,103')
-- =============================================================================
CREATE OR REPLACE PROCEDURE SP_GROUP_CATEGORY_SUBMIT (
    p_ids_csv          IN  VARCHAR2,
    p_user             IN  VARCHAR2,
    p_response_code    OUT VARCHAR2,
    p_response_message OUT VARCHAR2
) AS
    v_invalid_count NUMBER := 0;
BEGIN
    -- Kiểm tra xem có bản ghi nào không thuộc status 1, 5, 7 không
    SELECT COUNT(*)
    INTO v_invalid_count
    FROM PMH_GROUP_CATEGORY
    WHERE INSTR(',' || p_ids_csv || ',', ',' || TO_CHAR(ID) || ',') > 0
      AND STATUS NOT IN (1, 5, 7);

    IF v_invalid_count > 0 THEN
        p_response_code := 'INVALID_STATUS';
        p_response_message := 'Tồn tại bản ghi có trạng thái không hợp lệ để gửi duyệt (chỉ cho phép trạng thái Mới, Từ chối, Hủy duyệt)!';
        RETURN;
    END IF;

    -- Cập nhật trạng thái sang 3 (PENDING)
    UPDATE PMH_GROUP_CATEGORY
    SET STATUS       = 3,
        UPDATED_BY   = NVL(p_user, 'system'),
        UPDATED_DATE = SYSTIMESTAMP,
        VERSION      = NVL(VERSION, 0) + 1
    WHERE INSTR(',' || p_ids_csv || ',', ',' || TO_CHAR(ID) || ',') > 0;

    p_response_code := 'SUCCESS';
    p_response_message := 'Gửi duyệt thành công';

EXCEPTION
    WHEN OTHERS THEN
        p_response_code := 'ERROR';
        p_response_message := 'Lỗi gửi duyệt: ' || SQLERRM;
END SP_GROUP_CATEGORY_SUBMIT;
/

-- =============================================================================
-- 7. THỦ TỤC PHÊ DUYỆT (APPROVAL)
-- Chuyển trạng thái 3 -> 4 (APPROVED), IS_DISPLAY = 2
-- Merge NEW_DATA nếu có vào các cột chính
-- =============================================================================
CREATE OR REPLACE PROCEDURE SP_GROUP_CATEGORY_APPROVE (
    p_ids_csv          IN  VARCHAR2,
    p_user             IN  VARCHAR2,
    p_response_code    OUT VARCHAR2,
    p_response_message OUT VARCHAR2
) AS
    v_invalid_count NUMBER := 0;
    CURSOR c_records IS
        SELECT ID, NEW_DATA
        FROM PMH_GROUP_CATEGORY
        WHERE INSTR(',' || p_ids_csv || ',', ',' || TO_CHAR(ID) || ',') > 0;
BEGIN
    -- 1. Kiểm tra trạng thái phải là 3 (PENDING)
    SELECT COUNT(*)
    INTO v_invalid_count
    FROM PMH_GROUP_CATEGORY
    WHERE INSTR(',' || p_ids_csv || ',', ',' || TO_CHAR(ID) || ',') > 0
      AND STATUS <> 3;

    IF v_invalid_count > 0 THEN
        p_response_code := 'INVALID_STATUS';
        p_response_message := 'Tồn tại bản ghi không ở trạng thái Chờ duyệt (Status=3) để phê duyệt!';
        RETURN;
    END IF;

    -- 2. Duyệt qua từng bản ghi để merge NEW_DATA (nếu có)
    FOR rec IN c_records LOOP
        IF rec.NEW_DATA IS NOT NULL AND LENGTH(TRIM(rec.NEW_DATA)) > 0 THEN
            -- Dùng JSON_VALUE của Oracle 12c+/19c để trích xuất dữ liệu từ NEW_DATA
            UPDATE PMH_GROUP_CATEGORY
            SET PARAM_NAME         = NVL(JSON_VALUE(rec.NEW_DATA, '$.paramName'), PARAM_NAME),
                PARAM_VALUE        = NVL(JSON_VALUE(rec.NEW_DATA, '$.paramValue'), PARAM_VALUE),
                PARAM_TYPE         = NVL(JSON_VALUE(rec.NEW_DATA, '$.paramType'), PARAM_TYPE),
                DESCRIPTION        = NVL(JSON_VALUE(rec.NEW_DATA, '$.description'), DESCRIPTION),
                COMPONENT_CODE     = NVL(UPPER(JSON_VALUE(rec.NEW_DATA, '$.componentCode')), COMPONENT_CODE),
                NEW_DATA           = NULL,
                STATUS             = 4,  -- Đã duyệt
                IS_DISPLAY         = 2,  -- Đã từng duyệt ít nhất 1 lần -> không được xóa
                UPDATED_BY         = NVL(p_user, 'system'),
                UPDATED_DATE       = SYSTIMESTAMP,
                VERSION            = NVL(VERSION, 0) + 1
            WHERE ID = rec.ID;
        ELSE
            UPDATE PMH_GROUP_CATEGORY
            SET STATUS       = 4,
                IS_DISPLAY   = 2,
                UPDATED_BY   = NVL(p_user, 'system'),
                UPDATED_DATE = SYSTIMESTAMP,
                VERSION      = NVL(VERSION, 0) + 1
            WHERE ID = rec.ID;
        END IF;
    END LOOP;

    p_response_code := 'SUCCESS';
    p_response_message := 'Phê duyệt thành công';

EXCEPTION
    WHEN OTHERS THEN
        p_response_code := 'ERROR';
        p_response_message := 'Lỗi phê duyệt: ' || SQLERRM;
END SP_GROUP_CATEGORY_APPROVE;
/

-- =============================================================================
-- 8. THỦ TỤC TỪ CHỐI (REJECT)
-- Chuyển trạng thái 3 -> 5 (REJECTED)
-- =============================================================================
CREATE OR REPLACE PROCEDURE SP_GROUP_CATEGORY_REJECT (
    p_ids_csv          IN  VARCHAR2,
    p_reason           IN  VARCHAR2,
    p_user             IN  VARCHAR2,
    p_response_code    OUT VARCHAR2,
    p_response_message OUT VARCHAR2
) AS
    v_invalid_count NUMBER := 0;
BEGIN
    SELECT COUNT(*)
    INTO v_invalid_count
    FROM PMH_GROUP_CATEGORY
    WHERE INSTR(',' || p_ids_csv || ',', ',' || TO_CHAR(ID) || ',') > 0
      AND STATUS <> 3;

    IF v_invalid_count > 0 THEN
        p_response_code := 'INVALID_STATUS';
        p_response_message := 'Tồn tại bản ghi không ở trạng thái Chờ duyệt (Status=3) để từ chối!';
        RETURN;
    END IF;

    UPDATE PMH_GROUP_CATEGORY
    SET STATUS       = 5,
        UPDATED_BY   = NVL(p_user, 'system'),
        UPDATED_DATE = SYSTIMESTAMP,
        VERSION      = NVL(VERSION, 0) + 1
    WHERE INSTR(',' || p_ids_csv || ',', ',' || TO_CHAR(ID) || ',') > 0;

    p_response_code := 'SUCCESS';
    p_response_message := 'Từ chối thành công';

EXCEPTION
    WHEN OTHERS THEN
        p_response_code := 'ERROR';
        p_response_message := 'Lỗi từ chối: ' || SQLERRM;
END SP_GROUP_CATEGORY_REJECT;
/

-- =============================================================================
-- 9. THỦ TỤC HỦY DUYỆT (CANCEL APPROVAL)
-- Chuyển trạng thái 4 -> 7 (CANCELLED)
-- =============================================================================
CREATE OR REPLACE PROCEDURE SP_GROUP_CATEGORY_CANCEL (
    p_ids_csv          IN  VARCHAR2,
    p_user             IN  VARCHAR2,
    p_response_code    OUT VARCHAR2,
    p_response_message OUT VARCHAR2
) AS
    v_invalid_count NUMBER := 0;
BEGIN
    SELECT COUNT(*)
    INTO v_invalid_count
    FROM PMH_GROUP_CATEGORY
    WHERE INSTR(',' || p_ids_csv || ',', ',' || TO_CHAR(ID) || ',') > 0
      AND STATUS <> 4;

    IF v_invalid_count > 0 THEN
        p_response_code := 'INVALID_STATUS';
        p_response_message := 'Tồn tại bản ghi không ở trạng thái Đã duyệt (Status=4) để hủy duyệt!';
        RETURN;
    END IF;

    UPDATE PMH_GROUP_CATEGORY
    SET STATUS       = 7,
        UPDATED_BY   = NVL(p_user, 'system'),
        UPDATED_DATE = SYSTIMESTAMP,
        VERSION      = NVL(VERSION, 0) + 1
    WHERE INSTR(',' || p_ids_csv || ',', ',' || TO_CHAR(ID) || ',') > 0;

    p_response_code := 'SUCCESS';
    p_response_message := 'Hủy duyệt thành công';

EXCEPTION
    WHEN OTHERS THEN
        p_response_code := 'ERROR';
        p_response_message := 'Lỗi hủy duyệt: ' || SQLERRM;
END SP_GROUP_CATEGORY_CANCEL;
/
