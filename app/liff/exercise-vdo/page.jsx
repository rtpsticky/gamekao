'use client';

import { useState, useEffect } from 'react';
import liff from '@line/liff';
import { getUserCurrentWeekExercises } from '@/app/actions/groupExercise';
import Swal from 'sweetalert2';

export default function LiffExerciseVdoPage() {
    const [exercises, setExercises] = useState([]);
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [week, setWeek] = useState(0);
    const [groupName, setGroupName] = useState('');

    useEffect(() => {
        const initLiff = async () => {
            try {
                await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID_EXERCISE_VDO });
                if (!liff.isLoggedIn()) {
                    liff.login();
                    return;
                }
                const profile = await liff.getProfile();
                await fetchExercises(profile.userId);
            } catch (err) {
                console.error('LIFF Error:', err);
                setError('Failed to initialize LIFF');
                setLoading(false);
            }
        };

        const fetchExercises = async (lineUserId) => {
            try {
                const res = await getUserCurrentWeekExercises(lineUserId);
                if (res.error) {
                    setError(res.error);
                } else if (res.message) {
                    setError(res.message);
                } else {
                    setExercises(res.exercises);
                    setWeek(res.week);
                    setGroupName(res.groupName);
                }
            } catch (err) {
                console.error(err);
                setError('Failed to fetch exercises');
            }
            setLoading(false);
        };

        initLiff();
    }, []);

    const handleNext = () => {
        if (currentExerciseIndex < exercises.length - 1) {
            setCurrentExerciseIndex(prev => prev + 1);
        } else {
            // Finished all exercises
            Swal.fire({
                title: 'ยอดเยี่ยม! 🎉',
                text: 'คุณดูครบทุกท่าแล้ว',
                icon: 'success',
                confirmButtonText: 'ดูอีกรอบ',
                showCancelButton: true,
                cancelButtonText: 'ปิด',
            }).then((result) => {
                if (result.isConfirmed) {
                    setCurrentExerciseIndex(0);
                } else {
                    liff.closeWindow();
                }
            });
        }
    };

    const handlePrev = () => {
        if (currentExerciseIndex > 0) {
            setCurrentExerciseIndex(prev => prev - 1);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-slate-500 animate-pulse">กำลังโหลดข้อมูล...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
                <div className="text-6xl mb-4">🚫</div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">เกิดข้อผิดพลาด</h2>
                <p className="text-slate-500">{error}</p>
            </div>
        );
    }

    if (exercises.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
                <div className="text-6xl mb-4">🧘</div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">ยังไม่มีท่าออกกำลังกาย</h2>
                <p className="text-slate-500">สำหรับสัปดาห์นี้</p>
            </div>
        );
    }

    const currentExercise = exercises[currentExerciseIndex];

    // Helper to construct Google Drive Embed URL from ID
    const getEmbedUrl = (id) => {
        if (!id) return '';
        return `https://drive.google.com/file/d/${id}/preview`;
    };



    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            {/* Header */}
            <div className="bg-indigo-600 text-white px-6 py-4 rounded-b-3xl shadow-lg relative z-10">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{groupName}</span>
                    <span className="text-xs font-bold opacity-80">{currentExerciseIndex + 1} / {exercises.length}</span>
                </div>
                <h1 className="text-2xl font-bold">สัปดาห์ที่ {week} 🔥</h1>
                <p className="text-indigo-100 text-sm opacity-90">ฝึกท่าออกกำลังกายประจำสัปดาห์</p>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">

                {/* Video Player */}
                <div className="relative w-full pt-[56.25%] bg-slate-100 rounded-2xl overflow-hidden shadow-md border border-slate-100">
                    {currentExercise.videoUrl ? (
                        <iframe
                            className="absolute top-0 left-0 w-full h-full"
                            src={getEmbedUrl(currentExercise.videoUrl)}
                            title={currentExercise.name}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-100">
                            ไม่มีวิดีโอ
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="space-y-3">
                    <h2 className="text-2xl font-extrabold text-slate-800">
                        <span className="text-indigo-600 mr-2">#{currentExercise.sequence}</span>
                        {currentExercise.name}
                    </h2>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-600 leading-relaxed">
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-wider">คำอธิบาย</h3>
                        {currentExercise.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
                    </div>
                </div>

            </div>

            {/* Navigation Buttons */}
            <div className="p-6 bg-white border-t border-slate-100 sticky bottom-0 z-20">
                <div className="flex gap-4">
                    <button
                        onClick={handlePrev}
                        disabled={currentExerciseIndex === 0}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${currentExerciseIndex === 0
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95'
                            }`}
                    >
                        ย้อนกลับ
                    </button>
                    <button
                        onClick={handleNext}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 flex justify-center items-center gap-2"
                    >
                        {currentExerciseIndex === exercises.length - 1 ? 'เสร็จสิ้น' : 'ท่าถัดไป →'}
                    </button>
                </div>
            </div>
        </div>
    );
}
