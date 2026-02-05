'use client';

import { useState, useEffect } from 'react';
import { getRewards, createReward, updateReward, deleteReward, getRewardHistory, toggleRewardStatus } from '@/app/actions/reward';
import Swal from 'sweetalert2';

export default function RewardsPage() {
    const [rewards, setRewards] = useState([]);
    const [history, setHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('rewards');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReward, setEditingReward] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        stock: '',
        order: ''
    });

    const fetchData = async () => {
        setLoading(true);
        const [rewardsResult, historyResult] = await Promise.all([
            getRewards(),
            getRewardHistory()
        ]);

        if (rewardsResult.rewards) {
            setRewards(rewardsResult.rewards);
        }
        if (historyResult.history) {
            setHistory(historyResult.history);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleToggleStatus = async (id, currentStatus) => {
        const result = await toggleRewardStatus(id, currentStatus);
        if (result.success) {
            // Update local state directly for immediate feedback
            setHistory(prev => prev.map(item =>
                item.id === id ? { ...item, isRedeemed: !currentStatus } : item
            ));
            Swal.fire({
                icon: 'success',
                title: 'อัปเดตสถานะสำเร็จ',
                showConfirmButton: false,
                timer: 1500
            });
        } else {
            Swal.fire('Error', 'ไม่สามารถอัปเดตสถานะได้', 'error');
        }
    };

    const handleOpenModal = (reward = null) => {
        if (reward) {
            setEditingReward(reward);
            setFormData({
                title: reward.title,
                description: reward.description || '',
                stock: reward.stock,
                order: reward.order,
                minRank: reward.minRank || 0,
                maxRank: reward.maxRank || ''
            });
        } else {
            setEditingReward(null);
            setFormData({
                title: '',
                description: '',
                stock: '',
                order: '',
                minRank: '',
                maxRank: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingReward(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.title || !formData.stock || !formData.order) {
            Swal.fire('Error', 'กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
            return;
        }

        const dataToSubmit = {
            ...formData,
            pointCost: 0,
            stock: parseInt(formData.stock),
            order: parseInt(formData.order),
            minRank: parseInt(formData.minRank) || 0,
            maxRank: formData.maxRank ? parseInt(formData.maxRank) : null
        };

        let result;
        if (editingReward) {
            result = await updateReward(editingReward.id, dataToSubmit);
        } else {
            result = await createReward(dataToSubmit);
        }

        if (result.success) {
            Swal.fire('Success', editingReward ? 'แก้ไขรางวัลสำเร็จ' : 'เพิ่มรางวัลสำเร็จ', 'success');
            handleCloseModal();
            fetchData();
        } else {
            Swal.fire('Error', 'เกิดข้อผิดพลาด', 'error');
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'ยืนยันการลบ?',
            text: "คุณต้องการลบรางวัลนี้ใช่หรือไม่?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            const deleteResult = await deleteReward(id);
            if (deleteResult.success) {
                Swal.fire('Deleted!', 'ลบรางวัลเรียบร้อยแล้ว', 'success');
                fetchData();
            } else {
                Swal.fire('Error', 'เกิดข้อผิดพลาดในการลบ', 'error');
            }
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                    จัดการของรางวัล
                </h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    เพิ่มของรางวัล
                </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
                <button
                    onClick={() => setActiveTab('rewards')}
                    className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === 'rewards'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                        }`}
                >
                    รายการของรางวัล
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === 'history'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                        }`}
                >
                    ประวัติการแลก
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : activeTab === 'rewards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rewards.map((reward) => (
                        <div key={reward.id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-100 relative group">
                            <div className="absolute top-2 right-2 bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                                ลำดับที่ {reward.order}
                            </div>
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-gray-800 mb-2">{reward.title}</h3>
                                <p className="text-gray-600 text-sm mb-4 min-h-[40px] line-clamp-2">
                                    {reward.description || 'ไม่มีรายละเอียด'}
                                </p>

                                <div className="mb-2">
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
                                        แต้มที่ต้องมี: {reward.minRank || 0} - {reward.maxRank || 'ไม่จำกัด'}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between mb-4">
                                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${reward.stock > 0 ? 'bg-purple-100 text-purple-800' : 'bg-red-100 text-red-800'}`}>
                                        คงเหลือ: {reward.stock}
                                    </span>
                                </div>

                                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                                    <button
                                        onClick={() => handleOpenModal(reward)}
                                        className="flex-1 px-3 py-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium"
                                    >
                                        แก้ไข
                                    </button>
                                    <button
                                        onClick={() => handleDelete(reward.id)}
                                        className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                                    >
                                        ลบ
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {rewards.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
                            ยังไม่มีของรางวัล
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">วันเวลา</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ผู้แลก</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ของรางวัล</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">สถานะ</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {history.map((record) => (
                                    <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(record.createdAt).toLocaleString('th-TH')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                                                    {record.user?.firstName?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {record.user?.firstName} {record.user?.lastName}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {record.user?.lineUserId?.substring(0, 8)}...
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-medium text-gray-900">{record.reward?.title}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${record.isRedeemed
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {record.isRedeemed ? 'รับของแล้ว' : 'รอรับของ'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <button
                                                onClick={() => handleToggleStatus(record.id, record.isRedeemed)}
                                                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${record.isRedeemed
                                                        ? 'border-gray-300 text-gray-600 hover:bg-gray-50'
                                                        : 'border-green-600 text-green-600 hover:bg-green-50'
                                                    }`}
                                            >
                                                {record.isRedeemed ? 'ยกเลิกสถานะรับแล้ว' : 'ยืนยันการรับของ'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {history.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
                                            ยังไม่มีประวัติการแลกรางวัล
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all">
                        <h2 className="text-2xl font-bold mb-6 text-gray-800">
                            {editingReward ? 'แก้ไขของรางวัล' : 'เพิ่มของรางวัล'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ลำดับ (Order)</label>
                                <input
                                    type="number"
                                    name="order"
                                    value={formData.order}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="ลำดับการแสดงผล"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อของรางวัล</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="ชื่อของรางวัล"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all h-24 resize-none"
                                    placeholder="รายละเอียดเพิ่มเติม..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">แต้มต่ำสุด (Min Points)</label>
                                    <input
                                        type="number"
                                        name="minRank"
                                        value={formData.minRank || ''}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        placeholder="0 (ไม่จำกัด)"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">แต้มขั้นต่ำที่มีสิทธิ์แลก</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">แต้มสูงสุด (Max Points)</label>
                                    <input
                                        type="number"
                                        name="maxRank"
                                        value={formData.maxRank || ''}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        placeholder="ว่าง = ไม่จำกัด"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">แต้มสูงสุดที่มีสิทธิ์แลก</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนคงเหลือ</label>
                                <input
                                    type="number"
                                    name="stock"
                                    value={formData.stock}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="0"
                                    required
                                />
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
                                >
                                    บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
