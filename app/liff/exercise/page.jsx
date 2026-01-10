'use client';

import { useState, useEffect } from 'react';
import liff from '@line/liff';
import Swal from 'sweetalert2';
import { submitExercise } from '@/app/actions/exercise';

export default function ExerciseSubmissionPage() {
    const [lineProfile, setLineProfile] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [liffError, setLiffError] = useState(null);

    useEffect(() => {
        // Initialize LIFF
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID_EXERCISE;
        if (!liffId) return;

        liff.init({ liffId })
            .then(async () => {
                if (!liff.isLoggedIn()) {
                    liff.login();
                } else {
                    const profile = await liff.getProfile();
                    setLineProfile(profile);
                }
            })
            .catch((err) => {
                console.error('LIFF Error:', err);
                setLiffError(err.toString());
            });
    }, []);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 3) {
            Swal.fire({
                icon: 'warning',
                title: 'เลือกรูปมากเกินไป',
                text: 'สามารถอัปโหลดได้สูงสุด 3 รูปครับ',
            });
            return;
        }

        setSelectedFiles(files);

        // Generate previews
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setPreviews(newPreviews);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!lineProfile) {
            Swal.fire('Error', 'ไม่พบข้อมูลผู้ใช้ Line กรุณาลองใหม่อีกครั้ง', 'error');
            return;
        }

        if (selectedFiles.length === 0) {
            Swal.fire('ลืมรูปหรือเปล่า?', 'กรุณาแนบรูปตอนออกกำลังกายอย่างน้อย 1 รูปนะ', 'warning');
            return;
        }

        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('lineUserId', lineProfile.userId);
        formData.append('note', note);
        selectedFiles.forEach(file => {
            formData.append('images', file);
        });

        try {
            const result = await submitExercise(formData);

            if (result.error) {
                Swal.fire({
                    icon: 'error',
                    title: 'ส่งไม่ผ่าน',
                    text: result.error,
                });
            } else {
                let msg = 'บันทึกสำเร็จ! คุณได้เดิน 1 ช่อง';
                if (result.earnedDice) {
                    msg += ' และได้รับลูกเต๋าเพิ่ม 1 ลูก! 🎉';
                }

                await Swal.fire({
                    icon: 'success',
                    title: 'เยี่ยมมาก!',
                    text: msg,
                    confirmButtonText: 'ไปดูเกมเดิน',
                });

                // Redirect or close window?
                // Just reset form for now or maybe redirect to game
                // window.location.href = '/liff/game'; 
            }
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'เกิดข้อผิดพลาดทางเทคนิค', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (liffError) {
        return (
            <div className="p-4 text-center text-red-500">
                <h1 className="text-xl font-bold">LIFF Error</h1>
                <p>{liffError}</p>
                <p className="text-sm mt-2">โปรดเปิดลิ้งค์นี้ผ่านแอป LINE</p>
            </div>
        );
    }

    if (!lineProfile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
                <span className="ml-3 text-emerald-600 font-medium">กำลังโหลดข้อมูล...</span>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white px-4 py-8 font-sans">
            <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-emerald-100">
                {/* Header */}
                <div className="bg-emerald-600 p-6 text-white text-center">
                    <h1 className="text-2xl font-bold mb-2">ส่งผลออกกำลังกาย 💪</h1>
                    <p className="text-emerald-100 text-sm">สะสมแต้มสุขภาพ วันละ 1 ครั้ง</p>
                </div>

                <div className="p-6">
                    <div className="mb-6 text-center">
                        <img
                            src={lineProfile.pictureUrl}
                            alt={lineProfile.displayName}
                            className="w-16 h-16 rounded-full mx-auto mb-2 border-4 border-emerald-100 shadow-sm"
                        />
                        <p className="text-gray-600 font-medium">สวัสดี, {lineProfile.displayName}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Image Upload */}
                        <div>
                            <label className="block text-gray-700 font-bold mb-2 flex items-center gap-2">
                                <span>📸 รูปถ่ายขณะออกกำลังกาย</span>
                                <span className="text-xs font-normal text-red-400">*(1-3 รูป)</span>
                            </label>

                            <div className="grid grid-cols-3 gap-2 mb-3">
                                {previews.map((src, idx) => (
                                    <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-gray-200 relative group">
                                        <img src={src} alt="preview" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                                {previews.length < 3 && (
                                    <label className="cursor-pointer aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-emerald-500 hover:text-emerald-500 transition-colors bg-gray-50">
                                        <span className="text-3xl">+</span>
                                        <span className="text-xs">เพิ่มรูป</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            hidden
                                            onChange={handleFileChange}
                                        />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Note */}
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">
                                📝 ข้อความเพิ่มเติม (ถ้ามี)
                            </label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="วันนี้รู้สึกเป็นยังไงบ้าง? เหนื่อยไหม?"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all placeholder-gray-400"
                                rows="3"
                            ></textarea>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transform transition active:scale-95 ${isSubmitting
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
                                }`}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    กำลังบันทึก...
                                </span>
                            ) : (
                                "ส่งผลงาน! 🚀"
                            )}
                        </button>

                    </form>
                </div>
            </div>
        </main>
    );
}
