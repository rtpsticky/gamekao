'use client';

import { useState, useEffect, use } from 'react';
import { getGroupDetails, removeMemberFromGroup, getAvailableUsersForGroup, addMembersToGroup } from '@/app/actions/group';
import Swal from 'sweetalert2';
import Link from 'next/link';

export default function GroupDetailsPage({ params }) {
    // Unwrap params using React.use()
    const { id } = use(params);

    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Add Member State
    const [availableUsers, setAvailableUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState(new Set());
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);

    useEffect(() => {
        fetchGroupDetails();
    }, [id]);

    const fetchGroupDetails = async () => {
        setLoading(true);
        const res = await getGroupDetails(id);
        if (res.group) {
            setGroup(res.group);
        } else {
            Swal.fire('Error', 'ไม่พบกลุ่มนี้', 'error');
        }
        setLoading(false);
    };

    const fetchAvailableUsers = async (query = '') => {
        setIsLoadingUsers(true);
        const res = await getAvailableUsersForGroup(id, query);
        if (res.users) {
            setAvailableUsers(res.users);
        }
        setIsLoadingUsers(false);
    };

    // Open Modal & Initial Fetch
    const handleOpenAddModal = () => {
        setIsAddModalOpen(true);
        setSearchQuery('');
        setSelectedUserIds(new Set());
        fetchAvailableUsers();
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
        // Load immediately on typing
        fetchAvailableUsers(query);
    };

    const toggleUserSelection = (userId) => {
        const newSet = new Set(selectedUserIds);
        if (newSet.has(userId)) {
            newSet.delete(userId);
        } else {
            newSet.add(userId);
        }
        setSelectedUserIds(newSet);
    };

    const handleAddSelectedInfo = async () => {
        if (selectedUserIds.size === 0) return;

        const res = await addMembersToGroup(id, Array.from(selectedUserIds));
        if (res.success) {
            Swal.fire({
                icon: 'success',
                title: `เพิ่มสมาชิก ${selectedUserIds.size} คนเรียบร้อย`,
                timer: 1500,
                showConfirmButton: false
            });
            setIsAddModalOpen(false);
            fetchGroupDetails();
        } else {
            Swal.fire('Error', res.error, 'error');
        }
    };

    const handleRemoveUser = async (userId) => {
        const result = await Swal.fire({
            title: 'เอาสมาชิกออก?',
            text: "ประวัติการออกกำลังกาย แต้ม และตำแหน่งในเกมจะถูกลบออกทั้งหมด",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'เอาออก',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#d33'
        });

        if (result.isConfirmed) {
            const res = await removeMemberFromGroup(id, userId);
            if (res.success) {
                Swal.fire('เรียบร้อย', '', 'success');
                fetchGroupDetails();
            } else {
                Swal.fire('Error', res.error, 'error');
            }
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    if (!group) return null;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
            {/* Header / Nav */}
            <div className="flex items-center gap-4 text-slate-500 mb-4">
                <Link href="/admin/groups" className="hover:text-blue-600 flex items-center gap-1">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    กลับไปหน้ารวมกลุ่ม
                </Link>
                <span>/</span>
                <span className="font-bold text-slate-800">{group.name}</span>
            </div>

            {/* Top Card */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 mb-2">{group.name}</h1>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-lg border border-slate-200">
                            📅 {group.startDate ? new Date(group.startDate).toLocaleDateString('th-TH') : '-'} — {group.endDate ? new Date(group.endDate).toLocaleDateString('th-TH') : '-'}
                        </span>
                        <span className={`px-3 py-1 rounded-lg border flex items-center gap-2 ${group.isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                            {group.isActive ? '✅ Active' : '🌑 Inactive'}
                        </span>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                        href={`/admin/groups/${id}/exercises`}
                        className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-6 py-3 rounded-xl font-bold font-lg shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <span className="text-xl">🏋️‍♀️</span> ท่าออกกำลังกาย
                    </Link>
                    <button
                        onClick={handleOpenAddModal}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold font-lg shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <span className="text-xl">+</span> เพิ่มสมาชิก
                    </button>
                </div>
            </div>

            {/* Members List */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        รายชื่อสมาชิก <span className="bg-blue-100 text-blue-700 text-sm py-0.5 px-2 rounded-full">{group.members.length}</span>
                    </h2>
                </div>

                {group.members.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-5xl mb-4 opacity-50">👥</div>
                        <p className="text-slate-500">ยังไม่มีสมาชิกในกลุ่มนี้</p>
                        <button onClick={handleOpenAddModal} className="text-blue-600 font-bold hover:underline mt-2">เพิ่มสมาชิกเลย</button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                <tr>
                                    <th className="p-4 pl-6">ชื่อ - นามสกุล</th>
                                    <th className="p-4">อายุ / เพศ</th>
                                    <th className="p-4 text-center">คะแนน</th>
                                    <th className="p-4 text-right pr-6">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {group.members.map(({ user }) => (
                                    <tr key={user.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                                    {user.profileImageUrl ? (
                                                        <img src={user.profileImageUrl} alt="profile" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs">NO IMG</div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800">{user.displayName || '-'}</div>
                                                    <div className="text-xs text-slate-500">{user.firstName} {user.lastName}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-600">
                                            {user.age} ปี / {user.gender === 'male' ? 'ชาย' : 'หญิง'}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-bold border border-blue-100">
                                                {(user.currentPosition || 1) - 1}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right pr-6">
                                            <button
                                                onClick={() => handleRemoveUser(user.id)}
                                                className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
                                                title="เอาออกจากกลุ่ม"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Member Modal (Multi-Select) */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[85vh]">
                        <div className="px-6 py-4 bg-slate-50 border-b flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">เพิ่มสมาชิกเข้ากลุ่ม</h3>
                                <p className="text-xs text-slate-500">เลือกผู้ใช้งานที่ต้องการเพิ่ม</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                        </div>

                        <div className="p-4 shrink-0 border-b border-slate-100 bg-white z-10">
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all placeholder-slate-400 bg-slate-50"
                                placeholder="🔍 ค้นหาชื่อ..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="overflow-y-auto p-2 flex-1 space-y-1">
                            {isLoadingUsers ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                    <p className="text-slate-400 text-sm">กำลังโหลดรายชื่อ...</p>
                                </div>
                            ) : availableUsers.length > 0 ? (
                                availableUsers.map(user => {
                                    const isSelected = selectedUserIds.has(user.id);
                                    return (
                                        <div
                                            key={user.id}
                                            onClick={() => toggleUserSelection(user.id)}
                                            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${isSelected
                                                ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200'
                                                : 'hover:bg-slate-50 border-transparent hover:border-slate-100'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300 bg-white'
                                                    }`}>
                                                    {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                </div>

                                                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                                    {user.profileImageUrl && <img src={user.profileImageUrl} className="w-full h-full object-cover" />}
                                                </div>
                                                <div>
                                                    <div className={`font-bold ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>{user.displayName}</div>
                                                    <div className="text-xs text-slate-500">{user.firstName} {user.lastName}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-12 text-slate-400">
                                    <div className="text-4xl mb-2">🔍</div>
                                    <p>ไม่พบผู้ใช้งานที่สามารถเพิ่มได้</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                            <div className="text-sm font-medium text-slate-600">
                                เลือกแล้ว <span className="text-blue-600 font-bold text-lg">{selectedUserIds.size}</span> คน
                            </div>
                            <button
                                onClick={handleAddSelectedInfo}
                                disabled={selectedUserIds.size === 0}
                                className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${selectedUserIds.size > 0
                                    ? 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95'
                                    : 'bg-slate-300 cursor-not-allowed'
                                    }`}
                            >
                                เพิ่มเข้ากลุ่ม ({selectedUserIds.size})
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
