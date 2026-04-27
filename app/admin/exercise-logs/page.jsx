import { prisma } from "@/app/lib/prisma";
import Link from "next/link";

export default async function ExerciseLogsPage({ searchParams }) {
    const params = await searchParams;
    const query = params?.q || '';

    let logs = [];
    try {
        logs = await prisma.exerciseLog.findMany({
            where: {
                OR: [
                    { user: { firstName: { contains: query, mode: 'insensitive' } } },
                    { user: { lastName: { contains: query, mode: 'insensitive' } } },
                    { note: { contains: query, mode: 'insensitive' } }
                ]
            },
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
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 100
        });
    } catch (error) {
        console.error("Fetch exercise logs error:", error);
    }

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                            บันทึกการออกกำลังกาย
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm font-medium">
                            รายการส่งผลการออกกำลังกายทั้งหมด {logs.length} รายการ
                        </p>
                    </div>

                    <form className="relative group w-full md:w-96">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            name="q"
                            defaultValue={query}
                            placeholder="ค้นหาชื่อผู้ใช้ หรือข้อความเพิ่มเติม..."
                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                        />
                    </form>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-100 overflow-hidden backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider">ผู้ใช้งาน</th>
                                    <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider">กลุ่ม</th>
                                    <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">สัปดาห์</th>
                                    <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">รอบที่</th>
                                    <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider">ข้อความเพิ่มเติม</th>
                                    <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider">วันที่ส่งผล</th>
                                    <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">รูปภาพ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {logs.map((log) => (
                                    <tr key={log.id} className="group hover:bg-blue-50/30 transition-colors duration-200">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">
                                                    {log.user.firstName?.[0] || '?'}
                                                </div>
                                                <div className="text-sm font-bold text-gray-900">
                                                    {log.user.firstName} {log.user.lastName}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md inline-block">
                                                {log.user.groups?.[0]?.group?.name || 'ไม่มีสังกัด'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm font-medium text-blue-600">
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
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                log.sessionCount === 3 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                รอบที่ {log.sessionCount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-gray-600 max-w-xs truncate" title={log.note}>
                                                {log.note || '-'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {new Date(log.createdAt).toLocaleDateString('th-TH', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(log.createdAt).toLocaleTimeString('th-TH', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })} น.
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end space-x-1">
                                                {log.images.map((img, idx) => (
                                                    <a 
                                                        key={img.id} 
                                                        href={img.imageUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100 hover:border-blue-400 transition-colors block group/img"
                                                    >
                                                        <img 
                                                            src={img.imageUrl} 
                                                            alt={`Exercise ${idx + 1}`} 
                                                            className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-300"
                                                        />
                                                    </a>
                                                ))}
                                                {log.images.length === 0 && (
                                                    <span className="text-xs text-gray-400 italic">ไม่มีรูป</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-16 text-center">
                                            <div className="mx-auto w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-medium text-gray-900">ไม่พบรายการส่งผล</h3>
                                            <p className="text-gray-500 mt-1">ยังไม่มีการส่งบันทึกการออกกำลังกายในระบบ</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
