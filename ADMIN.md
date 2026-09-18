# Trang quản trị BEC Vote

Truy cập `/admin` trên cùng tên miền của website. Đây là trang chỉ xem số liệu,
không sửa hoặc xóa phiếu. Danh sách người bình chọn chỉ được trả về sau khi
máy chủ kiểm tra phiên quản trị, độc lập với đăng nhập Gmail thông thường.

## Cấu hình trên Render

Trong phần Environment của dịch vụ đang chạy repository này, thêm:

- `ADMIN_PASSWORD`: mật khẩu riêng đủ mạnh, ít nhất 12 ký tự (khuyến nghị 20 ký tự ngẫu nhiên).
- `PUBLIC_ORIGIN`: địa chỉ HTTPS chính của website, ví dụ `https://aclipseawardbec.io.vn`.

Lưu cấu hình và triển khai lại dịch vụ. Không đặt mật khẩu trong code, GitHub,
HTML, hoặc file `.env.example`. Không có mật khẩu hoặc dưới 12 ký tự thì quyền
quản trị bị khóa; không tồn tại mật khẩu mặc định. Chỉ chia sẻ mật khẩu cho người
được phép xem danh sách Gmail. Mọi người dùng chung mật khẩu có cùng quyền xem.

Phiên đăng nhập kéo dài tối đa 4 giờ, dùng cookie HttpOnly/SameSite và Secure
trên Render hoặc khi PUBLIC_ORIGIN dùng HTTPS. Đăng xuất thu hồi phiên ngay.
Khởi động lại dịch vụ (bao gồm đổi mật khẩu và triển khai lại) thu hồi toàn bộ phiên.
Sau 10 lần nhập sai, đăng nhập quản trị bị khóa chung tối đa 10 phút; chức năng
bình chọn vẫn hoạt động. Giới hạn dùng chung để không tin địa chỉ IP do client gửi.

## Số liệu

- Tổng số phiếu, số Gmail khác nhau đã vote, số sự kiện theo kỳ được chọn.
- Số phiếu từng sự kiện, gồm cả sự kiện chưa có phiếu.
- Gmail, kỳ, sự kiện và thời gian gửi phiếu theo giờ Việt Nam.
- Tìm Gmail/tên sự kiện, phân trang 50 phiếu, làm mới mỗi phút hoặc bằng nút.

Gmail là địa chỉ người dùng tự khai báo, chưa được xác minh qua Google.
Gmail có dấu chấm hoặc hậu tố + được gộp theo danh tính dùng để kiểm tra phiếu.
Phiếu thuộc sự kiện cũ không có kỳ được hiển thị trong mục Lưu trữ, không bị xóa.
Số liệu lấy từ cơ sở dữ liệu hiện tại của máy chủ. Cần giữ `DATA_DIR` trên ổ lưu
trữ bền vững để phiếu không mất sau khi hosting triển khai lại.

## Chạy trên laptop

Tạo `.env` (đã được gitignore), đặt ADMIN_PASSWORD, rồi chạy
`node --env-file=.env server.mjs`. Dùng PUBLIC_ORIGIN phù hợp với địa chỉ truy cập.
Kiểm thử bằng `npm test`; các kiểm thử dùng dữ liệu tạm, không sửa phiếu thực tế.
