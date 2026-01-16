'use client';

import { useState, useEffect, Suspense } from 'react';
import liff from '@line/liff';
import { getLeaderboardData, getRewardsData, claimReward } from '@/app/actions/stats';
import { getUserGameData } from '@/app/actions/game';
import Swal from 'sweetalert2';

function StatsContent() {
    // State
    const [lineUserId, setLineUserId] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [myStats, setMyStats] = useState(null);
    const [rewards, setRewards] = useState([]);
    const [rewardLoading, setRewardLoading] = useState(false);
    const [statsLoading, setStatsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' or 'rewards'
    const [isInactive, setIsInactive] = useState(false);
    const [noGroup, setNoGroup] = useState(false);
    const [activeGroup, setActiveGroup] = useState(null);

    useEffect(() => {
        // Initialize LIFF
        liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID_STATS || '' })
            .then(() => {
                if (!liff.isLoggedIn()) {
                    liff.login();
                } else {
                    liff.getProfile().then(profile => {
                        setLineUserId(profile.userId);
                        checkUserStatus(profile.userId);
                    });
                }
            })
            .catch((err) => {
                console.error('LIFF init failed', err);
            });
    }, []);

    const checkUserStatus = async (userId) => {
        const userData = await getUserGameData(userId);
        if (userData.error === "ACCOUNT_INACTIVE") {
            setIsInactive(true);
        } else if (userData.error === "NO_GROUP") {
            setNoGroup(true);
        } else {
            fetchData(userId);
        }
    };

    const fetchData = async (userId) => {
        setStatsLoading(true);
        try {
            const [lbData, rwData] = await Promise.all([
                getLeaderboardData(userId),
                getRewardsData(userId)
            ]);

            if (lbData.leaderboard) {
                setLeaderboard(lbData.leaderboard);
                setMyStats(lbData.myStats);
                if (lbData.group) {
                    setActiveGroup(lbData.group);
                }
            }
            if (rwData.rewards) {
                setRewards(rwData.rewards);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setStatsLoading(false);
        }
    };


    const handleClaim = async (reward) => {
        if (!reward.isUnlockable) {
            Swal.fire({
                icon: 'error',
                title: 'ยังไม่ผ่านเกณฑ์',
                text: `คุณต้องอยู่ในอันดับ ${reward.conditionText} เพื่อรับรางวัลนี้`,
                confirmButtonColor: '#10b981'
            });
            return;
        }

        const result = await Swal.fire({
            title: 'ยืนยันการรับรางวัล?',
            text: `คุณต้องการรับ "${reward.title}" ใช่หรือไม่? (เลือกได้เพียงครั้งเดียว)`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#d33'
        });

        if (result.isConfirmed) {
            setRewardLoading(true);
            const claimRes = await claimReward(lineUserId, reward.id);
            if (claimRes.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'สำเร็จ!',
                    text: 'คุณได้รับของรางวัลเรียบร้อยแล้ว',
                    confirmButtonColor: '#10b981'
                });
                fetchData(lineUserId); // Refresh data
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'ผิดพลาด',
                    text: claimRes.error || 'ไม่สามารถรับรางวัลได้',
                    confirmButtonColor: '#d33'
                });
            }
            setRewardLoading(false);
        }
    };

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

    if (statsLoading && !myStats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-emerald-50 text-emerald-600">
                <div className="animate-spin text-4xl mb-4">⏳</div>
                <p>กำลังโหลดข้อมูล...</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* Header / My Stats */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-6 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-lg"></div>

                <div className="relative z-10 flex flex-col items-center text-center">
                    {activeGroup && (
                        <div className="mb-4 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
                            <h3 className="font-bold text-lg leading-tight mb-1">{activeGroup.name}</h3>
                            <div className="text-xs text-emerald-100 font-medium">
                                📅 {new Date(activeGroup.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - {new Date(activeGroup.endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                            </div>
                        </div>
                    )}
                    <div className="w-20 h-20 rounded-full border-4 border-white/30 shadow-lg overflow-hidden mb-3">
                        {myStats?.profileImageUrl ? (
                            <img src={myStats.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-slate-200 flex items-center justify-center text-2xl">👤</div>
                        )}
                    </div>
                    <h1 className="text-xl font-bold mb-1">{myStats?.displayName || 'ผู้ใช้งาน'}</h1>

                    <div className="flex gap-4 mt-4 w-full justify-center">
                        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 flex-1 text-center border border-white/10">
                            <div className="text-xs opacity-80 mb-1">อันดับของคุณ</div>
                            <div className="text-2xl font-black">{myStats?.rank || '-'}</div>
                        </div>
                        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 flex-1 text-center border border-white/10">
                            <div className="text-xs opacity-80 mb-1">คะแนนสะสม</div>
                            <div className="text-2xl font-black">{myStats?.points?.toLocaleString() || 0}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex justify-center mt-6 mb-4 px-6">
                <div className="bg-white p-1 rounded-full shadow-md flex w-full max-w-sm">
                    <button
                        onClick={() => setActiveTab('leaderboard')}
                        className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'leaderboard'
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'text-slate-500 hover:text-emerald-500'
                            }`}
                    >
                        🏆 อันดับ
                    </button>
                    <button
                        onClick={() => setActiveTab('rewards')}
                        className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'rewards'
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'text-slate-500 hover:text-emerald-500'
                            }`}
                    >
                        🎁 ของรางวัล
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Leaderboard Tab */}
                {activeTab === 'leaderboard' && (
                    <div className="flex flex-col gap-3 pb-8">
                        {leaderboard.map((user, idx) => (
                            <div
                                key={user.id}
                                className={`flex items-center p-4 rounded-2xl shadow-sm border ${user.isMe
                                    ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-300 transform scale-[1.02]'
                                    : 'bg-white border-slate-100'
                                    }`}
                            >
                                <div className={`w-8 h-8 flex items-center justify-center font-bold text-lg mr-3 ${idx === 0 ? 'text-yellow-500 text-2xl drop-shadow-sm' :
                                    idx === 1 ? 'text-slate-400 text-xl' :
                                        idx === 2 ? 'text-orange-400 text-xl' :
                                            'text-slate-400 text-sm'
                                    }`}>
                                    {idx + 1}
                                </div>
                                <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden mr-3 shrink-0">
                                    {user.profileImageUrl ? (
                                        <img src={user.profileImageUrl} alt="user" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">USER</div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-slate-700 truncate">{user.displayName}</div>
                                </div>
                                <div className="font-mono font-bold text-emerald-600 text-sm">
                                    {user.points.toLocaleString()} pts
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Rewards Tab */}
                {activeTab === 'rewards' && (
                    <div className="flex flex-col gap-4 pb-8">
                        <div className="text-center text-sm text-slate-500 mb-2">
                            *เลือกรับได้เพียง 1 รางวัล ตามระดับคะแนนของคุณ
                        </div>
                        {rewards.map((reward) => (
                            <div
                                key={reward.id}
                                className={`bg-white rounded-2xl p-5 shadow-lg border relative overflow-hidden ${reward.isClaimed ? 'border-emerald-500 ring-2 ring-emerald-100' :
                                    !reward.isUnlockable ? 'opacity-70 grayscale-[0.5] border-slate-200' :
                                        'border-emerald-100'
                                    }`}
                            >
                                {reward.isClaimed && (
                                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                                        รับแล้ว
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl shrink-0 ${reward.title.includes('ทอง') ? 'bg-yellow-100 text-yellow-500' :
                                        reward.title.includes('เงิน') ? 'bg-slate-100 text-slate-500' :
                                            'bg-orange-100 text-orange-500'
                                        }`}>
                                        🏆
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg text-slate-800">{reward.title}</h3>
                                        <p className="text-xs text-slate-500 mb-1">{reward.description}</p>
                                        <div className="text-xs font-medium text-emerald-600 bg-emerald-50 inline-block px-2 py-0.5 rounded-md">
                                            {reward.conditionText}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleClaim(reward)}
                                    disabled={!reward.canClaim || rewardLoading}
                                    className={`w-full mt-4 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${reward.isClaimed ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
                                        !reward.isUnlockable ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
                                            reward.stock <= 0 ? 'bg-red-100 text-red-500 cursor-not-allowed' :
                                                'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:shadow-xl'
                                        }`}
                                >
                                    {reward.isClaimed ? 'คุณได้รับรางวัลนี้แล้ว' :
                                        !reward.isUnlockable ? 'ยังไม่ถึงเกณฑ์' :
                                            reward.stock <= 0 ? 'สินค้าหมด' :
                                                'เลือกรับรางวัลนี้'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

export default function LiffStatsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <StatsContent />
        </Suspense>
    );
}
