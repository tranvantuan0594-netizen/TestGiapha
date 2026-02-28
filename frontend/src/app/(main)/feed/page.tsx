'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// 1. Khởi tạo Supabase Client với các biến môi trường
// Đảm bảo bạn đã có file .env.local với 2 key này
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// 2. Định nghĩa Kiểu dữ liệu (Interfaces) để tránh lỗi "never[]"
interface Person {
  handle: string;
  display_name: string;
}

interface FormData {
  display_name: string;
  surname: string;
  first_name: string;
  gender: number;
  generation: number;
  chi: number;
  birth_year: string;
  hometown: string;
  father_handle: string;
  mother_handle: string;
}

export default function UpdateMemberPage() {
  const [loading, setLoading] = useState(false);
  const [peopleList, setPeopleList] = useState<Person[]>([]); // Khắc phục lỗi Type gán cho never[]
  
  const [formData, setFormData] = useState<FormData>({
    display_name: '',
    surname: '',
    first_name: '',
    gender: 1,
    generation: 1,
    chi: 1,
    birth_year: '',
    hometown: '',
    father_handle: '',
    mother_handle: '',
  });

  // 3. Lấy danh sách người có sẵn để đổ vào Dropdown
  const fetchPeople = async () => {
    const { data, error } = await supabase
      .from('people')
      .select('handle, display_name')
      .order('display_name', { ascending: true });
    
    if (error) {
      console.error('Lỗi lấy dữ liệu:', error.message);
      return;
    }
    if (data) setPeopleList(data as Person[]);
  };

  useEffect(() => {
    fetchPeople();
  }, []);

  // 4. Xử lý thay đổi input (Hỗ trợ TypeScript)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'number' ? parseInt(value) || 0 : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  // 5. Hàm lưu dữ liệu vào Database
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const personHandle = `I${Date.now()}`;
      const { father_handle, mother_handle, ...personInfo } = formData;

      // Bước A: Chèn người mới
      const { error: pError } = await supabase
        .from('people')
        .insert([{ 
          ...personInfo, 
          handle: personHandle,
          gramps_id: personHandle 
        }]);

      if (pError) throw pError;

      // Bước B: Xử lý logic bảng families (Nối cây)
      if (father_handle || mother_handle) {
        let { data: family } = await supabase
          .from('families')
          .select('handle, children')
          .match({ father_handle: father_handle || null, mother_handle: mother_handle || null })
          .maybeSingle();

        let targetFamilyHandle;

        if (!family) {
          targetFamilyHandle = `F${Date.now()}`;
          await supabase.from('families').insert([{
            handle: targetFamilyHandle,
            father_handle: father_handle || null,
            mother_handle: mother_handle || null,
            children: [personHandle]
          }]);
        } else {
          targetFamilyHandle = family.handle;
          const updatedChildren = [...(family.children || []), personHandle];
          await supabase.from('families')
            .update({ children: updatedChildren })
            .eq('handle', targetFamilyHandle);
        }

        // Cập nhật quan hệ cha mẹ cho người con
        await supabase.from('people')
          .update({ parent_families: [targetFamilyHandle] })
          .eq('handle', personHandle);
      }

      alert('Thành công! Cây gia phả đã được cập nhật.');
      setFormData(prev => ({ ...prev, display_name: '', first_name: '', birth_year: '' }));
      fetchPeople(); // Refresh danh sách
      
    } catch (err: any) {
      alert('Lỗi hệ thống: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-10">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-slate-800 p-6 text-white">
          <h1 className="text-xl font-bold">Quản trị viên: Thêm Thành Viên</h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-700 border-b pb-2">Cá nhân</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Tên hiển thị (Full Name)</label>
              <input name="display_name" required value={formData.display_name} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Giới tính</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm">
                  <option value={1}>Nam</option>
                  <option value={2}>Nữ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Năm sinh</label>
                <input name="birth_year" type="text" value={formData.birth_year} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-700 border-b pb-2">Gia đình</h2>
            
            <div>
              <label className="block text-sm font-medium text-blue-600 font-bold">Cha (Father)</label>
              <select name="father_handle" value={formData.father_handle} onChange={handleChange} className="mt-1 block w-full border border-blue-200 rounded-md p-2 bg-blue-50 shadow-sm">
                <option value="">-- Chọn Cha --</option>
                {peopleList.map(p => <option key={p.handle} value={p.handle}>{p.display_name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-pink-600 font-bold">Mẹ (Mother)</label>
              <select name="mother_handle" value={formData.mother_handle} onChange={handleChange} className="mt-1 block w-full border border-pink-200 rounded-md p-2 bg-pink-50 shadow-sm">
                <option value="">-- Chọn Mẹ --</option>
                {peopleList.map(p => <option key={p.handle} value={p.handle}>{p.display_name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Đời thứ</label>
                <input name="generation" type="number" value={formData.generation} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Chi</label>
                <input name="chi" type="number" value={formData.chi} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm" />
              </div>
            </div>
          </div>

          <div className="md:col-span-2 pt-6">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-bold disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Đang lưu dữ liệu...' : 'XÁC NHẬN THÊM THÀNH VIÊN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
