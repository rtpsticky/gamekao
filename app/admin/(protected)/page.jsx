import { prisma } from "@/app/lib/prisma";

async function getStats() {
    try {
        const userCount = await prisma.user.count();
        const groupCount = await prisma.group.count();
        const exerciseLogCount = await prisma.exerciseLog.count();
        const totalPointsData = await prisma.user.aggregate({
            _sum: {
                points: true
            }
        });
        const recentLogs = await prisma.exerciseLog.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    include: {
                        groups: {
                            include: {
                                group: true
                            }
                        }
                    }
                },
                images: true
            }
        });

        return {
            userCount,
            groupCount,
            exerciseLogCount,
            totalPoints: totalPointsData._sum.points || 0,
            recentLogs
        };
    } catch (error) {
        console.error("Dashboard stats error:", error);
        return {
            userCount: 0,
            groupCount: 0,
            exerciseLogCount: 0,
            totalPoints: 0,
            recentLogs: []
        };
    }
}

export default async function AdminDashboard() {
    const stats = await getStats();

    return (
        <div className="space-y-8 pb-10">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">ภาพรวมระบบ (Dashboard)</h1>
                <div className="text-sm text-gray-500">ข้อมูลล่าสุด: {new Date().toLocaleDateString('th-TH')}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="ผู้ใช้งานทั้งหมด" value={stats.userCount} icon="👥" color="blue" description="คน" />
                <StatCard title="กลุ่มทั้งหมด" value={stats.groupCount} icon="🏘️" color="green" description="กลุ่ม" />
                <StatCard title="บันทึกออกกำลังกาย" value={stats.exerciseLogCount} icon="📝" color="orange" description="รายการ" />
                <StatCard title="คะแนนรวมทั้งหมด" value={stats.totalPoints.toLocaleString()} icon="⭐" color="yellow" description="แต้ม" />
            </div>

            {/* Exercise Logs Table Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white">
                    <h3 className="font-bold text-gray-800 flex items-center">
                        <span className="mr-2">📝</span> บันทึกการออกกำลังกายล่าสุด
                    </h3>
                    <a href="/admin/exercise-logs" className="text-blue-600 hover:text-blue-700 text-sm font-semibold transition-colors flex items-center">
                        ดูทั้งหมด
                        <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </a>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">ผู้ใช้งาน</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">สัปดาห์ / รอบ</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">ข้อความเพิ่มเติม</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">วันที่ส่งผล</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">รูปภาพ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {stats.recentLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-blue-50/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-900 line-clamp-1">
                                                {log.user.firstName} {log.user.lastName}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-medium">
                                                กลุ่ม: {log.user.groups?.[0]?.group?.name || '-'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="text-xs font-bold text-blue-600">
                                                วีคที่ {(() => {
                                                    const groupStart = log.user.groups?.[0]?.group?.startDate;
                                                    if (!groupStart) return log.weekNumber;
                                                    const start = new Date(groupStart);
                                                    start.setHours(0, 0, 0, 0);
                                                    const created = new Date(log.createdAt);
                                                    const diffTime = created.getTime() - start.getTime();
                                                    const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
                                                    const week = Math.floor(diffDays / 7) + 1;
                                                    return week < 1 ? 1 : week;
                                                })()}
                                            </span>
                                            <span className="text-[10px] font-medium text-gray-500">รอบที่ {log.sessionCount}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs text-gray-500 line-clamp-1 max-w-[150px]" title={log.note}>
                                            {log.note || '-'}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-gray-800">
                                                {new Date(log.createdAt).toLocaleDateString('th-TH')}
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                                {new Date(log.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end -space-x-2">
                                            {log.images.map((img) => (
                                                <a 
                                                    key={img.id} 
                                                    href={img.imageUrl} 
                                                    target="_blank" 
                                                    className="w-8 h-8 rounded-full border-2 border-white overflow-hidden shadow-sm hover:z-10 transition-transform hover:scale-110"
                                                >
                                                    <img src={img.imageUrl} className="w-full h-full object-cover" />
                                                </a>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {stats.recentLogs.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-gray-400 text-sm italic">
                                        ยังไม่มีข้อมูลการส่งผล
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color, description }) {
    const colorClasses = {
        blue: "bg-blue-50 text-blue-600 ring-blue-100",
        green: "bg-green-50 text-green-600 ring-green-100",
        orange: "bg-orange-50 text-orange-600 ring-orange-100",
        yellow: "bg-yellow-50 text-yellow-600 ring-yellow-100",
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-5 transition-all hover:shadow-md hover:-translate-y-1">
            <div className={`p-4 rounded-xl ring-4 ${colorClasses[color] || "bg-gray-50 text-gray-600 ring-gray-100"}`}>
                <span className="text-3xl">{icon}</span>
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
                <div className="flex items-baseline space-x-2">
                    <p className="text-3xl font-extrabold text-gray-800">{value}</p>
                    <span className="text-xs text-gray-400">{description}</span>
                </div>
            </div>
        </div>
    );
}
