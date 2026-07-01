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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <a
            href="/murid"
            className="p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-semibold text-blue-600 mb-2">Murid</h2>
            <p className="text-gray-600">Refleksi harian & lihat perkembangan</p>
          </a>
          
          <a
            href="/gbk"
            className="p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-semibold text-green-600 mb-2">GBK</h2>
            <p className="text-gray-600">Dashboard & intervensi</p>
          </a>
          
          <a
            href="/guru"
            className="p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-semibold text-purple-600 mb-2">Guru</h2>
            <p className="text-gray-600">Catatan & pantau kelas</p>
          </a>
          
          <a
            href="/ibu-bapa"
            className="p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-semibold text-orange-600 mb-2">Ibu Bapa</h2>
            <p className="text-gray-600">Lihat perkembangan anak</p>
          </a>
        </div>
      </div>
    </div>
  );
}
