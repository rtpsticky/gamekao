'use client';

import { useState, useEffect, use } from 'react';
import { getGroupExercises, createGroupExercise, updateGroupExercise, deleteGroupExercise, copyExercisesFromGroup, deleteWeekExercises } from '@/app/actions/groupExercise';
import { getGroupDetails, getGroups } from '@/app/actions/group';
import Swal from 'sweetalert2';
import Link from 'next/link';

export default function GroupExercisesPage({ params }) {
    const { id } = use(params);

    const [group, setGroup] = useState(null);
    const [exercises, setExercises] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExercise, setEditingExercise] = useState(null);

    // Copy Week State
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [groups, setGroups] = useState([]);
    const [copyConfig, setCopyConfig] = useState({
        sourceGroupId: '',
        sourceWeek: 1,
        targetWeek: 2
    });

    // Form State
    const [formData, setFormData] = useState({
        weekNumber: 1,
        name: '',
        description: '',
        videoUrl: ''
    });

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        setLoading(true);
        // Fetch Group Info for header
        const groupRes = await getGroupDetails(id);
        if (groupRes.group) {
            setGroup(groupRes.group);
            // Default source group to current group
            setCopyConfig(prev => ({ ...prev, sourceGroupId: id }));
        }

        // Fetch Exercises
        const res = await getGroupExercises(id);
        if (res.exercises) {
            setExercises(res.exercises);
        } else {
            console.error(res.error);
        }

        // Fetch all groups for copy source list
        const groupsRes = await getGroups();
        if (groupsRes.groups) {
            setGroups(groupsRes.groups);
        }

        setLoading(false);
    };

    const handleOpenModal = (exercise = null) => {
        if (exercise) {
            setEditingExercise(exercise);
            setFormData({
                weekNumber: exercise.weekNumber,
                name: exercise.name,
                description: exercise.description || '',
                videoUrl: exercise.videoUrl || ''
            });
        } else {
            setEditingExercise(null);
            setFormData({
                weekNumber: 1,
                name: '',
                description: '',
                videoUrl: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            Swal.fire('กรุณากรอกชื่อท่า', '', 'warning');
            return;
        }

        try {
            let res;
            if (editingExercise) {
                res = await updateGroupExercise(editingExercise.id, { ...formData, groupId: id });
            } else {
                res = await createGroupExercise({ ...formData, groupId: id });
            }

            if (res.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'บันทึกสำเร็จ',
                    timer: 1500,
                    showConfirmButton: false
                });
                setIsModalOpen(false);
                fetchData();
            } else {
                Swal.fire('Error', res.error || 'เกิดข้อผิดพลาด', 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Network error', 'error');
        }
    };

    const handleDelete = async (exerciseId) => {
        const result = await Swal.fire({
            title: 'ยืนยันการลบ?',
            text: "ข้อมูลนี้จะหายไปถาวร",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ลบเลย',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            const res = await deleteGroupExercise(exerciseId);
            if (res.success) {
                Swal.fire('ลบเรียบร้อย', '', 'success');
                fetchData();
            } else {
                Swal.fire('Error', res.error, 'error');
            }
        }
    };

    const handleCopySubmit = async (e) => {
        e.preventDefault();

        // If same group, checks if sourceWeek == targetWeek
        if (copyConfig.sourceGroupId === id && copyConfig.sourceWeek === copyConfig.targetWeek) {
            Swal.fire('Error', 'สัปดาห์ต้นทางและปลายทางต้องไม่เหมือนกัน (กรณีกลุ่มเดียวกัน)', 'error');
            return;
        }

        const sourceGroupName = groups.find(g => g.id === copyConfig.sourceGroupId)?.name || 'กลุ่มต้นทาง';

        const result = await Swal.fire({
            title: 'ยืนยันการคัดลอก?',
            text: `ท่าออกกำลังกายจาก "${sourceGroupName}" (Week ${copyConfig.sourceWeek}) จะถูกเพิ่มไปที่ Week ${copyConfig.targetWeek}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'คัดลอก',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            const res = await copyExercisesFromGroup(id, copyConfig.sourceGroupId, copyConfig.sourceWeek, copyConfig.targetWeek);
            if (res.success) {
                Swal.fire('คัดลอกสำเร็จ', `เพิ่ม ${res.count} ท่าไปยัง Week ${copyConfig.targetWeek}`, 'success');
                setIsCopyModalOpen(false);
                fetchData();
            } else {
                Swal.fire('Error', res.error, 'error');
            }
        }
    };

    const handleDeleteWeek = async (week, e) => {
        e.stopPropagation();
        const result = await Swal.fire({
            title: `ลบท่า Week ${week}?`,
            text: "ท่าทั้งหมดในสัปดาห์นี้จะถูกลบถาวร",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ลบทั้งหมด',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            const res = await deleteWeekExercises(id, week);
            if (res.success) {
                Swal.fire('ลบเรียบร้อย', '', 'success');
                // Remove week from expanded set if present
                const newExpanded = new Set(expandedWeeks);
                newExpanded.delete(Number(week));
                setExpandedWeeks(newExpanded);
                fetchData();
            } else {
                Swal.fire('Error', res.error, 'error');
            }
        }
    };

    const [expandedWeeks, setExpandedWeeks] = useState(new Set([1])); // Default expand week 1

    const toggleWeek = (week) => {
        const newExpanded = new Set(expandedWeeks);
        if (newExpanded.has(week)) {
            newExpanded.delete(week);
        } else {
            newExpanded.add(week);
        }
        setExpandedWeeks(newExpanded);
    };

    const groupedExercises = exercises.reduce((acc, curr) => {
        if (!acc[curr.weekNumber]) {
            acc[curr.weekNumber] = [];
        }
        acc[curr.weekNumber].push(curr);
        return acc;
    }, {});

    const sortedWeeks = Object.keys(groupedExercises).sort((a, b) => a - b);

    if (loading && !group) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans">
            {/* Header / Nav */}
            <div className="flex items-center gap-4 text-slate-500 mb-4">
                <Link href="/admin/groups" className="hover:text-indigo-600 flex items-center gap-1">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    กลับไปหน้ารวมกลุ่ม
                </Link>
                <span>/</span>
                <Link href={`/admin/groups/${id}`} className="hover:text-indigo-600 font-bold">
                    {group?.name || 'Loading...'}
                </Link>
                <span>/</span>
                <span className="font-bold text-slate-800">ท่าออกกำลังกาย</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        จัดการท่าออกกำลังกาย 🏋️‍♀️
                    </h1>
                    <p className="text-slate-500 mt-1">กำหนดท่าออกกำลังกายในแต่ละสัปดาห์</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsCopyModalOpen(true)}
                        className="flex items-center gap-2 bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 px-5 py-3 rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95 font-medium"
                    >
                        📋 คัดลอก Week
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 font-medium"
                    >
                        <span className="text-xl">+</span> เพิ่มท่าใหม่
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : exercises.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="text-6xl mb-4">🧘</div>
                    <h3 className="text-xl font-bold text-slate-700">ยังไม่มีท่าออกกำลังกาย</h3>
                    <p className="text-slate-500 mb-6">เริ่มเพิ่มท่าสำหรับสัปดาห์แรกกันเลย!</p>
                    <button
                        onClick={() => handleOpenModal()}
                        className="text-indigo-600 font-bold hover:underline"
                    >
                        เพิ่มท่าใหม่
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedWeeks.map(week => {
                        const isExpanded = expandedWeeks.has(Number(week));
                        return (
                            <div key={week} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                                <div
                                    className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                                    onClick={() => toggleWeek(Number(week))}
                                >
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                                        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-sm">Week {week}</span>
                                        <span>สัปดาห์ที่ {week}</span>
                                        <span className="text-sm font-normal text-slate-500">({groupedExercises[week].length} ท่า)</span>
                                    </h2>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={(e) => handleDeleteWeek(Number(week), e)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                            title="ลบทั้ง Week"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                        <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className="divide-y divide-slate-50 animate-in slide-in-from-top-2 duration-200">
                                        {groupedExercises[week].map((exercise) => (
                                            <div key={exercise.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row gap-4 justify-between items-start md:items-center group">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-slate-800 mb-1">{exercise.name}</h3>
                                                    {exercise.description && (
                                                        <p className="text-slate-500 text-sm mb-2">{exercise.description}</p>
                                                    )}
                                                    {exercise.videoUrl && (
                                                        <a
                                                            href={exercise.videoUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md hover:bg-red-100 transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" /></svg>
                                                            ดูวิดีโอ
                                                        </a>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleOpenModal(exercise); }}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    >
                                                        ✏️ แก้ไข
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(exercise.id); }}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        🗑️ ลบ
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-slate-50 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">
                                {editingExercise ? 'แก้ไขท่าออกกำลังกาย' : 'เพิ่มท่าใหม่'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">สัปดาห์ที่ (Week)</label>
                                <select
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                    value={formData.weekNumber}
                                    onChange={(e) => setFormData({ ...formData, weekNumber: e.target.value })}
                                >
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                        <option key={num} value={num}>Week {num}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">ชื่อท่า</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="เช่น ท่าเดินย่ำเท้า"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">คำอธิบาย</label>
                                <textarea
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="รายละเอียดวิธ๊การทำ..."
                                    rows="3"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">รหัสวิดีโอ (Google Drive ID)</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                    value={formData.videoUrl}
                                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                                    placeholder="เช่น 1aBcDeFgHiJkLmNoPqRsTuVwXyZ"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/30 active:scale-95"
                            >
                                บันทึกข้อมูล
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Copy Week Modal */}
            {isCopyModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-slate-50 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">คัดลอก Week</h3>
                            <button onClick={() => setIsCopyModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleCopySubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">จากกลุ่ม (Source Group)</label>
                                <select
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                    value={copyConfig.sourceGroupId}
                                    onChange={(e) => setCopyConfig({ ...copyConfig, sourceGroupId: e.target.value })}
                                >
                                    {groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name} {g.id === id ? '(ปัจจุบัน)' : ''}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">จากสัปดาห์ (Source Week)</label>
                                <select
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                    value={copyConfig.sourceWeek}
                                    onChange={(e) => setCopyConfig({ ...copyConfig, sourceWeek: parseInt(e.target.value) })}
                                >
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                        <option key={num} value={num}>Week {num}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-center text-slate-400">
                                <svg className="w-6 h-6 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">ไปยัง (Target Week)</label>
                                <select
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                    value={copyConfig.targetWeek}
                                    onChange={(e) => setCopyConfig({ ...copyConfig, targetWeek: parseInt(e.target.value) })}
                                >
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                        <option key={num} value={num}>Week {num}</option>
                                    ))}
                                </select>
                            </div>
                            <p className="text-xs text-slate-500 bg-yellow-50 p-2 rounded border border-yellow-200">
                                * ท่าออกกำลังกายจะถูกเพิ่มเข้าไปใน Week ปลายทาง (ไม่ทับของเดิม)
                            </p>

                            <button
                                type="submit"
                                className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/30 active:scale-95"
                            >
                                คัดลอกทันที
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
