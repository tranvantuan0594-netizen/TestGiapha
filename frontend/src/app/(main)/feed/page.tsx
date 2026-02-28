'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// 1. Khởi tạo Client (Sử dụng ! để báo với TS rằng biến này chắc chắn tồn tại)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 2. Định nghĩa Interface để sửa lỗi Type 'never'
interface Person {
  handle: string;
  display_name: string;
}

export default function UpdateMemberPage() {
  const [loading, setLoading] = useState(false);
  
  // Sửa lỗi: Khai báo kiểu <Person[]> cho State
  const [peopleList, setPeopleList] = useState<Person[]>([]);
  
  const [formData, setFormData] = useState({
    display_name: '',
    surname: '',
    first_name: '',
    gender: 1,
    generation: 1,
    father_handle: '',
    mother_handle: '',
  });

  const fetchPeople = async () => {
    const { data, error } = await supabase
      .from('people')
      .select('handle, display_name')
      .order('display_name');
    
    if (error) {
      console.error(error.message);
      return;
    }

    // Ép kiểu 'as Person[]' để TypeScript chấp nhận dữ liệu
    if (data) setPeopleList(data as Person[]);
  };

  useEffect(() => {
    fetchPeople();
  }, []);

  // Sửa lỗi Type cho sự kiện Change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const personHandle = `I${Date.now()}`;
      
      // Chèn dữ liệu vào bảng people
      const { error: pError } = await supabase.from('people').insert([{
        ...formData,
        handle: personHandle,
        gramps_id: personHandle
      }]);

      if (pError) throw pError;

      alert('Thêm thành viên thành công!');
      setFormData(prev => ({ ...prev, display_name: '' })); // Reset form
      fetchPeople();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-8 bg-white shadow-lg rounded-xl mt-10 border border-gray-100">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Thêm Thành Viên Mới</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Tên hiển thị</label>
          <input 
            name="display_name" 
            required 
            value={formData.display_name} 
            onChange={handleChange} 
            className="w-full border p-2 rounded-md mt-1 focus:ring-2 focus:ring-blue-500 outline-none" 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-blue-600">Cha (Father)</label>
            <select 
              name="father_handle" 
              value={formData.father_handle} 
              onChange={handleChange} 
              className="w-full border p-2 rounded-md mt-1 bg-blue-50"
            >
              <option value="">-- Chọn Cha --</option>
              {peopleList.map((p) => (
                <option key={p.handle} value={p.handle}>{p.display_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-pink-600">Mẹ (Mother)</label>
            <select 
              name="mother_handle" 
              value={formData.mother_handle} 
              onChange={handleChange} 
              className="w-full border p-2 rounded-md mt-1 bg-pink-50"
            >
              <option value="">-- Chọn Mẹ --</option>
              {peopleList.map((p) => (
                <option key={p.handle} value={p.handle}>{p.display_name}</option>
              ))}
            </select>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded-md font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
        >
          {loading ? 'Đang xử lý...' : 'XÁC NHẬN LƯU'}
        </button>
      </form>
    </div>
  );
}
