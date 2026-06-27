import { useState } from 'react';

export default function AssetForm() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    asset_type: '3d_model',
    file: null
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, file: e.target.files[0] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Поки що це лише заглушка. На Етапі 5 ми додамо сюди логіку 
    // завантаження в S3 та запису в БД.
    console.log('Дані форми готові до відправки:', formData);
    alert(`Форма зібрана! Файл: ${formData.file ? formData.file.name : 'не обрано'}`);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Додати новий AR Контент</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Назва */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Назва</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
            placeholder="Наприклад: Мустанг 1969"
          />
        </div>

        {/* Опис */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Опис</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows="3"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
            placeholder="Короткий опис моделі..."
          ></textarea>
        </div>

        {/* Тип контенту */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Тип контенту</label>
          <select
            name="asset_type"
            value={formData.asset_type}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="3d_model">3D Модель (.glb / .gltf)</option>
            <option value="audio">Аудіогід</option>
            <option value="marker">Маркер для трекінгу</option>
          </select>
        </div>

        {/* Вибір файлу */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Файл</label>
          <input
            type="file"
            name="file"
            onChange={handleFileChange}
            required
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {/* Кнопка відправки */}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-300 font-medium mt-4"
        >
          Завантажити контент
        </button>
      </form>
    </div>
  );
}