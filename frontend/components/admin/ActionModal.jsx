"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function ActionModal({ title, onSubmit, fields, isOpen, onClose }) {
  const [formData, setFormData] = useState({});

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-900 p-6 rounded-2xl w-full max-w-md shadow-xl"
      >
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">{title}</h3>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(formData);
          }}
          className="space-y-4"
        >
          {fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm mb-1">{field.label}</label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent focus:ring focus:ring-blue-500"
                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                required={field.required}
              />
            </div>
          ))}

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
