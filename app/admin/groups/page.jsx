'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { getGroups, createGroup, updateGroup, deleteGroup } from '@/app/actions/group';
import Link from 'next/link';

export default function GroupsPage() {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        startDate: '',
        endDate: '',
        isActive: true
    });

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        setLoading(true);
        const res = await getGroups();
        if (res.groups) {
            setGroups(res.groups);
        } else {
            console.error(res.error);
            Swal.fire('Error', 'ไม่สามารถโหลดข้อมูลกลุ่มได้', 'error');
        }
        setLoading(false);
    };

    const handleOpenModal = (group = null) => {
        if (group) {
            setEditingGroup(group);
            setFormData({
                name: group.name,
                startDate: group.startDate ? new Date(group.startDate).toISOString().split('T')[0] : '',
                endDate: group.endDate ? new Date(group.endDate).toISOString().split('T')[0] : '',
                isActive: group.isActive
            });
        } else {
            setEditingGroup(null);
            setFormData({
                name: '',
                startDate: '',
                endDate: '',
                isActive: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.name.trim()) {
            Swal.fire('กรุณากรอกชื่อกลุ่ม', '', 'warning');
            return;
        }

        try {
            let res;
            if (editingGroup) {
                res = await updateGroup(editingGroup.id, formData);
            } else {
                res = await createGroup(formData);
            }

            if (res.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'บันทึกสำเร็จ',
                    timer: 1500,
                    showConfirmButton: false
                });
                setIsModalOpen(false);
                fetchGroups();
            } else {
                Swal.fire('Error', res.error || 'เกิดข้อผิดพลาด', 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Network error', 'error');
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'ยืนยันการลบ?',
            text: "การลบกลุ่มจะลบสมาชิกทั้งหมดออกจากกลุ่มนี้ด้วย",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ลบเลย',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            const res = await deleteGroup(id);
            if (res.success) {
                Swal.fire('ลบเรียบร้อย', '', 'success');
                fetchGroups();
            } else {
                Swal.fire('Error', res.error, 'error');
            }
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        จัดการกลุ่มผู้ใช้งาน 👥
                    </h1>
                    <p className="text-slate-500 mt-1">สร้างและจัดการกลุ่มสำหรับการแข่งขัน</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 font-medium"
                >
                    <span className="text-xl">+</span> สร้างกลุ่มใหม่
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : groups.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="text-6xl mb-4">📂</div>
                    <h3 className="text-xl font-bold text-slate-700">ยังไม่มีกลุ่ม</h3>
                    <p className="text-slate-500 mb-6">เริ่มสร้างกลุ่มแรกกันเลย!</p>
                    <button
                        onClick={() => handleOpenModal()}
                        className="text-blue-600 font-bold hover:underline"
                    >
                        สร้างกลุ่มใหม่
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map((group) => (
                        <div key={group.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-100 overflow-hidden group">
                            <div className={`h-2 w-full ${group.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">{group.name}</h3>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${group.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {group.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleOpenModal(group)}
                                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(group.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 text-sm text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🗓️</span>
                                        <span>
                                            {group.startDate ? new Date(group.startDate).toLocaleDateString('th-TH') : '-'}
                                            {' -> '}
                                            {group.endDate ? new Date(group.endDate).toLocaleDateString('th-TH') : '-'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">👥</span>
                                        <span className="font-bold text-slate-700">{group._count?.members || 0}</span> สมาชิก
                                    </div>
                                </div>

                                <Link
                                    href={`/admin/groups/${group.id}`}
                                    className="mt-6 block w-full py-3 text-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-blue-600 font-bold transition-colors border border-slate-200 hover:border-blue-200"
                                >
                                    จัดการสมาชิก
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-slate-50 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">
                                {editingGroup ? 'แก้ไขกลุ่ม' : 'สร้างกลุ่มใหม่'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">ชื่อกลุ่ม</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="เช่น ชมรมผู้สูงอายุสายไหม"
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">วันเริ่ม</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">วันสิ้นสุด</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">ใช้งานกลุ่มนี้ (Active)</label>
                            </div>

                            <button
                                type="submit"
                                className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/30 active:scale-95"
                            >
                                บันทึกข้อมูล
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
