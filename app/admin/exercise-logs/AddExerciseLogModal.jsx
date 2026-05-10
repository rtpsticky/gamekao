'use client';

import { useState, useTransition, useMemo } from 'react';
import Select from 'react-select';
import { adminAddExerciseLog } from '@/app/actions/exercise';

// สไตล์ custom สำหรับ react-select ให้เข้ากับ design system
const selectStyles = {
    control: (base, state) => ({
        ...base,
        borderRadius: '0.75rem',
        borderColor: state.isFocused ? '#6366f1' : '#e5e7eb',
        boxShadow: state.isFocused ? '0 0 0 2px rgba(99,102,241,0.15)' : base.boxShadow,
        padding: '2px 4px',
        fontSize: '0.875rem',
        '&:hover': { borderColor: '#6366f1' },
    }),
    option: (base, state) => ({
        ...base,
        fontSize: '0.875rem',
        backgroundColor: state.isSelected
            ? '#6366f1'
            : state.isFocused
                ? '#eef2ff'
                : 'white',
        color: state.isSelected ? 'white' : '#111827',
        cursor: 'pointer',
        borderRadius: '0.375rem',
        margin: '1px 4px',
        width: 'calc(100% - 8px)',
    }),
    menu: (base) => ({
        ...base,
        borderRadius: '0.75rem',
        overflow: 'hidden',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        zIndex: 9999,
    }),
    menuList: (base) => ({
        ...base,
        padding: '4px',
        maxHeight: '220px',
    }),
    placeholder: (base) => ({ ...base, color: '#9ca3af', fontSize: '0.875rem' }),
    singleValue: (base) => ({ ...base, fontSize: '0.875rem', color: '#111827' }),
    noOptionsMessage: (base) => ({ ...base, fontSize: '0.875rem', color: '#6b7280' }),
};

export default function AddExerciseLogModal({ users, groups }) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState(null);

    // กลุ่มที่เลือก (react-select value object)
    const [selectedGroup, setSelectedGroup] = useState(null);
    // user ที่เลือก (react-select value object)
    const [selectedUser, setSelectedUser] = useState(null);
    // สัปดาห์
    const [weekNumber, setWeekNumber] = useState('1');

    // Options สำหรับ group select
    const groupOptions = useMemo(
        () => groups.map((g) => ({ value: g.id, label: g.name })),
        [groups]
    );

    // Options สำหรับ user select — กรองตามกลุ่มที่เลือก
    const userOptions = useMemo(() => {
        let list = users;
        if (selectedGroup) {
            list = list.filter((u) =>
                u.groups?.some((gm) => gm.groupId === selectedGroup.value)
            );
        }
        return list.map((u) => ({
            value: u.id,
            label: `${u.firstName} ${u.lastName}${u.displayName ? ` (${u.displayName})` : ''}`,
        }));
    }, [users, selectedGroup]);

    const handleGroupChange = (opt) => {
        setSelectedGroup(opt);
        setSelectedUser(null); // reset user เมื่อเปลี่ยนกลุ่ม
        setResult(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedUser) return;

        const formData = new FormData();
        formData.set('userId', selectedUser.value);
        formData.set('weekNumber', weekNumber);
        formData.set('note', e.target.note.value || '');

        setResult(null);
        startTransition(async () => {
            const res = await adminAddExerciseLog(formData);
            setResult(res);
            if (res?.success) {
                setSelectedUser(null);
                e.target.note.value = '';
            }
        });
    };

    const handleClose = () => {
        setOpen(false);
        setResult(null);
        setSelectedGroup(null);
        setSelectedUser(null);
        setWeekNumber('1');
    };

    return (
        <>
            {/* ปุ่มเปิด Modal */}
            <button
                id="add-exercise-log-btn"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 whitespace-nowrap"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                เพิ่มประวัติ
            </button>

            {/* Modal */}
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={handleClose} />

                    {/* Modal Box */}
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-extrabold text-white">เพิ่มประวัติออกกำลังกาย</h2>
                                <p className="text-indigo-200 text-xs mt-0.5">Admin เพิ่มข้อมูลให้ผู้ใช้โดยตรง</p>
                            </div>
                            <button onClick={handleClose} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">

                            {/* ── Step 1: กลุ่ม ── */}
                            <div className="space-y-1.5">
                                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <span className="inline-flex items-center justify-center w-4 h-4 bg-indigo-600 text-white rounded-full text-[10px] font-black">1</span>
                                    เลือกกลุ่ม
                                </label>
                                <Select
                                    options={groupOptions}
                                    value={selectedGroup}
                                    onChange={handleGroupChange}
                                    placeholder="ค้นหากลุ่ม..."
                                    isClearable
                                    styles={selectStyles}
                                    noOptionsMessage={() => 'ไม่พบกลุ่ม'}
                                    instanceId="group-select"
                                />
                                {selectedGroup && (
                                    <p className="text-xs text-indigo-600 font-medium pl-1">
                                        พบ {userOptions.length} คนในกลุ่มนี้
                                    </p>
                                )}
                            </div>

                            {/* ── Step 2: ผู้ใช้ ── */}
                            <div className="space-y-1.5">
                                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <span className="inline-flex items-center justify-center w-4 h-4 bg-indigo-600 text-white rounded-full text-[10px] font-black">2</span>
                                    ผู้ใช้งาน <span className="text-red-500 ml-0.5">*</span>
                                </label>
                                <Select
                                    options={userOptions}
                                    value={selectedUser}
                                    onChange={setSelectedUser}
                                    placeholder={
                                        selectedGroup
                                            ? `ค้นหาในกลุ่ม "${selectedGroup.label}"...`
                                            : 'ค้นหาผู้ใช้ทั้งหมด...'
                                    }
                                    isClearable
                                    isSearchable
                                    styles={selectStyles}
                                    noOptionsMessage={() =>
                                        selectedGroup ? 'ไม่พบผู้ใช้ในกลุ่มนี้' : 'ไม่พบผู้ใช้'
                                    }
                                    instanceId="user-select"
                                />
                            </div>

                            {/* ── Step 3: สัปดาห์ ── */}
                            <div className="space-y-1.5">
                                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <span className="inline-flex items-center justify-center w-4 h-4 bg-indigo-600 text-white rounded-full text-[10px] font-black">3</span>
                                    สัปดาห์ที่ <span className="text-red-500 ml-0.5">*</span>
                                </label>
                                <select
                                    value={weekNumber}
                                    onChange={(e) => setWeekNumber(e.target.value)}
                                    className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                >
                                    {Array.from({ length: 8 }, (_, i) => i + 1).map((w) => (
                                        <option key={w} value={w}>สัปดาห์ที่ {w}</option>
                                    ))}
                                </select>
                            </div>

                            {/* หมายเหตุ */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    หมายเหตุ (ไม่บังคับ)
                                </label>
                                <input
                                    name="note"
                                    type="text"
                                    placeholder="เช่น เพิ่มโดย Admin เนื่องจาก..."
                                    className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                            </div>

                            {/* Info box */}
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 space-y-0.5">
                                <p className="font-bold text-blue-800 mb-1">ผลลัพธ์ที่จะเกิดขึ้น:</p>
                                <p>• ผู้ใช้เดิน 1 ช่องบนกระดาน</p>
                                <p>• ถ้าเป็นครั้งที่ 3 ของสัปดาห์ → ได้รับลูกเต๋า 🎲 1 ลูก</p>
                            </div>

                            {/* Result */}
                            {result?.error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5">
                                    <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-sm text-red-700 font-medium">{result.error}</p>
                                </div>
                            )}
                            {result?.success && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5">
                                    <svg className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="text-sm text-emerald-700">
                                        <p className="font-bold">เพิ่มประวัติสำเร็จ! (ครั้งที่ {result.sessionCount})</p>
                                        {result.earnedDice && (
                                            <p className="mt-0.5">🎲 ผู้ใช้ได้รับลูกเต๋า 1 ลูก (ส่งครบ 3 ครั้งแล้ว!)</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Buttons */}
                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-all"
                                >
                                    ปิด
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending || !selectedUser}
                                    className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
                                >
                                    {isPending ? (
                                        <>
                                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                            </svg>
                                            กำลังบันทึก...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            เพิ่มประวัติ
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
