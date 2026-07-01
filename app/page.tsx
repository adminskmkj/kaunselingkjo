export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-5xl font-bold text-gray-900">
          S.T.A.R KJo
        </h1>
        <p className="text-xl text-gray-700">
          Student Tracker Attitude Report
        </p>
        <p className="text-gray-600">
          Sistem pemantauan tingkah laku dan intervensi awal murid SMK Kampung Jawa
        </p>
        
        <div className="pt-6">
          <a
            href="/login"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg"
          >
            Log Masuk
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-blue-600 mb-2">Murid</h2>
            <p className="text-gray-600">Refleksi harian & lihat perkembangan</p>
          </div>
          
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-green-600 mb-2">GBK</h2>
            <p className="text-gray-600">Dashboard & intervensi</p>
          </div>
          
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-purple-600 mb-2">Guru</h2>
            <p className="text-gray-600">Catatan & pantau kelas</p>
          </div>
          
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-orange-600 mb-2">Ibu Bapa</h2>
            <p className="text-gray-600">Lihat perkembangan anak</p>
          </div>
        </div>

        <div className="mt-12 text-sm text-gray-500">
          <p>🎯 STEM & TVET : PEMACU ASPIRASI KERJAYA DIGITAL GENERASI MADANI</p>
        </div>
      </div>
    </div>
  );
}
