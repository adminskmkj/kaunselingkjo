export const demoStudents = [
  { id: 's1', name: 'Aiman Hakimi', className: '4 STEM 1', score: 88, risk: 'hijau', trend: '+6%', lastCheckin: 'Hari ini', attendance: '96%' },
  { id: 's2', name: 'Nur Alya Sofea', className: '4 STEM 1', score: 72, risk: 'kuning', trend: '-8%', lastCheckin: 'Semalam', attendance: '91%' },
  { id: 's3', name: 'Danish Irfan', className: '4 STEM 2', score: 58, risk: 'jingga', trend: '-15%', lastCheckin: '3 hari lepas', attendance: '84%' },
  { id: 's4', name: 'Siti Maisarah', className: '5 TVET 1', score: 41, risk: 'merah', trend: '-22%', lastCheckin: '5 hari lepas', attendance: '76%' },
  { id: 's5', name: 'Muhammad Faris', className: '5 STEM 1', score: 93, risk: 'hijau', trend: '+11%', lastCheckin: 'Hari ini', attendance: '99%' },
]

export const demoCheckins = [
  { date: '2026-07-01', score: 88, emotion: 'Gembira', stress: 'Rendah', help: 'Tidak' },
  { date: '2026-06-30', score: 82, emotion: 'Biasa', stress: 'Sederhana', help: 'Tidak' },
  { date: '2026-06-29', score: 79, emotion: 'Biasa', stress: 'Sederhana', help: 'Mungkin' },
  { date: '2026-06-28', score: 74, emotion: 'Tertekan', stress: 'Tinggi', help: 'Mungkin' },
  { date: '2026-06-27', score: 86, emotion: 'Gembira', stress: 'Rendah', help: 'Tidak' },
]

export const demoBadges = [
  { name: 'Pemula Disiplin', icon: '🌟', earned: true, description: 'Lengkapkan refleksi pertama' },
  { name: 'Konsisten 7 Hari', icon: '🔥', earned: true, description: 'Refleksi 7 hari berturut-turut' },
  { name: 'Cemerlang Mingguan', icon: '⭐', earned: true, description: 'Skor purata >= 90% seminggu' },
  { name: 'Rakan Positif', icon: '🤝', earned: false, description: 'Hubungan rakan cemerlang sebulan' },
  { name: 'Sikap Tenang', icon: '🧘', earned: false, description: 'Tahap stres rendah sebulan' },
  { name: 'Juara S.T.A.R', icon: '👑', earned: false, description: 'Capai semua lencana' },
]

export const demoSessions = [
  { id: 'cs1', date: '2026-07-03', time: '10:30', student: 'Nur Alya Sofea', purpose: 'Bimbingan motivasi', status: 'pending' },
  { id: 'cs2', date: '2026-07-04', time: '09:00', student: 'Danish Irfan', purpose: 'Pengurusan stres', status: 'disahkan' },
  { id: 'cs3', date: '2026-06-28', time: '11:15', student: 'Aiman Hakimi', purpose: 'Semakan perkembangan', status: 'selesai' },
]

export const riskStyle: Record<string, string> = {
  hijau: 'bg-green-100 text-green-700 border-green-200',
  kuning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  jingga: 'bg-orange-100 text-orange-700 border-orange-200',
  merah: 'bg-red-100 text-red-700 border-red-200',
}
