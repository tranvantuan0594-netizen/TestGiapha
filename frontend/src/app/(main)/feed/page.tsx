'use client'; // Bắt buộc phải có dòng này ở đầu file để dùng useState/useEffect

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// 1. Cấu hình Supabase - Nên dùng biến môi trường để bảo mật
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AddMemberPage() {
  const [loading, setLoading] = useState(false);
  const [peopleList, setPeopleList] = useState<any[]>([]);
  
  // State quản lý form dựa trên cấu trúc bảng 'people' bạn đã tạo
  const [formData, setFormData] = useState({
    display_name: '',
    surname: '',
    first_name: '',
    gender: 1, // 1: Nam, 2: Nữ
    generation: 1,
    chi: 1,
    birth_year: '',
    hometown: '',
    father_handle: '',
    mother_handle: '',
    is_living: true,
    is_patrilineal: true
  });

  // Load danh sách người để chọn Cha/Mẹ
  useEffect(() => {
    const fetchPeople = async () => {
      const { data } = await supabase
        .from('people')
        .select('handle, display_name')
        .order('display_name', { ascending: true });
      if (data) setPeopleList(data);
    };
    fetchPeople();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? parseInt(value) : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const personHandle = `I${Date.now()}`; // Tạo handle duy nhất kiểu Gramps
      const { father_handle, mother_handle, ...personInfo } = formData;

      // Bước 1: Chèn thành viên mới vào bảng 'people'
      const { data: newPerson, error: pError } = await supabase
        .from('people')
        .insert([{ 
          ...personInfo, 
          handle: personHandle,
          gramps_id: personHandle 
        }])
        .select()
        .single();

      if (pError) throw pError;

      // Bước 2: Xử lý logic bảng 'families' để nối cây tự động
      if (father_handle || mother_handle) {
        let { data: family } = await supabase
          .from('families')
          .select('handle, children')
          .match({ father_handle, mother_handle })
          .maybeSingle();

        let targetFamilyHandle;

        if (!family) {
          // Nếu cặp cha mẹ này chưa có trong bảng families, tạo mới
          targetFamilyHandle = `F${Date.now()}`;
          await supabase.from('families').insert([{
            handle: targetFamilyHandle,
            father_handle: father_handle || null,
            mother_handle: mother_handle || null,
            children: [personHandle]
          }]);
        } else {
          // Nếu đã có gia đình này, cập nhật thêm con vào mảng
          targetFamilyHandle = family.handle;
          const updatedChildren = [...(family.children || []), personHandle];
          await supabase.from('families')
            .update({ children: updatedChildren })
            .eq('handle', targetFamilyHandle);
        }

        // Bước 3: Cập nhật parent_families cho người con
        await supabase.from('people')
          .update({ parent_families: [targetFamilyHandle] })
          .eq('handle', personHandle);
      }

      alert('Đã thêm thành viên và tự động nối cây thành công!');
      // Reset form nhưng giữ lại Chi và Đời để nhập tiếp anh em
      setFormData(prev => ({ ...prev, display_name: '', first_name: '', birth_year: '' }));
      
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="bg-white shadow-xl rounded-2xl border border-gray-100 overflow-hidden">
        <div className="bg-emerald-600 p-6 text-white">
          <h1 className="text-2xl font-bold">Thêm Thành Viên Gia Phả</h1>
          <p className="text-emerald-100 text-sm">Dữ liệu sẽ được đồng bộ trực tiếp với Supabase</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Cột trái: Thông tin cá nhân */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-700 border-b pb-2">Thông tin cá nhân</h3>
            <div>
              <label className="text-sm font-medium">Họ và tên đệm</label>
              <input name="surname" value={formData.surname} onChange={handleChange} className="w-full border p-2 rounded-md" />
            </div>
            <div>
              <label className="text-sm font-medium">Tên chính *</label>
              <input name="first_name" required value={formData.first_name} onChange={handleChange} className="w-full border p-2 rounded-md" />
            </div>
            <div>
              <label className="text-sm font-medium">Tên hiển thị (Full Name) *</label>
              <input name="display_name" required value={formData.display_name} onChange={handleChange} className="w-full border p-2 rounded-md" placeholder="VD: Trần Văn An" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Giới tính</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full border p-2 rounded-md">
                  <option value={1}>Nam</option>
                  <option value={2}>Nữ</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Năm sinh</label>
                <input name="birth_year" type="number" value={formData.birth_year} onChange={handleChange} className="w-full border p-2 rounded-md" />
              </div>
            </div>
          </div>

          {/* Cột phải: Quan hệ & Hệ thống */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-700 border-b pb-2">Quan hệ cha mẹ</h3>
            <div>
              <label className="text-sm font-medium text-blue-700">Cha (Father)</label>
              <select name="father_handle" value={formData.father_handle} onChange={handleChange} className="w-full border border-blue-200 p-2 rounded-md bg-blue-50">
                <option value="">-- Không rõ / Là đời 1 --</option>
                {peopleList.map(p => <option key={p.handle} value={p.handle}>{p.display_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-pink-700">Mẹ (Mother)</label>
              <select name="mother_handle" value={formData.mother_handle} onChange={handleChange} className="w-full border border-pink-200 p-2 rounded-md bg-pink-50">
                <option value="">-- Không rõ --</option>
                {peopleList.map(p => <option key={p.handle} value={p.handle}>{p.display_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div>
                <label className="text-sm font-medium">Đời thứ</label>
                <input name="generation" type="number" value={formData.generation} onChange={handleChange} className="w-full border p-2 rounded-md" />
              </div>
              <div>
                <label className="text-sm font-medium">Chi</label>
                <input name="chi" type="number" value={formData.chi} onChange={handleChange} className="w-full border p-2 rounded-md" />
              </div>
            </div>
          </div>

          <div className="md:col-span-2 pt-6">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 shadow-lg"
            >
              {loading ? 'Đang xử lý...' : 'Lưu Thành Viên Mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
