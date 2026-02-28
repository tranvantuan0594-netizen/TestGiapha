'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// 1. Khởi tạo Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function QuickAddPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 2. State đơn giản hóa - Nhập tay toàn bộ
  const [formData, setFormData] = useState({
    display_name: '',
    surname: '',
    first_name: '',
    gender: 1,
    generation: 1,
    chi: 1,
    birth_year: '',
    father_handle: '', // Nhập tay ID (VD: I17102023)
    mother_handle: '', // Nhập tay ID
    hometown: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Tạo ID duy nhất cho người mới
      const personHandle = `I${Date.now()}`;
      const { father_handle, mother_handle, ...personInfo } = formData;

      // Bước 1: Thêm vào bảng people
      const { error: pError } = await supabase.from('people').insert([{
        ...personInfo,
        handle: personHandle,
        gramps_id: personHandle
      }]);

      if (pError) throw pError;

      // Bước 2: Nếu có nhập ID Cha hoặc Mẹ, tự động tạo/cập nhật bảng families
      if (father_handle || mother_handle) {
        // Tìm xem cặp này đã có family chưa
        let { data: family } = await supabase
          .from('families')
          .select('handle, children')
          .match({ 
            father_handle: father_handle || null, 
            mother_handle: mother_handle || null 
          })
          .maybeSingle();

        let targetFamHandle;

        if (!family) {
          // Tạo gia đình mới
          targetFamHandle = `F${Date.now()}`;
          await supabase.from('families').insert([{
            handle: targetFamHandle,
            father_handle: father_handle || null,
            mother_handle: mother_handle || null,
            children: [personHandle]
          }]);
        } else {
          // Cập nhật con vào gia đình sẵn có
          targetFamHandle = family.handle;
          const newChildren = [...(family.children || []), personHandle];
          await supabase.from('families')
            .update({ children: newChildren })
            .eq('handle', targetFamHandle);
        }

        // Cập nhật ngược lại cho người con
        await supabase.from('people')
          .update({ parent_families: [targetFamHandle] })
          .eq('handle', personHandle);
      }

      setMessage('✅ Đã lưu thành công thành viên: ' + formData.display_name);
      // Reset form để nhập người tiếp theo
      setFormData(prev => ({ ...prev, display_name: '', first_name: '', birth_year: '' }));

    } catch (err: any) {
      setMessage('❌ Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto my-10 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
      <h1 className="text-xl font-bold mb-6 text-slate-800">Nhập Liệu Gia Phả (Thủ công)</h1>
      
      {message && (
        <div className={`p-3 mb-4 rounded ${message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Tên hiển thị *</label>
          <input name="display_name" required value={formData.display_name} onChange={handleChange} className="w-full border p-2 rounded mt-1 shadow-sm" placeholder="VD: Trần Văn A" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-blue-600">ID Cha (Nhập tay)</label>
            <input name="father_handle" value={formData.father_handle} onChange={handleChange} className="w-full border border-blue-100 p-2 rounded mt-1 bg-blue-50" placeholder="VD: I123456" />
          </div>
          <div>
            <label className="block text-sm font-medium text-pink-600">ID Mẹ (Nhập tay)</label>
            <input name="mother_handle" value={formData.mother_handle} onChange={handleChange} className="w-full border border-pink-100 p-2 rounded mt-1 bg-pink-50" placeholder="VD: I987654" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium">Giới tính (1:Nam, 2:Nữ)</label>
            <input type="number" name="gender" value={formData.gender} onChange={handleChange} className="w-full border p-2 rounded mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium">Đời thứ</label>
            <input type="number" name="generation" value={formData.generation} onChange={handleChange} className="w-full border p-2 rounded mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium">Năm sinh</label>
            <input name="birth_year" value={formData.birth_year} onChange={handleChange} className="w-full border p-2 rounded mt-1" />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-slate-900 text-white p-3 rounded-lg font-bold hover:bg-black transition-all disabled:bg-gray-400 mt-4"
        >
          {loading ? 'Đang xử lý...' : 'XÁC NHẬN LƯU'}
        </button>
      </form>
      
      <p className="mt-4 text-xs text-gray-400 italic">
        * Lưu ý: Khi nhập tay ID Cha/Mẹ, hãy đảm bảo ID đó đã tồn tại trong hệ thống.
      </p>
    </div>
  );
}
