import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Khởi tạo Supabase (Thay bằng biến env của bạn)
const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');

const QuickEntryPage = () => {
  const [loading, setLoading] = useState(false);
  const [peopleList, setPeopleList] = useState([]); // Danh sách để chọn Cha/Mẹ
  const [formData, setFormData] = useState({
    display_name: '', surname: '', first_name: '',
    gender: 1, generation: 1, chi: 1,
    birth_year: '', hometown: '',
    father_handle: '', mother_handle: ''
  });

  // 1. Load danh sách người hiện có để đổ vào Dropdown Cha/Mẹ
  useEffect(() => {
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    const { data } = await supabase.from('people').select('handle, display_name').order('display_name');
    if (data) setPeopleList(data);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // 2. Logic xử lý lưu dữ liệu (Quan trọng nhất)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const personHandle = `I${Date.now()}`; // Tạo ID Gramps giả lập
      const { father_handle, mother_handle, ...personInfo } = formData;

      // Bước A: Thêm người mới vào bảng 'people'
      const { data: newPerson, error: pError } = await supabase
        .from('people')
        .insert([{ 
          ...personInfo, 
          handle: personHandle,
          gramps_id: personHandle 
        }])
        .select().single();

      if (pError) throw pError;

      // Bước B: Xử lý quan hệ Family
      if (father_handle || mother_handle) {
        // Kiểm tra xem cặp Cha-Mẹ này đã có Family Record chưa
        let { data: family } = await supabase
          .from('families')
          .select('handle, children')
          .match({ father_handle, mother_handle })
          .maybeSingle();

        let targetFamilyHandle;

        if (!family) {
          // Nếu chưa có cặp này, tạo Family mới
          targetFamilyHandle = `F${Date.now()}`;
          await supabase.from('families').insert([{
            handle: targetFamilyHandle,
            father_handle,
            mother_handle,
            children: [personHandle]
          }]);
        } else {
          // Nếu đã có, chỉ cập nhật thêm con vào mảng children
          targetFamilyHandle = family.handle;
          const updatedChildren = [...(family.children || []), personHandle];
          await supabase.from('families').update({ children: updatedChildren }).eq('handle', targetFamilyHandle);
        }

        // Bước C: Cập nhật ngược lại parent_families cho người con
        await supabase.from('people')
          .update({ parent_families: [targetFamilyHandle] })
          .eq('handle', personHandle);
      }

      alert('Thêm thành công!');
      setFormData({ ...formData, display_name: '', first_name: '', birth_year: '' }); // Reset bớt field
      fetchPeople(); // Cập nhật lại list Cha/Mẹ
    } catch (err) {
      console.error(err);
      alert('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-emerald-700">🌳 Nhập Liệu Thành Viên Mới</h1>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        
        {/* CỘT 1: THÔNG TIN CÁ NHÂN */}
        <div className="space-y-4">
          <h2 className="font-semibold border-b pb-2 text-gray-600">Thông tin cơ bản</h2>
          <div>
            <label className="block text-sm font-medium">Họ và Tên đầy đủ *</label>
            <input name="display_name" required value={formData.display_name} onChange={handleChange} className="w-full p-2 border rounded mt-1" placeholder="VD: Trần Văn A" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium">Giới tính</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-2 border rounded mt-1">
                <option value={1}>Nam</option>
                <option value={2}>Nữ</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium">Đời thứ</label>
              <input type="number" name="generation" value={formData.generation} onChange={handleChange} className="w-full p-2 border rounded mt-1" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Năm sinh</label>
            <input type="number" name="birth_year" value={formData.birth_year} onChange={handleChange} className="w-full p-2 border rounded mt-1" placeholder="1990" />
          </div>
        </div>

        {/* CỘT 2: QUAN HỆ GIA ĐÌNH */}
        <div className="space-y-4">
          <h2 className="font-semibold border-b pb-2 text-gray-600">Quan hệ huyết thống</h2>
          <div>
            <label className="block text-sm font-medium text-blue-600">Cha (Father)</label>
            <select name="father_handle" value={formData.father_handle} onChange={handleChange} className="w-full p-2 border border-blue-200 rounded mt-1 bg-blue-50">
              <option value="">-- Chọn Cha --</option>
              {peopleList.map(p => <option key={p.handle} value={p.handle}>{p.display_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-pink-600">Mẹ (Mother)</label>
            <select name="mother_handle" value={formData.mother_handle} onChange={handleChange} className="w-full p-2 border border-pink-200 rounded mt-1 bg-pink-50">
              <option value="">-- Chọn Mẹ --</option>
              {peopleList.map(p => <option key={p.handle} value={p.handle}>{p.display_name}</option>)}
            </select>
          </div>
          <div className="pt-4 p-4 bg-yellow-50 rounded-lg text-xs text-yellow-800">
            <strong>Gợi ý:</strong> Nếu chưa có Cha/Mẹ trong danh sách, hãy thêm Cha/Mẹ trước, sau đó mới thêm con để hệ thống tự nối cây.
          </div>
        </div>

        <div className="md:col-span-2 mt-6">
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg disabled:bg-gray-400"
          >
            {loading ? 'Đang lưu...' : 'LƯU THÀNH VIÊN & CẬP NHẬT CÂY'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuickEntryPage;
