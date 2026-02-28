'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// 1. Khởi tạo Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// 2. Định nghĩa kiểu dữ liệu để sửa lỗi "never[]"
interface Person {
  handle: string;
  display_name: string;
}

export default function UpdateMemberPage() {
  const [loading, setLoading] = useState(false);
  // Khai báo kiểu dữ liệu cho mảng: <Person[]>
  const [peopleList, setPeopleList] = useState<Person[]>([]);
  
  const [formData, setFormData] = useState({
    display_name: '',
    surname: '',
    first_name: '',
    gender: 1,
    generation: 1,
    chi: 1,
    birth_year: '',
    father_handle: '',
    mother_handle: '',
  });

  // 3. Lấy dữ liệu từ Supabase
  const fetchPeople = async () => {
    const { data, error } = await supabase
      .from('people')
      .select('handle, display_name')
      .order('display_name');
    
    if (error) {
      console.error('Error fetching:', error.message);
      return;
    }
    // Ép kiểu dữ liệu trả về để TypeScript chấp nhận
    if (data) setPeopleList(data as Person[]);
  };

  useEffect(() => {
    fetchPeople();
  }, []);

  // 4. Xử lý Input (Thêm kiểu React.ChangeEvent)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'number' ? parseInt(value) || 0 : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const personHandle = `I${Date.now()}`;
      const { father_handle, mother_handle, ...personInfo } = formData;

      // Lưu người mới
      const { error: pError } = await supabase.from('people').insert([{ 
        ...personInfo, 
        handle: personHandle,
        gramps_id: personHandle 
      }]);
      if (pError) throw pError;

      // Xử lý quan hệ Family (nếu có chọn cha hoặc mẹ)
      if (father_handle || mother_handle) {
        let { data: family } = await supabase
          .from('families')
          .select('handle, children')
          .match({ father_handle: father_handle || null, mother_handle: mother_handle || null })
          .maybeSingle();

        let familyHandle;
        if (!family) {
          familyHandle = `F${Date.now()}`;
          await supabase.from('families').insert([{
            handle: familyHandle,
            father_handle: father_handle || null,
            mother_handle: mother_handle || null,
            children: [personHandle]
          }]);
        } else {
          familyHandle = family.handle;
          const updatedChildren = [...(family.children || []), personHandle];
          await supabase.from('families').update({ children: updatedChildren }).eq('handle', familyHandle);
        }

        await supabase.from('people').update({ parent_families: [familyHandle] }).eq('handle', personHandle);
      }

      alert('Thêm thành viên thành công!');
      setFormData(prev => ({ ...prev, display_name: '', first_name: '', birth_year: '' }));
      fetchPeople();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <h1 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Thêm Thành Viên Mới</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Tên đầy đủ</label>
            <input name="display_name" required value={formData.display_name} onChange={handleChange} className="w-full border p-2 rounded mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-600">Cha (Father)</label>
            <select name="father_handle" value={formData.father_handle} onChange={handleChange} className="w-full border p-2 rounded mt-1 bg-blue-50">
              <option value="">-- Không chọn --</option>
              {peopleList.map(p => <option key={p.handle} value={p.handle}>{p.display_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-pink-600">Mẹ (Mother)</label>
            <select name="mother_handle" value={formData.mother_handle} onChange={handleChange} className="w-full border p-2 rounded mt-1 bg-pink-50">
              <option value="">-- Không chọn --</option>
              {peopleList.map(p => <option key={p.handle} value={p.handle}>{p.display_name}</option>)}
            </select>
          </div>
        </div>
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-slate-800 text-white p-3 rounded-lg font-bold hover:bg-slate-900 disabled:bg-gray-400"
        >
          {loading ? 'Đang lưu...' : 'LƯU DỮ LIỆU'}
        </button>
      </form>
    </div>
  );
}
