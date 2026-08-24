export default function DashboardCard({ label, value, accent = 'maroon' }) {
  const accentMap = {
    maroon: 'border-maroon text-maroon',
    gold: 'border-gold text-gold',
    gray: 'border-gray-400 text-gray-600',
  };
  return (
    <div className={`bg-white rounded-lg shadow-sm border-t-4 ${accentMap[accent] || accentMap.maroon} p-5`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
}
