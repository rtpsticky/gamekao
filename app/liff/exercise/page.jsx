'use client';

import { useState, useEffect } from 'react';
import liff from '@line/liff';
import Swal from 'sweetalert2';
import { submitExercise } from '@/app/actions/exercise';
import { getUserGameData } from '@/app/actions/game';
import imageCompression from 'browser-image-compression';

export default function ExerciseSubmissionPage() {
    const [lineProfile, setLineProfile] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState('');
    const [liffError, setLiffError] = useState(null);
    const [isInactive, setIsInactive] = useState(false);
    const [noGroup, setNoGroup] = useState(false);

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

                    // Check User Status
                    const userData = await getUserGameData(profile.userId);

                    if (userData.error === "User not found") {
                        window.location.href = '/register';
                        return;
                    }

                    if (userData.error === "ACCOUNT_INACTIVE") {
                        setIsInactive(true);
                    } else if (userData.error === "NO_GROUP") {
                        setNoGroup(true);
                    }
                }
            })
            .catch((err) => {
                console.error('LIFF Error:', err);
                setLiffError(err.toString());
            });
    }, []);

    // Cleanup previews to avoid memory leaks
    useEffect(() => {
        return () => {
            previews.forEach(url => URL.revokeObjectURL(url));
        };
    }, [previews]);

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

        // Image is now optional
        /*
        if (selectedFiles.length === 0) {
            Swal.fire('ลืมรูปหรือเปล่า?', 'กรุณาแนบรูปตอนออกกำลังกายอย่างน้อย 1 รูปนะ', 'warning');
            return;
        }
        */

        setIsSubmitting(true);
        setSubmitStatus('กำลังเตรียมข้อมูล...');

        const formData = new FormData();
        formData.append('lineUserId', lineProfile.userId);
        formData.append('note', note);

        try {
            // Options for image compression
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true
            };

            // Compress images if any
            if (selectedFiles.length > 0) {
                setSubmitStatus('กำลังลดขนาดรูปภาพ...');
                const compressedFilesPromises = selectedFiles.map(file => imageCompression(file, options));
                const compressedFiles = await Promise.all(compressedFilesPromises);

                compressedFiles.forEach(file => {
                    formData.append('images', file);
                });
            }

            let result;
            let attempts = 0;
            const maxAttempts = 5;
            let success = false;

            while (attempts < maxAttempts && !success) {
                attempts++;
                setSubmitStatus(attempts === 1 ? 'กำลังส่งข้อมูล...' : `กำลังพยายามส่งใหม่ (ครั้งที่ ${attempts}/${maxAttempts})...`);

                try {
                    result = await submitExercise(formData);

                    if (!result.error) {
                        success = true;
                    } else {
                        // Check if it's a business logic error (don't retry)
                        const businessErrors = [
                            "ไม่พบข้อมูลผู้ใช้",
                            "อัปโหลดได้สูงสุด",
                            "ไม่พบผู้ใช้ในระบบ",
                            "บัญชีของคุณถูกระงับ",
                            "วันนี้คุณส่งผล",
                            "ส่งผลครบ",
                            "NO_GROUP",
                            "ข้อมูลซ้ำ"
                        ];
                        
                        const isBusinessError = businessErrors.some(msg => result.error.includes(msg));
                        if (isBusinessError) {
                            break; // Stop retrying for business errors
                        }

                        // If it's a technical error, wait and retry
                        if (attempts < maxAttempts) {
                            await new Promise(r => setTimeout(r, 2000));
                        }
                    }
                } catch (err) {
                    console.error(`Attempt ${attempts} failed:`, err);
                    if (attempts < maxAttempts) {
                        await new Promise(r => setTimeout(r, 2000));
                    } else {
                        result = { error: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ' };
                    }
                }
            }

            if (success) {
                let msg = 'บันทึกสำเร็จ! คุณได้เดิน 1 ช่อง';
                if (result.earnedDice) {
                    msg += ' และได้รับลูกเต๋าเพิ่ม 1 ลูก! 🎉';
                }

                await Swal.fire({
                    icon: 'success',
                    title: 'เยี่ยมมาก!',
                    text: msg,
                    confirmButtonText: 'ไปดูเกมเดิน',
                }).then(() => {
                    window.location.href = 'https://liff.line.me/2008850670-0gahTNEx';
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'ส่งไม่ผ่าน',
                    text: result.error || 'ไม่สามารถส่งข้อมูลได้หลังจากพยายามหลายครั้ง',
                });
            }
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาดทางเทคนิค',
                text: `ไม่สามารถส่งข้อมูลได้: ${err.message || 'โปรดลองใหม่อีกครั้ง หรือติดต่อเจ้าหน้าที่'}`,
                confirmButtonText: 'รับทราบ',
                confirmButtonColor: '#10b981'
            });
        } finally {
            setIsSubmitting(false);
            setSubmitStatus('');
        }
    };

    if (liffError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
                <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-slate-800 mb-2">การเชื่อมต่อผิดพลาด</h1>
                    <p className="text-slate-600 text-sm mb-4">
                        ไม่สามารถเข้าถึงข้อมูล LINE ได้ ({liffError})
                    </p>
                    <p className="text-emerald-600 font-medium text-sm">
                        โปรดลองเปิดผ่านแอป LINE หรือตรวจสอบอินเทอร์เน็ต
                    </p>
                </div>
            </div>
        );
    }

    if (isInactive) {
        return (
            <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6 text-center font-sans">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                    <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">บัญชีถูกระงับ</h2>
                <p className="text-slate-500">บัญชีของคุณถูกระงับการใช้งานชั่วคราว<br />กรุณาติดต่อเจ้าหน้าที่</p>
            </div>
        );
    }

    if (noGroup) {
        return (
            <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6 text-center font-sans">
                <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                    <span className="text-4xl">⏳</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">รอการเข้ากลุ่ม</h2>
                <p className="text-slate-500">กรุณารอเจ้าหน้าที่ดึงเข้ากลุ่มเพื่อเริ่มเล่น</p>
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
                                <span className="text-xs font-normal text-slate-400">(ถ้ามี, สูงสุด 3 รูป)</span>
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
                                    {submitStatus || "กำลังบันทึก..."}
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
