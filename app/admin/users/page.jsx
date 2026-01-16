import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function UsersPage({ searchParams }) {
    // Await searchParams as required in Next.js 15+
    const params = await searchParams;
    const query = params?.q || '';

    const users = await prisma.user.findMany({
        where: {
            OR: [
                { displayName: { contains: query, mode: 'insensitive' } },
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } },
            ]
        },
        orderBy: { createdAt: 'desc' },
        take: 50
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">จัดการผู้ใช้งาน ({users.length})</h1>
                <form className="flex gap-2">
                    <input
                        name="q"
                        defaultValue={query}
                        placeholder="ค้นหาชื่อ..."
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    />
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm transition-colors">ค้นหา</button>
                </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">รูปโปรไฟล์</th>
                                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">ชื่อ-นามสกุล</th>
                                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">อายุ</th>
                                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">เพศ</th>
                                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">คะแนน</th>
                                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">วันที่สมัคร</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        {user.profileImageUrl ? (
                                            <img src={user.profileImageUrl} alt="" className="w-10 h-10 rounded-full object-cover bg-gray-200 border border-gray-200" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold border border-gray-300">
                                                {user.firstName ? user.firstName[0] : '?'}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="font-semibold text-gray-900">{user.firstName} {user.lastName}</div>
                                        <div className="text-xs text-gray-500">{user.displayName || '-'}</div>
                                    </td>
                                    <td className="p-4 text-gray-600">{user.age}</td>
                                    <td className="p-4 text-gray-600">{user.gender}</td>
                                    <td className="p-4 font-bold text-blue-600">{user.points}</td>
                                    <td className="p-4 text-gray-500 text-sm">
                                        {new Date(user.createdAt).toLocaleDateString('th-TH', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-gray-500">
                                        <p className="text-lg">ไม่พบข้อมูลผู้ใช้งาน</p>
                                        <p className="text-sm">ลองค้นหาด้วยคำค้นอื่น</p>
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
