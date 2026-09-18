# BEC Vote

Bản dựng lại trên laptop từ yêu cầu trong lịch sử trò chuyện. Đây không phải bản khôi phục các file gốc. Dự án Sites liên quan: `appgprj_6aa7bff2bcb08191ad3476e7b7e02899`. Bản này chạy cục bộ bằng Node.js, chưa được triển khai lên Sites.

## Chạy

Cần Node.js 24 trở lên. Nhấp đúp `START-BEC.cmd`, hoặc chạy `node server.mjs` trong thư mục dự án. Mở http://127.0.0.1:3000. Giữ cửa sổ máy chủ mở trong lúc sử dụng. Không cần cài thư viện.

## Chức năng

- 11 sự kiện có ảnh thật, tìm tên có hoặc không dấu, xem poster lớn và hiệu ứng hover.
- Đăng nhập bằng một ô Gmail, không mật khẩu. Đây là địa chỉ tự khai, chưa xác minh quyền sở hữu qua Google hoặc OTP. Phiên dùng cookie HttpOnly, hết hạn sau 7 ngày.
- Mỗi Gmail chỉ có một phiếu tổng cộng, không làm mới theo ngày. Các biến thể dấu chấm và +tag của cùng Gmail dùng chung hạn mức.
- Máy chủ kiểm tra giới hạn trong giao dịch SQLite. Cùng mã yêu cầu gửi lại chỉ tính một phiếu.
- Bảng xếp hạng có đồng hạng, lịch sử 100 phiếu gần nhất, dữ liệu cập nhật mỗi 30 giây.

## Dữ liệu và sao lưu

Tài khoản và phiếu nằm trong `data/bec-vote.sqlite`. Dừng máy chủ trước khi sao chép toàn bộ thư mục `data` để có bản sao nhất quán. Chép cả thư mục dự án sang máy khác, cài Node.js 24 và chạy lại. Không chia sẻ cơ sở dữ liệu chứa tài khoản công khai.

Sửa danh sách sự kiện trong `events.mjs`, hiệu ứng ảnh trong `public/events.css`. Logo là `public/media/bec-logo.jpg`; video nền là `public/media/bec-background.mp4`. Giữ nguyên ID sự kiện nếu đã có phiếu. Phiếu và tài khoản cũ được giữ lại; tài khoản từng gửi phiếu không được gửi thêm theo quy tắc mới.

## Kiểm tra

Chạy `node --test test.mjs`. Kiểm tra Gmail, bí danh, gửi đồng thời, gửi trùng, đăng nhập lại, phiếu từ ngày cũ, chuyển đổi tài khoản cũ và dữ liệu sau khởi động lại. Bài kiểm tra dùng thư mục tạm riêng.

## Phạm vi bản mẫu

Máy chủ chỉ lắng nghe trên laptop tại 127.0.0.1. Chỉ nhập Gmail không chứng minh quyền sở hữu: người khác có thể nhập cùng địa chỉ hoặc một địa chỉ khác. Muốn xác minh người bình chọn cần bổ sung Google Sign-In hoặc OTP. Chưa có trang quản trị sự kiện. Đây là bản chạy cục bộ, chưa triển khai online.

## Thêm sự kiện và chia kỳ

- Sửa `events.mjs`: mỗi sự kiện có `id`, `name`, `term` (SPR26 hoặc SU26) và `image`.
- Đặt ảnh vào `public/media/events/`, điền tên file vào `image`.
- Dùng ID mới chưa trùng; không đổi ID sự kiện đã có phiếu.
- Khởi động lại máy chủ sau khi sửa danh sách. Nút lọc tự lấy các kỳ từ danh sách sự kiện.
- Phân kỳ chỉ phục vụ bộ lọc, không cấp thêm phiếu: mỗi Gmail vẫn có một phiếu tổng cộng.
