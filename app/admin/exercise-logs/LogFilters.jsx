'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function LogFilters({ groups, initialQuery, initialGroupId }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        const params = new URLSearchParams(searchParams);
        
        if (value) {
            params.set(name, value);
        } else {
            params.delete(name);
        }
        
        // Always reset to page 1 when filtering
        params.delete('page');
        
        router.push(`/admin/exercise-logs?${params.toString()}`);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const q = formData.get('q');
        const groupId = formData.get('groupId');
        
        const params = new URLSearchParams(searchParams);
        if (q) params.set('q', q); else params.delete('q');
        if (groupId) params.set('groupId', groupId); else params.delete('groupId');
        params.delete('page');
        
        router.push(`/admin/exercise-logs?${params.toString()}`);
    };

    return (
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-stretch md:items-end gap-3 w-full md:w-auto">
            <div className="w-full md:w-48">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">กลุ่ม</label>
                <select 
                    name="groupId" 
                    defaultValue={initialGroupId}
                    className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                    onChange={handleFilterChange}
                >
                    <option value="">ทุกกลุ่ม</option>
                    {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
            </div>
            <div className="relative group w-full md:w-80">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">ค้นหา</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        name="q"
                        defaultValue={initialQuery}
                        placeholder="ชื่อผู้ใช้ หรือข้อความ..."
                        className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                    />
                </div>
            </div>
            <button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 shrink-0"
            >
                ค้นหา
            </button>
        </form>
    );
}
