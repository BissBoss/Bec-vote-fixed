# BEC Vote

Bản dựng lại trên laptop từ yêu cầu trong lịch sử trò chuyện. Đây không phải bản khôi phục các file gốc. Dự án Sites liên quan: `appgprj_6aa7bff2bcb08191ad3476e7b7e02899`. Bản này chạy cục bộ bằng Node.js, chưa được triển khai lên Sites.

## Chạy

Cần Node.js 24 trở lên và một project Supabase. Chạy `supabase-setup.sql` trong SQL Editor, cấu hình `SUPABASE_URL` cùng `SUPABASE_SERVICE_ROLE_KEY`, rồi chạy `node server.mjs`.

## Chức năng

- 11 sự kiện có ảnh thật, tìm tên có hoặc không dấu, xem poster lớn và hiệu ứng hover.
- Đăng nhập bằng một ô Gmail, không mật khẩu. Đây là địa chỉ tự khai, chưa xác minh quyền sở hữu qua Google hoặc OTP. Phiên dùng cookie HttpOnly, hết hạn sau 7 ngày.
- Mỗi Gmail chỉ có một phiếu mỗi kỳ, không làm mới theo ngày. Các biến thể dấu chấm và +tag của cùng Gmail dùng chung hạn mức.
- Supabase áp dụng ràng buộc duy nhất để chống gửi đồng thời. Cùng mã yêu cầu gửi lại chỉ tính một phiếu.
- Bảng xếp hạng có đồng hạng, lịch sử 100 phiếu gần nhất, dữ liệu cập nhật mỗi 30 giây.

## Dữ liệu và sao lưu

Phiếu và phiên đăng nhập nằm trong Supabase, không nằm trên ổ tạm của Render. Không đưa secret key vào GitHub hoặc mã chạy trên trình duyệt. Có thể xuất bảng `votes` từ Supabase để sao lưu.

Sửa danh sách sự kiện trong `events.mjs`, hiệu ứng ảnh trong `public/events.css`. Logo là `public/media/bec-logo.jpg`; video nền là `public/media/bec-background.mp4`. Giữ nguyên ID sự kiện nếu đã có phiếu. Phiếu và tài khoản cũ được giữ lại; tài khoản từng gửi phiếu không được gửi thêm theo quy tắc mới.

## Kiểm tra

Chạy `node --test test.mjs`. Kiểm tra Gmail, bí danh, gửi đồng thời, gửi trùng, đăng nhập lại, phiếu từ ngày cũ, chuyển đổi tài khoản cũ và dữ liệu sau khởi động lại. Bài kiểm tra dùng thư mục tạm riêng.

## Phạm vi bản mẫu

Chỉ nhập Gmail không chứng minh quyền sở hữu: người khác có thể nhập cùng địa chỉ hoặc một địa chỉ khác. Muốn xác minh người bình chọn cần bổ sung Google Sign-In hoặc OTP.

## Thêm sự kiện và chia kỳ

- Sửa `events.mjs`: mỗi sự kiện có `id`, `name`, `term` (SPR26 hoặc SU26) và `image`.
- Đặt ảnh vào `public/media/events/`, điền tên file vào `image`.
- Dùng ID mới chưa trùng; không đổi ID sự kiện đã có phiếu.
- Khởi động lại máy chủ sau khi sửa danh sách. Nút lọc tự lấy các kỳ từ danh sách sự kiện.
- Mỗi Gmail được chọn một sự kiện trong mỗi kỳ. Phiếu cũ được tính theo kỳ của sự kiện; không đổi kỳ của sự kiện đã có phiếu.
