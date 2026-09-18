// Thêm sự kiện ở đây. Giữ nguyên ID để bảo toàn phiếu đã lưu.
export const events = [
  {
    "id": 101,
    "name": "Big Open Day",
    "term": "SPR26",
    "image": "big-open-day.png"
  },
  {
    "id": 102,
    "name": "Casting Vũ Trụ Đồng Tiền",
    "term": "SPR26",
    "image": "casting-vu-tru-dong-tien.png"
  },
  {
    "id": 103,
    "name": "Cesim Elite Vietnam 2026",
    "term": "SPR26",
    "image": "cesim-elite-vietnam-2026.png"
  },
  {
    "id": 104,
    "name": "Chuỗi Experience Day",
    "term": "SPR26",
    "image": "experience-day.png"
  },
  {
    "id": 105,
    "name": "Econ Debate Arena Season 1",
    "term": "SPR26",
    "image": "econ-debate-arena.png"
  },
  {
    "id": 106,
    "name": "Hội Xuân Làng Cóc",
    "term": "SPR26",
    "image": "hoi-xuan-lang-coc.png"
  },
  {
    "id": 107,
    "name": "Learning Chain",
    "term": "SPR26",
    "image": "learning-chain.png"
  },
  {
    "id": 108,
    "name": "Professional Selling Season 7",
    "term": "SPR26",
    "image": "professional-selling.png"
  },
  {
    "id": 109,
    "name": "Tất niên Câu lạc bộ",
    "term": "SPR26",
    "image": "tat-nien.png"
  },
  {
    "id": 110,
    "name": "Training kỹ năng tin học",
    "term": "SPR26",
    "image": "training-tin-hoc.jpg"
  },
  {
    "id": 111,
    "name": "Workshop Kỹ Năng Tranh Biện",
    "term": "SPR26",
    "image": "workshop-tranh-bien.png"
  },
  {
    "id": 112,
    "name": "Company Tour IS Company",
    "term": "SU26",
    "image": "company-tour-is-company.png"
  },
  {
    "id": 113,
    "name": "Econ Debate Arena Season 2",
    "term": "SU26",
    "image": "econ-debate-arena-season-2.png"
  },
  {
    "id": 114,
    "name": "Talkshow Kỹ Năng Tranh Biện",
    "term": "SU26",
    "image": "talkshow-tranh-bien.png"
  },
  {
    "id": 115,
    "name": "Vũ Trụ Đồng Tiền",
    "term": "SU26",
    "image": "vu-tru-dong-tien.png"
  },
  {
    "id": 116,
    "name": "Tham gia Cuộc thi Nghiên Cứu Khoa Học",
    "term": "SU26",
    "image": "cuoc-thi-nghien-cuu-khoa-hoc.png"
  },
  {
    "id": 117,
    "name": "Podcast Behind The Money",
    "term": "SU26",
    "image": "podcast-behind-the-money.png"
  },
  {
    "id": 118,
    "name": "Professional Selling Season 8",
    "term": "SU26",
    "image": "professional-selling-season-8.png"
  },
  {
    "id": 119,
    "name": "Workshop Nghiên cứu Khoa Học",
    "term": "SU26",
    "image": "workshop-nghien-cuu-khoa-hoc.png"
  },
  {
    "id": 120,
    "name": "Chung Kết CESIM ELITE VIETNAM 2026",
    "term": "SU26",
    "image": "chung-ket-cesim-2026.png"
  }
].map((event, index) => ({
  ...event,
  image: `/media/events/${event.image}`,
  number: String(index + 1).padStart(3, "0"),
  team: `Sự kiện BEC · ${event.term}`,
  initials: "BEC",
  color: "#cba166",
}));
