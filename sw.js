/* Service Worker — ทำให้แอปเปิดได้แม้ไม่มีเน็ต
   เวลาอัปเดตแอปใหม่ ให้เปลี่ยนเลข VERSION ข้างล่าง แล้ว push ขึ้น GitHub
   ผู้ใช้จะได้เวอร์ชันใหม่อัตโนมัติเมื่อเปิดแอปครั้งถัดไป */
const VERSION = 'v44';
const CACHE = 'health-tracker-' + VERSION;

const SHELL = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './icon-192-v2.png',
  './icon-512-v2.png',
  './icon-maskable-512-v2.png',
  './apple-touch-icon-v2.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // ห้ามแคชการคุยกับเซิร์ฟเวอร์ข้อมูล — ต้องได้ของสดเสมอ
  if (e.request.method !== 'GET') return;
  if (url.includes('script.google.com') || url.includes('googleusercontent.com') ||
      url.includes('/exec') || url.includes('supabase')) return;

  // ปุ่ม "เช็คเวอร์ชันใหม่" ยิงด้วย ?fresh — ต้องวิ่งเน็ตตรง ห้ามตอบจากแคชเด็ดขาด
  if (url.includes('fresh=')) return;

  // ไฟล์แอป: เอาจากแคชก่อน แล้วค่อยอัปเดตเงียบๆ เบื้องหลัง (เปิดได้แม้ไม่มีเน็ต)
  e.respondWith(
    caches.match(e.request).then(hit => {
      const net = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
