"use client";
import { motion } from "framer-motion";

export default function StatsCard({ title, value, color }: { title:string; value:number; color:string }) {
  return (
    <motion.div
      className={`p-6 rounded-2xl shadow-lg bg-gradient-to-r ${color} text-white`}
      whileHover={{ scale: 1.05 }}
    >
      <h3 className="text-sm">{title}</h3>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </motion.div>
  );
}
