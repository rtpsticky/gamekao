'use client';

export default function ExportUsersButton({ users }) {
    const handleExport = () => {
        const headers = [
            'ชื่อ',
            'นามสกุล',
            'ชื่อ LINE',
            'อายุ',
            'เพศ',
            'เบอร์โทร',
            'คะแนนสะสม',
            'สถานะ',
            'วันที่สมัคร',
        ];

        const rows = users.map((user) => [
            user.firstName || '',
            user.lastName || '',
            user.displayName || '',
            user.age || '',
            user.gender === 'male' ? 'ชาย' : user.gender === 'female' ? 'หญิง' : '',
            user.phoneNumber || '',
            Math.max(0, (user.currentPosition || 0) - 1),
            user.isActive ? 'ใช้งาน' : 'ปิดใช้งาน',
            new Date(user.createdAt).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            }),
        ]);

        const csvContent = [headers, ...rows]
            .map((row) =>
                row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
            )
            .join('\n');

        // BOM สำหรับรองรับภาษาไทยใน Excel
        const bom = '\uFEFF';
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        link.download = `users_${dateStr}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <button
            id="export-users-btn"
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 whitespace-nowrap"
        >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
            </svg>
            Export CSV
        </button>
    );
}
