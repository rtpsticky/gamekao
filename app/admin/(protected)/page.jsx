import { prisma } from "@/app/lib/prisma";

async function getStats() {
    const [userCount, groupCount, exerciseLogCount, totalPoints] = await Promise.all([
        prisma.user.count(),
        prisma.group.count(),
        prisma.exerciseLog.count(),
        prisma.user.aggregate({
            _sum: {
                points: true
            }
        })
    ]);

    return {
        userCount,
        groupCount,
        exerciseLogCount,
        totalPoints: totalPoints._sum.points || 0
    };
}

export default async function AdminDashboard() {
    const stats = await getStats();

    return (
        <div className="space-y-8">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center h-64">
                    <h3 className="font-bold text-gray-700 mb-4 self-start">กิจกรรมล่าสุด</h3>
                    <div className="text-gray-400 flex flex-col items-center">
                        <span className="text-4xl mb-2">📊</span>
                        <span>กำลังรวบรวมข้อมูล...</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center h-64">
                    <h3 className="font-bold text-gray-700 mb-4 self-start">ประสิทธิภาพ</h3>
                    <div className="text-gray-400 flex flex-col items-center">
                        <span className="text-4xl mb-2">📈</span>
                        <span>กำลังรวบรวมข้อมูล...</span>
                    </div>
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
